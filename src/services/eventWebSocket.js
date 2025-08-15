import db from "../models/firebase.js";
import { notifyWineUnlocked } from "../controllers/notificationController.js";

export const setupEventListeners = () => {
    const eventsRef = db.collection("events").where("status", "==", "STARTED");

    const unsubscribe = eventsRef.onSnapshot(async (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === "modified") {
                const eventId = change.doc.id;
                const eventData = change.doc.data();

                const previousData = change.doc.metadata.hasPendingWrites ? (change.doc.metadata.fromCache ? null : change.doc.previousData) : null;

                if (previousData?.wines) {
                    for (let i = 0; i < eventData.wines.length; i++) {
                        const prevWine = previousData.wines[i];
                        const currentWine = eventData.wines[i];

                        if (prevWine && currentWine && prevWine.isLocked && !currentWine.isLocked) {
                            await notifyWineUnlocked(eventId, currentWine.name);
                        }
                    }
                }
            }
        });
    });

    return unsubscribe;
};
