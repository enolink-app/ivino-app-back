import { collection } from "../models/firebase";

export async function createEvaluation(req, res) {
    const uid = req.user.uid;
    const { eventId, wineId, notes, comment } = req.body;

    if (!eventId || !wineId || !notes || !notes.visual || !notes.flavour || !notes.taste || !notes.general) {
        return res.status(400).json({ error: "Missing required fields or incomplete notes" });
    }

    try {
        const evaluation = {
            userId: uid,
            eventId,
            wineId,
            notes,
            comment: comment || "",
            createdAt: new Date(),
        };

        const ref = await collection("evaluations").add(evaluation);
        res.status(201).json({ id: ref.id, ...evaluation });
    } catch (error) {
        res.status(500).json({ error: "Error saving evaluation", details: error.message });
    }
}

export async function getMyEvaluationsByEvent(req, res) {
    const uid = req.user.uid;
    const eventId = req.params.eventId;

    try {
        const snapshot = await collection("evaluations").where("userId", "==", uid).where("eventId", "==", eventId).get();

        const evaluations = [];
        snapshot.forEach((doc) => {
            evaluations.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).json(evaluations);
    } catch (error) {
        res.status(500).json({ error: "Error fetching evaluations", details: error.message });
    }
}
