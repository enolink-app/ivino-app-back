import admin from "firebase-admin";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
dotenv.config();

let serviceAccount;

try {
    const raw = fs.readFileSync(path.resolve("firebase-service-account.json"), "utf8");
    serviceAccount = JSON.parse(raw);
    console.log("✅ Credenciais do Firebase carregadas com sucesso.");
} catch (e) {
    console.error("❌ Erro ao ler/parsing firebase-service-account.json:", e.message);
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
export default db;
