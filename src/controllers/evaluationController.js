import db from "../models/firebase.js";

export async function createEvaluation(req, res) {
    const { eventId, wineId, userId, evaluation, comment } = req.body;

    if (!eventId || !wineId || !userId || !evaluation) {
        return res.status(400).json({ erro: "Campos obrigatórios ausentes" });
    }

    try {
        const newEvaluation = {
            eventId,
            wineId,
            userId,
            evaluation, // { visual: 1-5, aroma: 1-5, paladar: 1-5, geral: 1-5 } LEMBRAR QUE ADD
            comment: comment || "",
            createdAt: new Date(),
        };

        const docRef = await db.collection("evaluations").add(newEvaluation);
        res.status(201).json({ id: docRef.id, ...newEvaluation });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao criar avaliação", detalhes: error.message });
    }
}
