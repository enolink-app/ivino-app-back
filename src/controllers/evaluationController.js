import db from "../models/firebase.js";
import admin from "firebase-admin";

export async function createEvaluation(req, res) {
    const userId = req.user.uid;
    const { eventId, wineId, color, aroma, flavor, notes } = req.body;

    // Validação básica
    if (!eventId || !wineId || color == null || aroma == null || flavor == null) {
        return res.status(400).json({
            error: "Campos obrigatórios ausentes",
            required: ["eventId", "wineId", "color", "aroma", "flavor"],
        });
    }

    try {
        // 1. Verificar se avaliação já existe (evita duplicação)
        const existingEvalSnap = await db.collection("evaluations").where("userId", "==", userId).where("eventId", "==", eventId).where("wineId", "==", wineId).limit(1).get();

        if (!existingEvalSnap.empty) {
            return res.status(400).json({
                error: "Você já avaliou este vinho neste evento",
                evaluationId: existingEvalSnap.docs[0].id,
            });
        }

        // 2. Calcular média
        const average = (color + aroma + flavor) / 3;
        const evaluation = {
            userId,
            eventId,
            wineId,
            color,
            aroma,
            flavor,
            average,
            notes: notes || null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // 3. Obter informações do evento em uma única operação
        const eventRef = db.collection("events").doc(eventId);
        const eventSnap = await eventRef.get();

        if (!eventSnap.exists) {
            return res.status(404).json({ error: "Evento não encontrado" });
        }

        const eventData = eventSnap.data();
        const participants = eventData.participants || [];

        // 4. Usar transação para garantir consistência
        await db.runTransaction(async (transaction) => {
            // 4.1. Adicionar nova avaliação
            const evalRef = db.collection("evaluations").doc();
            transaction.set(evalRef, evaluation);

            // 4.2. Buscar avaliações existentes (apenas contagem)
            const evalQuery = db.collection("evaluations").where("eventId", "==", eventId).where("wineId", "==", wineId);

            const evalSnap = await transaction.get(evalQuery);
            const totalEvaluations = evalSnap.size + 1; // +1 para a nova avaliação

            // 4.3. Verificar se todos avaliaram
            const allEvaluated = participants.length <= totalEvaluations;

            // 4.4. Calcular nova média (otimizado)
            let newAverage;
            if (evalSnap.empty) {
                newAverage = average;
            } else {
                const currentSum = evalSnap.docs.reduce((sum, doc) => sum + doc.data().average, 0);
                newAverage = (currentSum + average) / totalEvaluations;
            }

            // 4.5. Atualizar ranking
            const rankRef = db.collection("wineRankings").doc(`${eventId}_${wineId}`);
            transaction.set(
                rankRef,
                {
                    eventId,
                    wineId,
                    average: newAverage,
                    totalEvaluations,
                    completed: allEvaluated,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
            );

            // 4.6. Atualizar lista de vinhos no evento (se necessário)
            if (eventData.wines) {
                const wineIndex = eventData.wines.findIndex((w) => w.id === wineId);
                if (wineIndex !== -1) {
                    const updatedWines = [...eventData.wines];
                    if (!updatedWines[wineIndex].evaluations) {
                        updatedWines[wineIndex].evaluations = [];
                    }
                    updatedWines[wineIndex].evaluations.push({
                        userId,
                        createdAt: evaluation.createdAt,
                    });

                    transaction.update(eventRef, {
                        wines: updatedWines,
                        updatedAt: evaluation.updatedAt,
                    });
                }
            }
        });

        return res.status(201).json({
            success: true,
            message: "Avaliação registrada com sucesso",
            average: evaluation.average.toFixed(2),
        });
    } catch (error) {
        console.error("Erro ao registrar avaliação:", error);
        return res.status(500).json({
            error: `Erro ao registrar avaliação: ${error}`,
            details: process.env.NODE_ENV === "development" ? error.message : null,
        });
    }
}

export async function getMyEvaluationsByEvent(req, res) {
    const userId = req.user.uid;
    const { eventId } = req.params;

    if (!eventId) {
        return res.status(400).json({ error: "ID do evento é obrigatório" });
    }

    try {
        // Consulta otimizada com projeção de campos
        const snapshot = await db
            .collection("evaluations")
            .where("userId", "==", userId)
            .where("eventId", "==", eventId)
            .select("wineId", "color", "aroma", "flavor", "average", "createdAt")
            .get();

        if (snapshot.empty) {
            return res.status(200).json([]);
        }

        // Obter informações básicas dos vinhos em uma única consulta
        const wineIds = snapshot.docs.map((doc) => doc.data().wineId);
        const winesSnap = await db.collection("wines").where(admin.firestore.FieldPath.documentId(), "in", wineIds).select("name", "country", "type").get();

        const winesMap = new Map(winesSnap.docs.map((doc) => [doc.id, doc.data()]));

        const evaluations = snapshot.docs.map((doc) => {
            const data = doc.data();
            const wine = winesMap.get(data.wineId) || {};
            return {
                id: doc.id,
                wineId: data.wineId,
                wineName: wine.name || "Desconhecido",
                wineRegion: wine.country || "",
                wineType: wine.type || "",
                color: data.color,
                aroma: data.aroma,
                flavor: data.flavor,
                average: data.average,
                createdAt: data.createdAt?.toDate() || null,
            };
        });

        return res.status(200).json(evaluations);
    } catch (error) {
        console.error("Erro ao buscar avaliações:", error);
        return res.status(500).json({
            error: "Erro ao buscar avaliações",
            details: process.env.NODE_ENV === "development" ? error.message : null,
        });
    }
}

// Nova função otimizada para buscar avaliações de um vinho específico
export async function getWineEvaluations(req, res) {
    const { eventId, wineId } = req.params;
    const userId = req.user.uid;

    if (!eventId || !wineId) {
        return res.status(400).json({ error: "IDs de evento e vinho são obrigatórios" });
    }

    try {
        // Verificar se o usuário é participante do evento
        const eventSnap = await db.collection("events").doc(eventId).get();
        if (!eventSnap.exists) {
            return res.status(404).json({ error: "Evento não encontrado" });
        }

        const eventData = eventSnap.data();
        const isParticipant = eventData.participants?.some((p) => p.id === userId) || false;

        if (!isParticipant) {
            return res.status(403).json({ error: "Acesso não autorizado" });
        }

        // Buscar avaliações com paginação
        const limit = parseInt(req.query.limit) || 10;
        const snapshot = await db.collection("evaluations").where("eventId", "==", eventId).where("wineId", "==", wineId).orderBy("createdAt", "desc").limit(limit).get();

        const evaluations = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                userId: data.userId,
                color: data.color,
                aroma: data.aroma,
                flavor: data.flavor,
                average: data.average,
                createdAt: data.createdAt?.toDate() || null,
            };
        });

        return res.status(200).json({
            evaluations,
            total: snapshot.size,
            wine: {
                id: wineId,
                name: eventData.wines?.find((w) => w.id === wineId)?.name || "Desconhecido",
            },
        });
    } catch (error) {
        console.error("Erro ao buscar avaliações do vinho:", error);
        return res.status(500).json({
            error: "Erro ao buscar avaliações",
            details: process.env.NODE_ENV === "development" ? error.message : null,
        });
    }
}
