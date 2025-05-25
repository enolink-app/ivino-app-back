import pkg from "firebase-admin";
const { auth, firestore } = pkg;

export async function register(req, res) {
    const { name, email, password, type, language, dateBirth } = req.body;

    try {
        const userRecord = await auth().createUser({
            email,
            password: password,
            displayName: name,
        });

        await firestore().collection("users").doc(userRecord.uid).set({
            name,
            email,
            password,
            type,
            language,
            dateBirth,
            criadoEm: new Date(),
        });

        res.status(201).json({ uid: userRecord.uid });
    } catch (error) {
        res.status(400).json({ erro: "Erro ao registrar", detalhes: error.message });
    }
}

export async function login(req, res) {
    const { idToken } = req.body;

    try {
        const decodedToken = await auth().verifyIdToken(idToken);
        res.status(200).json({ uid: decodedToken.uid });
    } catch (error) {
        res.status(401).json({ erro: "Token inválido", detalhes: error.message });
    }
}
