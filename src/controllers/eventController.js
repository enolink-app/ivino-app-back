import db from "../models/firebase.js";
import generateInviteCode from "../functions/generateInviteCode.js";
import admin from "firebase-admin";
export async function createEvent(req, res) {
    const { name, organizerId, dateStart, dateEnd, wines, participants, status } = req.body;

    if (!name || !organizerId || !dateStart || !wines) {
        return res.status(400).json({ erro: "Campos obrigatórios ausentes" });
    }

    try {
        const inviteCode = generateInviteCode();

        const novoEvento = {
            name,
            organizerId,
            dateStart,
            dateEnd,
            wines: wines || [],
            participants: participants || [],
            status,
            inviteCode,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const docRef = await db.collection("events").add(novoEvento);
        res.status(201).json({ id: docRef.id, ...novoEvento });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao criar evento", detalhes: error.message });
    }
}

export const listEvents = async (req, res) => {
    try {
        const snapshot = await db.collection("events").orderBy("createdAt", "desc").limit(20).get();

        const events = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(events);
    } catch (error) {
        res.status(500).json({ error: `Erro ao buscar eventos: ${error}` });
    }
};

export const getEventByUser = async (req, res) => {
    const { id } = req.params;
    const uid = req.user.uid;

    try {
        const snapshot = await db.collection("events").where("organizerId", "==", uid).get();

        const events = [];
        snapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).json(events);
    } catch (error) {
        console.error("Erro ao buscar evento por ID:", error);
        return res.status(500).json({ error: `Erro interno do servidor: ${error}` });
    }
};

export const getEventById = async (req, res) => {
    const { id } = req.params;

    try {
        const doc = await db.collection("events").doc(id).get();

        if (!doc.exists) return res.status(404).json({ error: "Evento não encontrado" });

        res.status(200).json({ id: doc.id, ...doc.data() });
    } catch (error) {
        res.status(500).json({ error: `Erro ao buscar evento: ${error}` });
    }
};

