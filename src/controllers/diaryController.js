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
        res.status(500).json({ error: `Erro ao criar entrada no diário: ${error}` });
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
        res.status(500).json({ error: `Erro ao buscar entradas do diário: ${error}` });
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

export const updateDiaryEntry = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.uid;
    const { color, aroma, flavor, notes, wineData, wineId } = req.body;

    try {
        const docRef = db.collection("diaryEntries").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: "Entrada não encontrada" });
        }

        const data = doc.data();
        if (data.userId !== userId) {
            return res.status(403).json({ error: "Não autorizado a editar esta entrada" });
        }

        const newColor = color !== undefined ? Number(color) : data.color;
        const newAroma = aroma !== undefined ? Number(aroma) : data.aroma;
        const newFlavor = flavor !== undefined ? Number(flavor) : data.flavor;
        const newNotes = notes !== undefined ? notes : data.notes;
        const newWineData = wineData !== undefined ? wineData : data.wineData;
        const newWineId = wineId !== undefined ? wineId : data.wineId;

        const updated = {
            ...data,
            color: newColor,
            aroma: newAroma,
            flavor: newFlavor,
            notes: newNotes,
            wineData: newWineData,
            wineId: newWineId,
            average: (newColor + newAroma + newFlavor) / 3,
            updatedAt: new Date().toISOString(),
        };

        await docRef.update(updated);

        const updatedDoc = await docRef.get();
        res.status(200).json({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
        console.error("Erro ao atualizar entrada do diário:", error);
        res.status(500).json({ error: `Erro ao atualizar entrada do diário: ${error.message || error}` });
    }
};
