import db from "../models/firebase.js";

export const getEventRanking = async (req, res) => {
    const { eventId } = req.params;

    try {
        const ranksSnap = await db.collection("wineRankings").where("eventId", "==", eventId).get();

        if (ranksSnap.empty) {
            return res.status(200).json([]);
        }

        const wineIds = ranksSnap.docs.map((doc) => doc.data().wineId);

        const winesSnap = await db.collection("wines").where(admin.firestore.FieldPath.documentId(), "in", wineIds).get();

        const winesMap = new Map(winesSnap.docs.map((doc) => [doc.id, doc.data()]));

        const wineStats = ranksSnap.docs
            .map((doc) => {
                const data = doc.data();
                const wine = winesMap.get(data.wineId) || {};
                return {
                    id: data.wineId,
                    name: wine.name || "Desconhecido",
                    region: wine.country || "",
                    image: wine.image || "",
                    rating: Number(data.average.toFixed(2)),
                    completed: data.completed || false,
                };
            })
            .sort((a, b) => b.rating - a.rating);

        res.status(200).json(wineStats);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar ranking" });
    }
};
