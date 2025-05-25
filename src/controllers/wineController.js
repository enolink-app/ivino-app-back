import db from "../models/firebase.js";

export async function createWine(req, res) {
    const { name, harvest, country, type, description } = req.body;

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
            createdAt: new Date(),
        };

        const docRef = await db.collection("wines").add(newWine);
        res.status(201).json({ id: docRef.id, ...newWine });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao criar vinho", detalhes: error.message });
    }
}
