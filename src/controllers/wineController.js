import db from "../models/firebase.js";

export async function createWine(req, res) {
    const uid = req.user.uid;
    const { name, vintage, country, type, year, description, image, createdAt, updatedAt } = req.body;
    if (!name || !vintage || !country || !type || !year) {
        return res.status(400).json({ erro: "Campos obrigatórios ausentes" });
    }

    try {
        const newWine = {
            name,
            vintage,
            country,
            type,
            year,
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
    const { name, vintage, country, type, year, description, image, createdAt, updatedAt } = req.body;

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
        if (vintage) updates.vintage = vintage;
        if (year) updates.year = year;
        if (country) updates.country = country;
        if (type) updates.type = type;
        if (description !== undefined) updates.description = description;

        await wineRef.update(updates);
        res.status(200).json({ message: "Vinho atualizado com sucesso!", updates });
    } catch (error) {
        res.status(500).json({ error: "Error updating wine", details: error.message });
    }
}
