import db from "../models/firebase.js";
import generateInviteCode from "../functions/generateInviteCode.js";
import admin from "firebase-admin";
import { notifyNewParticipant, notifyWineUnlocked } from "./notificationController.js";
export async function createEvent(req, res) {
    const { name, organizerId, dateStart, dateEnd, wines, participants, status, coverImage } = req.body;

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
            coverImage,
            wines: wines.map((wine) => ({
                ...wine,
                isLocked: true,
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
        const snapshot = await db
            .collection("events")
            .orderBy("createdAt", "desc")
            .limit(20)
            .select("name", "organizerId", "dateStart", "dateEnd", "status", "inviteCode", "createdAt", "coverImage") // ← APENAS CAMPOS NECESSÁRIOS
            .get();

        const events = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
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

        if (!doc.exists) {
            return res.status(404).json({ error: "Evento não encontrado" });
        }

        const eventData = doc.data();

        const lightweightEvent = {
            id: doc.id,
            name: eventData.name,
            organizerId: eventData.organizerId,
            dateStart: eventData.dateStart,
            dateEnd: eventData.dateEnd,
            status: eventData.status,
            inviteCode: eventData.inviteCode,
            participants: eventData.participants || [],
            wines:
                eventData.wines?.map((wine) => ({
                    id: wine.id,
                    name: wine.name,
                    country: wine.country,
                    image: wine.image,
                    isLocked: wine.isLocked,
                    type: wine.type || "",
                    grape: wine.grape || "",
                    harvest: wine.harvest || "",
                    description: wine.description || "",
                })) || [],
            coverImage: eventData.coverImage || "",
            createdAt: eventData.createdAt,
            updatedAt: eventData.updatedAt,
        };

        res.status(200).json(lightweightEvent);
    } catch (error) {
        console.error("Erro ao buscar evento:", error);
        res.status(500).json({ error: `Erro ao buscar evento: ${error.message}` });
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
        const newEvaluation = {
            wineId: String(wineId),
            userId: String(userId),
            aroma: Math.min(5, Math.max(0.5, parseFloat(Number(aroma).toFixed(1)))), // Permite meias estrelas (0.5 a 5)
            color: Math.min(5, Math.max(0.5, parseFloat(Number(color).toFixed(1)))),
            flavor: Math.min(5, Math.max(0.5, parseFloat(Number(flavor).toFixed(1)))),
            notes: String(notes || ""),
            createdAt: new Date().toISOString(),
        };

        const rating = parseFloat(((newEvaluation.aroma + newEvaluation.color + newEvaluation.flavor) / 3).toFixed(2));

        const finalRating = Math.min(5, rating);

        console.log("Avaliação calculada:", {
            aroma: newEvaluation.aroma,
            color: newEvaluation.color,
            flavor: newEvaluation.flavor,
            soma: newEvaluation.aroma + newEvaluation.color + newEvaluation.flavor,
            media: finalRating,
        });

        await db.runTransaction(async (transaction) => {
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

            if (isUpdate) {
                if (rankingDoc.exists) {
                    const rankingData = rankingDoc.data();
                    const oldEvaluation = wineEvaluations[userEvaluationIndex];

                    const oldRating = parseFloat(((oldEvaluation.aroma + oldEvaluation.color + oldEvaluation.flavor) / 3).toFixed(2));

                    const ratingDiff = finalRating - oldRating;

                    transaction.update(rankingRef, {
                        totalRating: admin.firestore.FieldValue.increment(ratingDiff),
                        lastUpdated: new Date().toISOString(),
                    });
                } else {
                    transaction.set(rankingRef, {
                        eventId,
                        wineId,
                        name: wines[wineIndex].name,
                        country: wines[wineIndex].country,
                        image: wines[wineIndex].image,
                        totalRating: finalRating,
                        totalEvaluations: 1,
                        lastUpdated: new Date().toISOString(),
                    });
                }
            } else {
                if (rankingDoc.exists) {
                    transaction.update(rankingRef, {
                        totalRating: admin.firestore.FieldValue.increment(finalRating),
                        totalEvaluations: admin.firestore.FieldValue.increment(1),
                        lastUpdated: new Date().toISOString(),
                    });
                } else {
                    transaction.set(rankingRef, {
                        eventId,
                        wineId,
                        name: wines[wineIndex].name,
                        country: wines[wineIndex].country,
                        image: wines[wineIndex].image,
                        totalRating: finalRating,
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
            rating: finalRating,
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

    if (!eventId || typeof eventId !== "string" || eventId.trim() === "") {
        return res.status(400).json({
            error: "ID do evento inválido",
            details: "O código do evento deve ser uma string não vazia",
        });
    }

    try {
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
        const rankingsSnapshot = await db.collection("wineRankings").where("totalEvaluations", ">", 0).get();

        if (rankingsSnapshot.empty) {
            return res.status(200).json([]);
        }

        const allWines = rankingsSnapshot.docs.map((doc) => {
            const data = doc.data();
            const averageRating = data.totalEvaluations > 0 ? data.totalRating / data.totalEvaluations : 0;

            return {
                wineId: data.wineId,
                name: data.name,
                country: data.country,
                image: data.image,
                averageRating: parseFloat(averageRating.toFixed(2)),
                totalEvaluations: data.totalEvaluations,
            };
        });

        const topWines = allWines.sort((a, b) => b.averageRating - a.averageRating).slice(0, 10);

        return res.status(200).json(topWines);
    } catch (error) {
        console.error("Erro ao buscar top vinhos:", error);
        return res.status(500).json({
            error: "Erro ao buscar ranking",
            details: error.message,
        });
    }
};

export const listEventsPaginated = async (req, res) => {
    const { lastDocId, limit = 10 } = req.query;

    try {
        let query = db.collection("events").select("name", "organizerId", "dateStart", "status", "createdAt").orderBy("createdAt", "desc").limit(parseInt(limit));

        if (lastDocId) {
            const lastDoc = await db.collection("events").doc(lastDocId).get();
            if (lastDoc.exists) {
                query = query.startAfter(lastDoc);
            }
        }

        const snapshot = await query.get();

        const events = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        res.status(200).json({
            events,
            hasMore: events.length === parseInt(limit),
            lastDocId: events.length > 0 ? events[events.length - 1].id : null,
        });
    } catch (error) {
        res.status(500).json({ error: `Erro ao buscar eventos: ${error}` });
    }
};

export const closeEvent = async (req, res) => {
    const { id: eventId } = req.params;
    const { userId } = req.body;

    try {
        const eventRef = db.collection("events").doc(eventId);
        const eventDoc = await eventRef.get();

        if (!eventDoc.exists) {
            return res.status(404).json({ error: "Evento não encontrado - Linha 455" });
        }

        const eventData = eventDoc.data();

        if (eventData.organizerId !== userId) {
            return res.status(403).json({ error: "Apenas o organizador pode encerrar o evento" });
        }

        if (eventData.status === "CLOSED") {
            return res.status(400).json({ error: "O evento já está encerrado" });
        }

        await eventRef.update({
            status: "CLOSED",
            closedAt: new Date().toISOString(),
        });

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
