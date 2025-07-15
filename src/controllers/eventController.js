import db from "../models/firebase.js";
import generateInviteCode from "../functions/generateInviteCode.js";

export async function createEvent(req, res) {
    const { name, organizerId, dateStart, dateEnd, wines, participants, status } = req.body;

    if (!name || !organizerId || !dateStart || !wines) {
        return res.status(400).json({ erro: "Campos obrigatórios ausentes" });
    }

    try {
        const inviteCode = generateInviteCode();

        const novoEvento = {
            name,
            organizerId,
            dateStart,
            dateEnd,
            wines: wines || [],
            participants: participants || [],
            status,
            inviteCode,
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
        const snapshot = await db.collection("events").orderBy("createdAt", "desc").limit(20).get();

        const events = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(events);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar eventos" });
    }
};

export const getEventByUser = async (req, res) => {
    const { id } = req.params;
    const uid = req.user.uid;

    try {
        const snapshot = await db.collection("events").where("createdBy", "==", uid).get();

        const events = [];
        snapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).json(events);
    } catch (error) {
        console.error("Erro ao buscar evento por ID:", error);
        return res.status(500).json({ error: "Erro interno do servidor" });
    }
};

export const getEventById = async (req, res) => {
    const { id } = req.params;

    try {
        const doc = await db.collection("events").doc(id).get();

        if (!doc.exists) return res.status(404).json({ error: "Evento não encontrado" });

        res.status(200).json({ id: doc.id, ...doc.data() });
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar evento" });
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
        return res.status(500).json({ error: `Erro ao registrar avaliação: ${error}` });
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

// Adicione estas funções ao seu controller
export const joinEvent = async (req, res) => {
    const { inviteCode } = req.params;
    const { userId, userName } = req.body;

    try {
        // Busca evento pelo código de convite
        const snapshot = await db.collection("events").where("inviteCode", "==", inviteCode).limit(1).get();

        if (snapshot.empty) {
            return res.status(404).json({ error: "Evento não encontrado ou código inválido" });
        }

        const eventDoc = snapshot.docs[0];
        const eventData = eventDoc.data();

        // Verifica se usuário já está no evento
        const isParticipant = eventData.participants.some((p) => p.id === userId);
        if (isParticipant) {
            return res.status(200).json({
                message: "Você já está participando deste evento",
                eventId: eventDoc.id,
            });
        }

        // Adiciona participante
        const newParticipant = {
            id: userId,
            name: userName,
            joinedAt: new Date(),
            isGuest: false,
        };

        await eventDoc.ref.update({
            participants: [...eventData.participants, newParticipant],
            updatedAt: new Date(),
        });

        res.status(200).json({
            message: "Participante adicionado com sucesso",
            eventId: eventDoc.id,
        });
    } catch (error) {
        console.error("Erro ao entrar no evento:", error);
        res.status(500).json({ error: "Erro ao entrar no evento" });
    }
};

export const leaveEvent = async (req, res) => {
    const { eventId, userId } = req.params;

    try {
        const eventRef = db.collection("events").doc(eventId);
        const eventDoc = await eventRef.get();

        if (!eventDoc.exists) {
            return res.status(404).json({ error: "Evento não encontrado" });
        }

        const eventData = eventDoc.data();
        const updatedParticipants = eventData.participants.filter((p) => p.id !== userId);

        await eventRef.update({
            participants: updatedParticipants,
            updatedAt: new Date(),
        });

        res.status(200).json({ message: "Você saiu do evento com sucesso" });
    } catch (error) {
        console.error("Erro ao sair do evento:", error);
        res.status(500).json({ error: "Erro ao sair do evento" });
    }
};

export const generateNewInviteCode = async (req, res) => {
    const { eventId } = req.params;
    const { userId } = req.body;

    try {
        const eventRef = db.collection("events").doc(eventId);
        const eventDoc = await eventRef.get();

        if (!eventDoc.exists) {
            return res.status(404).json({ error: "Evento não encontrado" });
        }

        const eventData = eventDoc.data();

        // Verifica se o usuário é o organizador
        if (eventData.organizerId !== userId) {
            return res.status(403).json({ error: "Apenas o organizador pode gerar novo código" });
        }

        const newInviteCode = generateInviteCode();

        await eventRef.update({
            inviteCode: newInviteCode,
            updatedAt: new Date(),
        });

        res.status(200).json({ newInviteCode });
    } catch (error) {
        console.error("Erro ao gerar novo código:", error);
        res.status(500).json({ error: "Erro ao gerar novo código de convite" });
    }
};
