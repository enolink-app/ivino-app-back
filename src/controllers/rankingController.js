import db from "../models/firebase.js";

export const getEventRanking = async (req, res) => {
    const { eventId } = req.params;

    const eventDoc = await db.collection("events").doc(eventId).get();
    if (!eventDoc.exists) return res.status(404).json({ error: "Evento não encontrado" });

    const { wines = [] } = eventDoc.data();

    const ranksSnap = await db.collection("wineRankings").where("eventId", "==", eventId).get();
    const ranks = Object.fromEntries(ranksSnap.docs.map((d) => [d.data().wineId, d.data()]));

    const wineStats = wines.map((wine, idx) => {
        const rank = ranks[wine.id] || { average: 0, totalEvaluations: 0, completed: false };
        return {
            id: wine.id,
            name: wine.name,
            region: wine.country,
            image: wine.image ?? "",
            rating: Number(rank.average.toFixed(2)),
            completed: rank.completed,
        };
    });

    wineStats.sort((a, b) => b.rating - a.rating);
    return res.status(200).json(wineStats);
};
