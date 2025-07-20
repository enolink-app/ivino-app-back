import db from "../models/firebase.js";
import admin from "firebase-admin";

export const getEventRanking = async (req, res) => {
    const { eventId } = req.params;

    try {
        const ranksSnap = await db.collection("wineRankings").where("eventId", "==", eventId).get();

        if (ranksSnap.empty) {
            return res.status(200).json([]);
        }

        const wineStats = await Promise.all(
            ranksSnap.docs.map(async (doc) => {
                const data = doc.data();

                // Busca os detalhes do vinho
                const wineDoc = await db.collection("wines").doc(data.wineId).get();
                const wine = wineDoc.exists ? wineDoc.data() : {};

                // Calcula a média corretamente
                const average = data.totalEvaluations > 0 ? (data.totalRating / data.totalEvaluations).toFixed(2) : 0;

                return {
                    id: data.wineId,
                    name: wine.name || data.name || "Desconhecido",
                    region: wine.country || data.country || "",
                    image: wine.image || data.image || "",
                    rating: Number(average),
                    completed: data.completed || false,
                    evaluationsCount: data.totalEvaluations || 0,
                };
            })
        );

        // Ordena por rating (decrescente)
        wineStats.sort((a, b) => b.rating - a.rating);

        res.status(200).json(wineStats);
    } catch (error) {
        console.error("Erro detalhado ao buscar ranking:", error);
        res.status(500).json({
            error: "Erro ao buscar ranking",
            details: error.message,
        });
    }
};
