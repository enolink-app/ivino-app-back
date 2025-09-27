import admin from "firebase-admin";
import db from "../models/firebase.js";

// Armazena token FCM do usuário
export const registerDeviceToken = async (req, res) => {
    const { userId, fcmToken } = req.body;

    try {
        await db.collection("users").doc(userId).set(
            {
                fcmToken,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
        );

        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Erro ao registrar token" });
    }
};

// Envia notificação para o organizador quando alguém entra no evento
export const notifyNewParticipant = async (eventId, participantName) => {
    try {
        const eventRef = db.collection("events").doc(eventId);
        const eventDoc = await eventRef.get();

        if (!eventDoc.exists) return;

        const event = eventDoc.data();
        const organizerId = event.organizerId;

        // Busca token FCM do organizador
        const userDoc = await db.collection("users").doc(organizerId).get();
        if (!userDoc.exists || !userDoc.data().fcmToken) return;

        const message = {
            token: userDoc.data().fcmToken,
            notification: {
                title: "Novo participante!",
                body: `${participantName} entrou no seu evento ${event.name}`,
            },
            data: {
                eventId,
                type: "NEW_PARTICIPANT",
                click_action: "FLUTTER_NOTIFICATION_CLICK",
            },
        };

        await admin.messaging().send(message);
    } catch (error) {
        console.error("Erro ao enviar notificação:", error);
    }
};

// Envia notificação para participantes quando vinho é liberado
export const notifyWineUnlocked = async (eventId, wineName) => {
    try {
        const eventRef = db.collection("events").doc(eventId);
        const eventDoc = await eventRef.get();

        if (!eventDoc.exists) return;

        const event = eventDoc.data();
        const participants = event.participants || [];

        // Busca tokens FCM de todos os participantes
        const tokens = [];
        for (const participant of participants) {
            const userDoc = await db.collection("users").doc(participant.id).get();
            if (userDoc.exists && userDoc.data().fcmToken) {
                tokens.push(userDoc.data().fcmToken);
            }
        }

        if (tokens.length === 0) return;

        const message = {
            tokens, // Envia para múltiplos dispositivos
            notification: {
                title: "Novo vinho liberado!",
                body: `O vinho ${wineName} está disponível para avaliação no evento ${event.name}`,
            },
            data: {
                eventId,
                type: "WINE_UNLOCKED",
                click_action: "FLUTTER_NOTIFICATION_CLICK",
            },
        };

        await admin.messaging().sendMulticast(message);
    } catch (error) {
        console.error("Erro ao enviar notificação:", error);
    }
};
