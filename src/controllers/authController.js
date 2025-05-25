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
            createdAt: new Date(),
            updatedAt: null,
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

export const sendPasswordRecover = async (req, res) => {
    const { email } = req.body;

    if (!email) return res.status(400).json({ erro: "E-mail é obrigatório" });

    try {
        const link = await auth().generatePasswordResetLink(email);
        // Você pode enviar o link por e-mail customizado ou deixar o Firebase cuidar
        res.status(200).json({ mensagem: "Link de redefinição enviado", link });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao enviar link", detalhes: error.message });
    }
};
