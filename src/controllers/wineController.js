import db from "../models/firebase.js";

export async function createWine(req, res) {
    const uid = req.user.uid;
    const { name, harvest, country, type, description, image, createdAt, updatedAt } = req.body;
    if (!name || !harvest || !country || !type) {
        return res.status(400).json({ erro: "Campos obrigatórios ausentes" });
    }

    try {
        const newWine = {
            name,
            harvest,
            country,
            type,

            description: description || "",
            image,
            createdBy: uid,
            createdAt,
            updatedAt,
        };

        const docRef = await db.collection("wines").add(newWine);
        res.status(201).json({ id: docRef.id, ...newWine });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao criar vinho", detalhes: error.message });
    }
}

export async function getUserWines(req, res) {
    const uid = req.user.uid;

    try {
        const snapshot = await db.collection("wines").where("createdBy", "==", uid).get();

        const wines = [];
        snapshot.forEach((doc) => {
            wines.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).json(wines);
    } catch (error) {
        res.status(500).json({ error: "Error fetching wines", details: error.message });
    }
}

export async function updateWine(req, res) {
    const uid = req.user.uid;
    const wineId = req.params.id;
    const { name, harvest, country, type, description, image, createdAt, updatedAt } = req.body;

    try {
        const wineRef = db.collection("wines").doc(wineId);
        const doc = await wineRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: "Wine not found" });
        }

        if (doc.data().createdBy !== uid) {
            return res.status(403).json({ error: "You are not allowed to edit this wine" });
        }

        const updates = {};
        if (name) updates.name = name;
        if (harvest) updates.harvest = harvest;
        if (country) updates.country = country;
        if (type) updates.type = type;
        if (description !== undefined) updates.description = description;

        await wineRef.update(updates);
        res.status(200).json({ message: "Vinho atualizado com sucesso!", updates });
    } catch (error) {
        res.status(500).json({ error: "Error updating wine", details: error.message });
    }
}

export async function getWineById(req, res) {
    const { id } = req.params;
    const userId = req.user.uid;

    try {
        const doc = await db.collection("wines").doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ message: "Vinho não encontrado." });
        }

        const wine = doc.data();

        if (wine.userId !== userId) {
            return res.status(403).json({ message: "Acesso negado a este vinho." });
        }

        return res.status(200).json({ id: doc.id, ...wine });
    } catch (error) {
        console.error("Erro ao buscar vinho por ID:", error);
        return res.status(500).json({ message: "Erro ao buscar vinho." });
    }
}
