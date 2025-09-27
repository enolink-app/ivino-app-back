import pkg from "firebase-admin";
const { auth, firestore } = pkg;

export async function register(req, res) {
    const { name, email, password, type, language, dateBirth, subscriptionPlan } = req.body;

    try {
        const userRecord = await auth().createUser({
            email,
            password: password,
            displayName: name,
        });

        await firestore()
            .collection("users")
            .doc(userRecord.uid)
            .set({
                name,
                email,
                password,
                type,
                language,
                dateBirth,
                subscriptionPlan: {
                    type: subscriptionPlan.type,
                    status: subscriptionPlan.status,
                    startedAt: subscriptionPlan.startedAt,
                    expiresAt: null,
                },
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
        res.status(200).json({ mensagem: "Link de redefinição enviado", link });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao enviar link", detalhes: error.message });
    }
};

export async function googleOAuthRedirect(req, res) {
    const { code, state, error } = req.query;

    console.log("📨 Recebendo callback do Google:", { code, state, error });

    try {
        if (error) {
            console.error("❌ Erro no OAuth do Google:", error);
            return res.redirect(`com.vivavinho.enolink://oauthredirect?error=${encodeURIComponent(error)}&state=${state || ""}`);
        }

        if (!code) {
            console.error("❌ Código de autorização não recebido");
            return res.redirect(`com.vivavinho.enolink://oauthredirect?error=missing_code&state=${state || ""}`);
        }
        const redirectUrl = `com.vivavinho.enolink://oauthredirect?code=${encodeURIComponent(code)}&state=${state || ""}`;

        console.log("🔀 Redirecionando para app:", redirectUrl);

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Redirecionando para o App...</title>
                <script>
                    window.location.href = '${redirectUrl}';
                    
                    setTimeout(function() {
                        document.getElementById('manual-link').style.display = 'block';
                    }, 2000);
                </script>
            </head>
            <body>
                <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
                    <h2>Redirecionando para o aplicativo Vivavinho...</h2>
                    <p>Se o redirecionamento automático não funcionar, clique no link abaixo:</p>
                    <a id="manual-link" href="${redirectUrl}" style="display: none; padding: 10px 20px; background: #7E22CE; color: white; text-decoration: none; border-radius: 5px;">
                        Abrir no App Vivavinho
                    </a>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error("💥 Erro no processamento do OAuth:", error);
        res.redirect(`com.vivavinho.enolink://oauthredirect?error=processing_error&message=${encodeURIComponent(error.message)}`);
    }
}

export async function exchangeGoogleCode(req, res) {
    const { code } = req.body;

    try {
        if (!code) {
            return res.status(400).json({ error: "Código é obrigatório" });
        }

        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                code: code,
                client_id: "27430021409-n25b5e2urcnv1m0sot5stg8m81muo386.apps.googleusercontent.com",
                client_secret: "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",
                redirect_uri: "https://ivino-api.com/oauth-redirect",
                grant_type: "authorization_code",
            }).toString(),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error("❌ Erro na troca de token:", tokenData);
            return res.status(400).json({
                error: "Falha na troca de token",
                details: tokenData,
            });
        }

        res.json({
            id_token: tokenData.id_token,
            access_token: tokenData.access_token,
            expires_in: tokenData.expires_in,
        });
    } catch (error) {
        console.error("💥 Erro no exchange:", error);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
}
