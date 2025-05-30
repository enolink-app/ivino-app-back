import db from "../models/firebase.js";

export const createUser = async (req, res) => {
    const { name, email, type, subscriptionPlan } = req.body;

    if (!name || !email || !type) {
        return res.status(400).json({ erro: "Campos obrigatórios ausentes" });
    }

    try {
        const newUser = {
            name,
            email,
            type,
            language: "pt",
            subscriptionPlan: {
                type: subscriptionPlan.type,
                status: subscriptionPlan.status,
                startedAt: subscriptionPlan.startedAt,
                expiresAt: null,
            },
            createdAt: new Date(),
        };

        const docRef = await db.collection("users").add(newUser);

        res.status(201).json({ id: docRef.id, ...newUser });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao criar usuário", detalhes: error.message });
    }
};

export const listUsers = async (req, res) => {
    try {
        const snapshot = await db.collection("users").get();

        const users = [];
        snapshot.forEach((doc) => {
            users.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar usuários", detalhes: error.message });
    }
};

export const editUser = async (req, res) => {
    const uidToken = req.user.uid;
    console.log(req.user, "USER");
    const { name, language, type, image, email } = req.body;

    try {
        const userRef = db.collection("users").doc(uidToken);
        const doc = await userRef.get();

        if (!doc.exists) {
            return res.status(404).json({ erro: "Usuário não encontrado" });
        }

        const updates = {};
        if (name) updates.name = name;
        if (email) updates.email = email;
        if (language) updates.language = language;
        if (type) updates.type = type;
        if (image) updates.image = image;
        updates.updatedAt = new Date();

        await userRef.update(updates);

        res.status(200).json({ mensagem: "Usuário atualizado com sucesso", updates });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao atualizar usuário", detalhes: error.message });
    }
};
