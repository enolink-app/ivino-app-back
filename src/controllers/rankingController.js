import db from "../models/firebase.js";

export const getEventRanking = async (req, res) => {
    try {
        const { eventId } = req.params;

        const eventDoc = await db.collection("events").doc(eventId).get();
        if (!eventDoc.exists) {
            return res.status(404).json({ error: "Evento não encontrado" });
        }

        const eventData = eventDoc.data();
        const wines = eventData.wines || [];

        const evalSnap = await db.collection("evaluations").where("eventId", "==", eventId).get();

        const evaluations = evalSnap.docs.map((doc) => doc.data());

        const wineStats = wines.map((wine, index) => {
            const wineEvals = evaluations.filter((e) => e.wineIndex === index);

            const total = wineEvals.length;
            const avg =
                total > 0
                    ? wineEvals.reduce((acc, cur) => {
                          return acc + (cur.aroma || 0) + (cur.cor || 0) + (cur.sabor || 0);
                      }, 0) /
                      (total * 3)
                    : 0;

            return {
                id: index,
                name: wine.name,
                region: wine.country,
                image: wine.image || "",
                rating: parseFloat(avg.toFixed(2)),
            };
        });

        wineStats.sort((a, b) => b.rating - a.rating);

        return res.status(200).json(wineStats);
    } catch (err) {
        console.error("Erro ao gerar ranking:", err);
        return res.status(500).json({ error: "Erro interno ao gerar ranking" });
    }
};
