import { collection } from "../models/firebase";

export async function createDiaryEntry(req, res) {
    const uid = req.user.uid;
    const { wineId, rating, comment, images } = req.body;

    if (!wineId || !rating) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const entry = {
            wineId,
            rating,
            comment: comment || "",
            images: images || [],
            createdAt: new Date(),
        };

        const ref = await collection("users").doc(uid).collection("diaryEntries").add(entry);

        res.status(201).json({ id: ref.id, ...entry });
    } catch (error) {
        res.status(500).json({ error: "Error creating diary entry", details: error.message });
    }
}

export async function getDiaryEntries(req, res) {
    const uid = req.user.uid;

    try {
        const snapshot = await collection("users").doc(uid).collection("diaryEntries").orderBy("createdAt", "desc").get();

        const entries = [];
        snapshot.forEach((doc) => {
            entries.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).json(entries);
    } catch (error) {
        res.status(500).json({ error: "Error fetching diary", details: error.message });
    }
}
