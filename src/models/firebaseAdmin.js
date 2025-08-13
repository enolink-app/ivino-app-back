const admin = require("firebase-admin");
const serviceAccount = require("../path/to/serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://your-project.firebaseio.com",
});

const db = admin.firestore();
const messaging = admin.messaging();

module.exports = { admin, db, messaging };
