import pkg from "firebase-admin";
const { auth } = pkg;

const verifiToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(403).json({ erro: "Token ausente ou inválido" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = await auth().verifyIdToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ erro: "Token inválido", detalhes: error.message });
    }
};

export default verifiToken;
