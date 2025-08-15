import db from "../models/firebase.js";
import { notifyWineUnlocked } from "../controllers/notificationController.js";

export const setupEventListeners = () => {
    const eventsRef = db.collection("events").where("status", "==", "STARTED");

    const unsubscribe = eventsRef.onSnapshot(async (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === "modified") {
                const eventId = change.doc.id;
                const eventData = change.doc.data();

                // Obter os dados anteriores corretamente
                const previousData = change.type === "modified" ? snapshot.docChanges().find((c) => c.doc.id === eventId && c.type === "modified")?.doc.previousData : null;

                // Verificar mudanças nos vinhos
                if (previousData?.wines && eventData.wines) {
                    for (let i = 0; i < eventData.wines.length; i++) {
                        const prevWine = previousData.wines[i];
                        const currentWine = eventData.wines[i];

                        if (prevWine && currentWine && prevWine.isLocked && !currentWine.isLocked) {
                            try {
                                await notifyWineUnlocked(eventId, currentWine.name);
                            } catch (error) {
                                console.error(`Erro ao notificar desbloqueio do vinho ${currentWine.name}:`, error);
                            }
                        }
                    }
                }
            }
        });
    });

    return unsubscribe;
};