export const evaluateWine = async (req, res) => {
    const { id: eventId } = req.params;
    const { wineId, wineIndex, userId, aroma, color, flavor, notes } = req.body;

    // Validação reforçada
    if (!eventId || !wineId || wineIndex === undefined || !userId) {
        return res.status(400).json({
            error: "Dados incompletos para avaliação",
            details: "Faltam campos obrigatórios (eventId, wineId, wineIndex ou userId)",
        });
    }

    // Validação dos ratings
    const ratings = { aroma, color, flavor };
    for (const [key, value] of Object.entries(ratings)) {
        if (isNaN(value) || value < 1 || value > 5) {
            return res.status(400).json({
                error: "Avaliação inválida",
                details: `${key} deve ser entre 1 e 5`,
            });
        }
    }

    try {
        const eventRef = db.collection("events").doc(eventId);
        const eventDoc = await eventRef.get();

        if (!eventDoc.exists) {
            return res.status(404).json({
                error: "Evento não encontrado",
                details: `Evento com ID ${eventId} não existe`,
            });
        }

        const eventData = eventDoc.data();
        const wines = [...(eventData.wines || [])];

        // Verifica se o índice do vinho é válido
        if (wineIndex < 0 || wineIndex >= wines.length) {
            return res.status(400).json({
                error: "Índice do vinho inválido",
                details: `Índice ${wineIndex} fora do intervalo`,
            });
        }

        // Cria a nova avaliação
        const newEvaluation = {
            wineId: String(wineId),
            userId: String(userId),
            aroma: Math.min(5, Math.max(1, Number(aroma))), // Garante entre 1-5
            color: Math.min(5, Math.max(1, Number(color))), // Garante entre 1-5
            flavor: Math.min(5, Math.max(1, Number(flavor))), // Garante entre 1-5
            notes: String(notes || ""),
            createdAt: new Date().toISOString(),
        };

        // Verifica se já existe avaliação deste usuário
        const wineEvaluations = wines[wineIndex].evaluations || [];
        const userEvaluationIndex = wineEvaluations.findIndex((ev) => ev.userId === userId);

        if (userEvaluationIndex >= 0) {
            // Atualiza avaliação existente
            wineEvaluations[userEvaluationIndex] = newEvaluation;
        } else {
            // Adiciona nova avaliação
            wineEvaluations.push(newEvaluation);
        }

        // Atualiza o array de avaliações
        wines[wineIndex].evaluations = wineEvaluations;

        // Calcula a média da avaliação
        const rating = (newEvaluation.aroma + newEvaluation.color + newEvaluation.flavor) / 3;

        // Atualiza o evento
        await eventRef.update({
            wines,
            lastUpdated: new Date().toISOString(),
        });

        // Atualiza os dados do vinho
        const wineRef = db.collection("wines").doc(wineId);
        await wineRef.set(
            {
                name: wines[wineIndex].name,
                country: wines[wineIndex].country,
                image: wines[wineIndex].image,
                lastEvaluation: new Date().toISOString(),
            },
            { merge: true }
        );

        // Atualiza o ranking
        const rankingRef = db.collection("wineRankings").doc(`${eventId}_${wineId}`);

        if (userEvaluationIndex >= 0) {
            // Se for atualização, ajusta os totais
            const oldEvaluation = wineEvaluations[userEvaluationIndex];
            const oldRating = (oldEvaluation.aroma + oldEvaluation.color + oldEvaluation.flavor) / 3;

            await rankingRef.set(
                {
                    eventId,
                    wineId,
                    name: wines[wineIndex].name,
                    country: wines[wineIndex].country,
                    image: wines[wineIndex].image,
                    totalRating: admin.firestore.FieldValue.increment(rating - oldRating),
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
            );
        } else {
            // Se for nova avaliação
            await rankingRef.set(
                {
                    eventId,
                    wineId,
                    name: wines[wineIndex].name,
                    country: wines[wineIndex].country,
                    image: wines[wineIndex].image,
                    totalEvaluations: admin.firestore.FieldValue.increment(1),
                    totalRating: admin.firestore.FieldValue.increment(rating),
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
            );
        }

        return res.status(200).json({
            success: true,
            message: "Avaliação registrada com sucesso",
            wineId,
            evaluation: newEvaluation,
            rating: parseFloat(rating.toFixed(2)),
        });
    } catch (error) {
        console.error("Erro detalhado ao avaliar vinho:", error);
        return res.status(500).json({
            error: "Erro ao registrar avaliação",
            details: error.message,
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        });
    }
};

export const editEvent = async (req, res) => {
    const uidToken = req.user.uid;

    const { name, organizerId, dateStart, dateEnd, wines, participants, status, updatedAt } = req.body;

    try {
        const userRef = db.collection("events").doc(uidToken);
        const doc = await userRef.get();

        if (!doc.exists) {
            return res.status(404).json({ erro: "Evento não encontrado" });
        }

        const updates = {};
        if (name) updates.name = name;
        if (organizerId) updates.organizerId = organizerId;
        if (dateStart) updates.dateStart = dateStart;
        if (dateEnd) updates.dateEnd = dateEnd;
        if (wines) updates.wines = wines;
        if (participants) updates.participants = participants;
        if (status) updates.status = status;

        updates.updatedAt = new Date();

        await userRef.update(updates);

        res.status(200).json({ mensagem: "Evento atualizado com sucesso", updates });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao atualizar evento", details: error.message });
    }
};

export const joinEvent = async (req, res) => {
    const { inviteCode } = req.params;
    const { userId, userName } = req.body;

    try {
        const snapshot = await db.collection("events").where("inviteCode", "==", inviteCode).limit(1).get();

        if (snapshot.empty) {
            return res.status(404).json({ error: "Evento não encontrado ou código inválido" });
        }

        const eventDoc = snapshot.docs[0];
        const eventData = eventDoc.data();

        const isParticipant = eventData.participants.some((p) => p.id === userId);
        if (isParticipant) {
            return res.status(200).json({
                message: "Você já está participando deste evento",
                eventId: eventDoc.id,
            });
        }

        const newParticipant = {
            id: userId,
            name: userName,
            joinedAt: new Date(),
            isGuest: false,
        };

        await eventDoc.ref.update({
            participants: [...eventData.participants, newParticipant],
            updatedAt: new Date(),
        });

        res.status(200).json({
            message: "Participante adicionado com sucesso",
            eventId: eventDoc.id,
        });
    } catch (error) {
        console.error("Erro ao entrar no evento:", error);
        res.status(500).json({
            error: "Erro ao entrar no evento",
            details: error.message,
        });
    }
};

export const leaveEvent = async (req, res) => {
    const { eventId, userId } = req.params;

    try {
        const eventRef = db.collection("events").doc(eventId);
        const eventDoc = await eventRef.get();

        if (!eventDoc.exists) {
            return res.status(404).json({ error: "Evento não encontrado" });
        }

        const eventData = eventDoc.data();
        const updatedParticipants = eventData.participants.filter((p) => p.id !== userId);

        await eventRef.update({
            participants: updatedParticipants,
            updatedAt: new Date(),
        });

        res.status(200).json({ message: "Você saiu do evento com sucesso" });
    } catch (error) {
        console.error("Erro ao sair do evento:", error);
        res.status(500).json({
            error: "Erro ao sair do evento",
            details: error.message,
        });
    }
};

export const generateNewInviteCode = async (req, res) => {
    const { eventId } = req.params;
    const { userId } = req.body;

    try {
        const eventRef = db.collection("events").doc(eventId);
        const eventDoc = await eventRef.get();

        if (!eventDoc.exists) {
            return res.status(404).json({ error: "Evento não encontrado" });
        }

        const eventData = eventDoc.data();

        if (eventData.organizerId !== userId) {
            return res.status(403).json({ error: "Apenas o organizador pode gerar novo código" });
        }

        const newInviteCode = generateInviteCode();

        await eventRef.update({
            inviteCode: newInviteCode,
            updatedAt: new Date(),
        });

        res.status(200).json({ newInviteCode });
    } catch (error) {
        console.error("Erro ao gerar novo código:", error);
        res.status(500).json({
            error: "Erro ao gerar o código do convite",
            details: error.message,
        });
    }
};

export const getTopWines = async (req, res) => {
    try {
        // 1. Busca todos os eventos finalizados (CLOSED ou COMPLETED)
        const eventsSnapshot = await db.collection("events").where("status", "in", ["CLOSED", "COMPLETED"]).get();

        if (eventsSnapshot.empty) {
            return res.status(200).json([]);
        }

        // 2. Agrega dados de wineRankings em vez de events
        const rankingsSnapshot = await db.collection("wineRankings").where("isFinal", "==", true).get();

        if (rankingsSnapshot.empty) {
            return res.status(200).json([]);
        }

        // 3. Processa os rankings
        const wineStats = rankingsSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: data.wineId,
                name: data.name,
                country: data.country,
                image: data.image,
                averageRating: data.finalAverage || 0,
                evaluationsCount: data.totalEvaluations || 0,
            };
        });

        // 4. Ordena e pega os top 10
        const topWines = wineStats
            .filter((wine) => wine.averageRating > 0)
            .sort((a, b) => b.averageRating - a.averageRating)
            .slice(0, 10);

        return res.status(200).json(topWines);
    } catch (error) {
        console.error("Erro ao buscar top vinhos:", error);
        return res.status(500).json({
            error: "Erro ao buscar ranking",
            details: error.message,
        });
    }
};
// eventController.js
export const closeEvent = async (req, res) => {
    const { id: eventId } = req.params;
    const { userId } = req.body; // ID do usuário que está tentando encerrar

    try {
        const eventRef = db.collection("events").doc(eventId);
        const eventDoc = await eventRef.get();

        if (!eventDoc.exists) {
            return res.status(404).json({ error: "Evento não encontrado" });
        }

        const eventData = eventDoc.data();

        // Verifica se o usuário é o organizador
        if (eventData.organizerId !== userId) {
            return res.status(403).json({ error: "Apenas o organizador pode encerrar o evento" });
        }

        // Verifica se o evento já está encerrado
        if (eventData.status === "CLOSED") {
            return res.status(400).json({ error: "O evento já está encerrado" });
        }

        // Atualiza o status do evento
        await eventRef.update({
            status: "CLOSED",
            closedAt: new Date().toISOString(),
        });

        // Opcional: Processar rankings finais
        await generateFinalRankings(eventId);

        return res.status(200).json({
            success: true,
            message: "Evento encerrado com sucesso",
            closedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Erro ao encerrar evento:", error);
        return res.status(500).json({
            error: `Erro ao encerrar evento: ${error}`,
        });
    }
};

// Função auxiliar para gerar rankings finais (opcional)
const generateFinalRankings = async (eventId) => {
    const rankingsRef = db.collection("wineRankings").where("eventId", "==", eventId);
    const snapshot = await rankingsRef.get();

    const batch = db.batch();
    await db
        .collection("wineRankings")
        .where("eventId", "==", eventId)
        .get()
        .then((snapshot) => {
            const batch = db.batch();
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.totalEvaluations > 0) {
                    batch.update(doc.ref, {
                        isFinal: true,
                        finalAverage: data.totalRating / data.totalEvaluations,
                    });
                }
            });
            return batch.commit();
        });

    await batch.commit();
};
