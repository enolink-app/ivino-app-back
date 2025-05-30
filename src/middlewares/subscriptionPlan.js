import db from "../models/firebase.js";

//EXEMPLO DE USO FURUTO: router.get("/premium-feature", verifyToken, checkSubscription("premium"), handler);
export const checkSubscription = (requiredPlan) => {
    return async (req, res, next) => {
        const uid = req.user.uid;
        const userDoc = await db.collection("users").doc(uid).get();

        const plan = userDoc.data()?.subscriptionPlan?.type;

        if (plan !== requiredPlan) {
            return res.status(403).json({ error: `This feature is only for ${requiredPlan} users.` });
        }

        next();
    };
};
