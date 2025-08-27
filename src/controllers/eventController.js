import db from "../models/firebase.js";
import generateInviteCode from "../functions/generateInviteCode.js";
import admin from "firebase-admin";
import { notifyNewParticipant, notifyWineUnlocked } from "./notificationController.js";
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
            wines: wines.map((wine) => ({
                ...wine,
                isLocked: true, // Todos os vinhos começam bloqueados exceto o primeiro
            })),
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
    console.log("1", id);
    try {
        console.log("2");
        const doc = await db.collection("events").doc(id).get();
        console.log("3");
        if (!doc.exists) return res.status(404).json({ error: "Evento não encontrado - Linha 70" });
        console.log("4");
        res.status(200).json({ id: doc.id, ...doc.data() });
        console.log("4");
    } catch (error) {
        res.status(500).json({ error: `Erro ao buscar evento: ${error}` });
    }
};

export const evaluateWine = async (req, res) => {
    const { id: eventId } = req.params;
    const { wineId, wineIndex, userId, aroma, color, flavor, notes } = req.body;

    if (!eventId || !wineId || wineIndex === undefined || !userId) {
        return res.status(400).json({
            error: "Dados incompletos para avaliação",
            details: "Faltam campos obrigatórios (eventId, wineId, wineIndex ou userId)",
        });
    }

    try {
        // Primeiro calculamos tudo fora da transação
        const newEvaluation = {
            wineId: String(wineId),
            userId: String(userId),
            aroma: Math.min(5, Math.max(1, Number(aroma))),
            color: Math.min(5, Math.max(1, Number(color))),
            flavor: Math.min(5, Math.max(1, Number(flavor))),
            notes: String(notes || ""),
            createdAt: new Date().toISOString(),
        };

        // CORREÇÃO: AQUI CALCULAMOS A SOMA TOTAL DAS NOTAS, NÃO A MÉDIA.
        const rating = newEvaluation.aroma + newEvaluation.color + newEvaluation.flavor;

        // Agora fazemos a transação corretamente
        await db.runTransaction(async (transaction) => {
            // 1. FAZER TODAS AS LEITURAS PRIMEIRO
            const eventRef = db.collection("events").doc(eventId);
            const eventDoc = await transaction.get(eventRef);

            const rankingRef = db.collection("wineRankings").doc(`${eventId}_${wineId}`);
            const rankingDoc = await transaction.get(rankingRef);

            if (!eventDoc.exists) {
                throw new Error(`Evento com ID ${eventId} não existe`);
            }

            const eventData = eventDoc.data();
            const wines = [...(eventData.wines || [])];

            if (wineIndex < 0 || wineIndex >= wines.length) {
                throw new Error(`Índice ${wineIndex} fora do intervalo`);
            }

            const wineEvaluations = wines[wineIndex].evaluations || [];
            const userEvaluationIndex = wineEvaluations.findIndex((ev) => ev.userId === userId);
            const isUpdate = userEvaluationIndex >= 0;

            // 2. AGORA FAZEMOS TODAS AS ESCRITAS
            // Atualiza avaliações no evento
            if (isUpdate) {
                wineEvaluations[userEvaluationIndex] = newEvaluation;
            } else {
                wineEvaluations.push(newEvaluation);
            }
            wines[wineIndex].evaluations = wineEvaluations;

            transaction.update(eventRef, {
                wines,
                lastUpdated: new Date().toISOString(),
            });

            // Atualiza documento do vinho
            const wineRef = db.collection("wines").doc(wineId);
            transaction.set(
                wineRef,
                {
                    name: wines[wineIndex].name,
                    country: wines[wineIndex].country,
                    image: wines[wineIndex].image,
                    lastEvaluation: new Date().toISOString(),
                },
                { merge: true }
            );

            // Atualiza ranking
            if (isUpdate) {
                if (rankingDoc.exists) {
                    const oldEvaluation = wineEvaluations[userEvaluationIndex];
                    // CORREÇÃO: O oldRating também deve ser a soma, não a média.
                    const oldRating = oldEvaluation.aroma + oldEvaluation.color + oldEvaluation.flavor;
                    const ratingDiff = rating - oldRating;

                    transaction.update(rankingRef, {
                        totalRating: admin.firestore.FieldValue.increment(ratingDiff),
                        lastUpdated: new Date().toISOString(),
                    });
                } else {
                    // Caso o ranking não exista, cria-o
                    transaction.set(rankingRef, {
                        eventId,
                        wineId,
                        name: wines[wineIndex].name,
                        country: wines[wineIndex].country,
                        image: wines[wineIndex].image,
                        totalRating: rating,
                        totalEvaluations: 1,
                        lastUpdated: new Date().toISOString(),
                    });
                }
            } else {
                if (rankingDoc.exists) {
                    transaction.update(rankingRef, {
                        totalRating: admin.firestore.FieldValue.increment(rating),
                        totalEvaluations: admin.firestore.FieldValue.increment(1),
                        lastUpdated: new Date().toISOString(),
                    });
                } else {
                    // Caso o ranking não exista, cria-o
                    transaction.set(rankingRef, {
                        eventId,
                        wineId,
                        name: wines[wineIndex].name,
                        country: wines[wineIndex].country,
                        image: wines[wineIndex].image,
                        totalRating: rating,
                        totalEvaluations: 1,
                        lastUpdated: new Date().toISOString(),
                    });
                }
            }
        });

        return res.status(200).json({
            success: true,
            message: "Avaliação registrada com sucesso",
            wineId,
            // AQUI VOCÊ PODE RETORNAR A NOTA DA AVALIAÇÃO INDIVIDUAL SE QUISER
            rating: parseFloat((rating / 3).toFixed(2)),
        });
    } catch (error) {
        console.error("Erro ao avaliar vinho:", error);
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
            return res.status(404).json({ erro: "Evento não encontrado - Linha 234" });
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
    const { eventId } = req.params;
    const { userId, userName } = req.body;

    // Validação do ID
    if (!eventId || typeof eventId !== "string" || eventId.trim() === "") {
        return res.status(400).json({
            error: "ID do evento inválido",
            details: "O código do evento deve ser uma string não vazia",
        });
    }

    try {
        // Correção: doc() já retorna uma referência direta ao documento
        const eventRef = db.collection("events").doc(eventId);
        const eventDoc = await eventRef.get();

        if (!eventDoc.exists) {
            return res.status(404).json({
                error: "Evento não encontrado",
                details: "Nenhum evento encontrado com o código fornecido",
            });
        }

        const eventData = eventDoc.data();

        // Verifica se o usuário já é participante
        const isParticipant = eventData.participants?.some((p) => p.id === userId) || false;
        if (isParticipant) {
            return res.status(200).json({
                message: "Você já é participante deste evento",
                eventId: eventDoc.id,
            });
        }

        const newParticipant = {
            id: userId,
            name: userName,
            joinedAt: new Date(),
            isGuest: false,
        };

        // Atualiza o documento
        await eventRef.update({
            participants: [...(eventData.participants || []), newParticipant],
            updatedAt: new Date(),
        });

        await notifyNewParticipant(eventDoc.id, userName);

        return res.status(200).json({
            message: "Participante adicionado com sucesso",
            eventId: eventDoc.id,
        });
    } catch (error) {
        console.error("Erro ao entrar no evento:", error);
        return res.status(500).json({
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
            return res.status(404).json({ error: "Evento não encontrado - Linha 311" });
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
            return res.status(404).json({ error: "Evento não encontrado - Linha 341" });
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
        const eventsSnapshot = await db.collection("events").where("status", "in", ["CLOSED", "COMPLETED"]).get();

        if (eventsSnapshot.empty) {
            return res.status(200).json([]); // Retorna array vazio se não houver eventos
        }
        const allWines = {};

        eventsSnapshot.forEach((eventDoc) => {
            const eventData = eventDoc.data();

            if (!eventData.wines || !Array.isArray(eventData.wines)) return;

            eventData.wines.forEach((wine) => {
                if (!wine.evaluations || wine.evaluations.length === 0) return;

                const totalEvaluations = wine.evaluations.length;

                const totalScore = wine.evaluations.reduce((sum, evalu) => {
                    return sum + (evalu.aroma + evalu.color + evalu.flavor) / 3;
                }, 0);

                const averageRating = totalScore / totalEvaluations;

                if (!allWines[wine.id]) {
                    allWines[wine.id] = {
                        wineId: wine.id,
                        name: wine.name || "Vinho Desconhecido",
                        country: wine.country || "País Desconhecido",
                        image: wine.image || null,
                        description: wine.description || "",
                        totalEvaluations: 0,
                        totalScore: 0,
                        eventsCount: 0,
                    };
                }

                allWines[wine.id].totalEvaluations += totalEvaluations;
                allWines[wine.id].totalScore += totalScore;
                allWines[wine.id].eventsCount += 1;
            });
        });

        // Converte para array e calcula médias finais
        const winesArray = Object.values(allWines)
            .map((wine) => ({
                ...wine,
                averageRating: wine.totalEvaluations > 0 ? wine.totalScore / wine.totalEvaluations : 0,
            }))
            .filter((wine) => wine.averageRating > 0); // Filtra vinhos com avaliação válida

        // Ordena e pega top 10
        const topWines = winesArray.sort((a, b) => b.averageRating - a.averageRating).slice(0, 10);

        return res.status(200).json(topWines);
    } catch (error) {
        console.error("Erro detalhado ao buscar top vinhos:", error);
        return res.status(500).json({
            error: "Erro ao buscar ranking",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
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
            return res.status(404).json({ error: "Evento não encontrado - Linha 455" });
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

export const unlockWine = async (eventId, wineIndex) => {
    try {
        const eventRef = db.collection("events").doc(eventId);
        const eventDoc = await eventRef.get();

        if (!eventDoc.exists) return false;

        const event = eventDoc.data();
        const wines = [...event.wines];

        if (wineIndex < 0 || wineIndex >= wines.length) return false;

        wines[wineIndex].isLocked = false;

        await eventRef.update({ wines });

        await notifyWineUnlocked(eventId, wines[wineIndex].name);

        return true;
    } catch (error) {
        console.error("Erro ao desbloquear vinho:", error);
        return false;
    }
};
