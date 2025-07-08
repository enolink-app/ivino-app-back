import db from "../models/firebase.js";

export async function createEvent(req, res) {
    const { name, organizerId, dateStart, dateEnd, wines, participants, status } = req.body;

    if (!name || !organizerId || !dateStart || !wines) {
        return res.status(400).json({ erro: "Campos obrigatórios ausentes" });
    }

    try {
        const novoEvento = {
            name,
            organizerId,
            dateStart,
            dateEnd,
            wines: wines || [],
            participants: participants || [],
            status,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const docRef = await db.collection("events").add(novoEvento);
        res.status(201).json({ id: docRef.id, ...novoEvento });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao criar evento", detalhes: error.message });
    }
}

export const listEvents = async (req, res) => {
    try {
        const snapshot = await db.collection("events").get();

        const events = [];
        snapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).json(events);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar eventos", detalhes: error.message });
    }
};

export const getEventById = async (req, res) => {
    const { id } = req.params;

    try {
        const eventDoc = await db.collection("events").doc(id).get();

        if (!eventDoc.exists) {
            return res.status(404).json({ error: "Evento não encontrado" });
        }

        return res.status(200).json({ id: eventDoc.id, ...eventDoc.data() });
    } catch (error) {
        console.error("Erro ao buscar evento por ID:", error);
        return res.status(500).json({ error: "Erro interno do servidor" });
    }
};

export const evaluateWine = async (req, res) => {
    const { id: eventId } = req.params;
    const { wineIndex, userId, aroma, sabor, cor, notes } = req.body;

    try {
        const eventRef = db.collection("events").doc(eventId);
        const eventDoc = await eventRef.get();

        if (!eventDoc.exists) {
            return res.status(404).json({ error: "Evento não encontrado" });
        }

        const eventData = eventDoc.data();
        const wines = eventData.wines || [];

        if (!wines[wineIndex]) {
            return res.status(400).json({ error: "Vinho não encontrado no evento" });
        }

        // Inicializa array de avaliações se não existir
        if (!wines[wineIndex].evaluations) {
            wines[wineIndex].evaluations = [];
        }

        // Impede que o mesmo usuário avalie duas vezes
        const alreadyEvaluated = wines[wineIndex].evaluations.some((ev) => ev.userId === userId);
        if (alreadyEvaluated) {
            return res.status(400).json({ error: "Você já avaliou esse vinho" });
        }

        wines[wineIndex].evaluations.push({
            userId,
            aroma,
            sabor,
            cor,
            notes,
            createdAt: new Date().toISOString(),
        });

        // Atualiza o evento com as novas avaliações
        await eventRef.update({ wines });

        return res.status(200).json({ message: "Avaliação registrada com sucesso", wines });
    } catch (error) {
        console.error("Erro ao avaliar vinho:", error);
        return res.status(500).json({ error: "Erro ao registrar avaliação" });
    }
};

export const editEvent = async (req, res) => {
    const uidToken = req.user.uid;

    const { name, organizerId, dateStart, dateEnd, wines, participants, status, updatedAt } = req.body;

    try {
        const userRef = db.collection("events").doc(uidToken);
        const doc = await userRef.get();

        if (!doc.exists) {
            return res.status(404).json({ erro: "Evento não encontrado" });
        }

        const updates = {};
        if (name) updates.name = name;
        if (organizerId) updates.organizerId = organizerId;
        if (dateStart) updates.dateStart = dateStart;
        if (dateEnd) updates.dateEnd = dateEnd;
        if (wines) updates.wines = wines;
        if (participants) updates.participants = participants;
        if (status) updates.status = status;

        updates.updatedAt = new Date();

        await userRef.update(updates);

        res.status(200).json({ mensagem: "Evento atualizado com sucesso", updates });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao atualizar evento", detalhes: error.message });
    }
};
