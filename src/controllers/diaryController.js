import db from "../models/firebase.js";

export const createDiaryEntry = async (req, res) => {
    const userId = req.user.uid;
    const { wineId, wineData, color, aroma, flavor, notes } = req.body;

    try {
        const diaryEntry = {
            userId,
            wineId,
            wineData,
            color: Number(color),
            aroma: Number(aroma),
            flavor: Number(flavor),
            notes: notes || "",
            average: (Number(color) + Number(aroma) + Number(flavor)) / 3,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const docRef = await db.collection("diaryEntries").add(diaryEntry);

        res.status(201).json({
            id: docRef.id,
            ...diaryEntry,
        });
    } catch (error) {
        res.status(500).json({ error: "Erro ao criar entrada no diário" });
    }
};

export const getUserDiaryEntries = async (req, res) => {
    const userId = req.user.uid;

    try {
        const snapshot = await db.collection("diaryEntries").where("userId", "==", userId).orderBy("createdAt", "desc").get();

        const entries = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        res.status(200).json(entries);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar entradas do diário" });
    }
};

export const getDiaryEntryById = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.uid;

    try {
        const doc = await db.collection("diaryEntries").doc(id).get();

        if (!doc.exists || doc.data().userId !== userId) {
            return res.status(404).json({ error: "Entrada não encontrada" });
        }

        res.status(200).json({
            id: doc.id,
            ...doc.data(),
        });
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar entrada" });
    }
};

export async function getDiaryEntries(req, res) {
    const uid = req.user.uid;

    try {
        const snapshot = await db.collection("users").doc(uid).collection("diaryEntries").orderBy("createdAt", "desc").get();

        const entries = [];
        snapshot.forEach((doc) => {
            entries.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).json(entries);
    } catch (error) {
        res.status(500).json({ error: "Error fetching diary", details: error.message });
    }
}
