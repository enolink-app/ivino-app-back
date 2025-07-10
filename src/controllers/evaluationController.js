import db from "../models/firebase.js";

export async function createEvaluation(req, res) {
    const userId = req.user.uid;
    const { eventId, wineId, color, aroma, flavor, notes } = req.body;

    if (!eventId || !wineId || !color || !aroma || !flavor) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    try {
        // 1. Salvar avaliação
        const average = (color + aroma + flavor) / 3;
        const evaluation = {
            userId,
            eventId,
            wineId,
            color,
            aroma,
            flavor,
            average,
            notes,
            createdAt: new Date(),
        };

        await db.collection("evaluations").add(evaluation);

        // 2. Buscar avaliações existentes desse vinho neste evento
        const evaluationsSnap = await db.collection("evaluations").where("eventId", "==", eventId).where("wineId", "==", wineId).get();

        const allEvaluations = evaluationsSnap.docs.map((doc) => doc.data());

        // 3. Buscar participantes do evento
        const eventDoc = await db.collection("events").doc(eventId).get();
        if (!eventDoc.exists) {
            return res.status(404).json({ error: "Evento não encontrado" });
        }

        const event = eventDoc.data();
        const participants = event.participants || [];

        // 4. Verificar se todos os participantes já avaliaram esse vinho
        const allEvaluated = participants.every((p) => allEvaluations.some((ev) => ev.userId === p.id));

        // 5. Calcular nova média
        const finalAverage = allEvaluations.reduce((acc, ev) => acc + ev.average, 0) / allEvaluations.length;

        // 6. Atualizar ou criar ranking do vinho neste evento
        await db.collection("wineRankings").doc(`${eventId}_${wineId}`).set({
            eventId,
            wineId,
            average: finalAverage,
            totalEvaluations: allEvaluations.length,
            completed: allEvaluated,
            updatedAt: new Date(),
        });

        return res.status(201).json({
            message: "Avaliação registrada com sucesso",
            completed: allEvaluated,
            average: finalAverage,
        });
    } catch (error) {
        console.error("Erro ao registrar avaliação:", error);
        res.status(500).json({ error: "Erro ao registrar avaliação", details: error.message });
    }
}

export async function getMyEvaluationsByEvent(req, res) {
    const uid = req.user.uid;
    const eventId = req.params.eventId;

    try {
        const snapshot = await db.collection("evaluations").where("userId", "==", uid).where("eventId", "==", eventId).get();

        const evaluations = [];
        snapshot.forEach((doc) => {
            evaluations.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).json(evaluations);
    } catch (error) {
        res.status(500).json({ error: "Error fetching evaluations", details: error.message });
    }
}
