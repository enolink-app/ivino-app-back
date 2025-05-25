import db from "../models/firebase.js";
export async function createEvent(req, res) {
    const { name, organizerId, date, wines, participants } = req.body;

    if (!name || !organizerId || !date || !wines) {
        return res.status(400).json({ erro: "Campos obrigatórios ausentes" });
    }

    try {
        const novoEvento = {
            name,
            organizerId,
            date: new Date(date),
            wines,
            participants: participants || [],
            active: true,
            createdAt: new Date(),
        };

        const docRef = await db.collection("events").add(novoEvento);
        res.status(201).json({ id: docRef.id, ...novoEvento });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao criar evento", detalhes: error.message });
    }
}
