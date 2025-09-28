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
    const { code, state, error, error_description } = req.query;

    console.log("📨 Recebendo callback do Google:", {
        code: code ? code.substring(0, 20) + "..." : null,
        state,
        error,
    });

    try {
        if (error) {
            console.error("❌ Erro no OAuth do Google:", error, error_description);
            const redirectUrl = `com.vivavinho.enolink://oauthredirect?error=${encodeURIComponent(error)}&state=${state || ""}`;
            return res.redirect(redirectUrl);
        }

        if (!code) {
            console.error("❌ Código de autorização não recebido");
            const redirectUrl = `com.vivavinho.enolink://oauthredirect?error=missing_code&state=${state || ""}`;
            return res.redirect(redirectUrl);
        }

        const redirectUrl = `com.vivavinho.enolink://oauthredirect?code=${encodeURIComponent(code)}&state=${state || ""}`;

        console.log("🔀 Redirecionando para app:", redirectUrl);

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Redirecionando para Vivavinho...</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background: linear-gradient(135deg, #7E22CE 0%, #3B0764 100%);
                        margin: 0;
                        padding: 0;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        color: white;
                    }
                    .container {
                        text-align: center;
                        padding: 40px 20px;
                        max-width: 400px;
                    }
                    .spinner {
                        border: 4px solid rgba(255,255,255,0.3);
                        border-radius: 50%;
                        border-top: 4px solid white;
                        width: 40px;
                        height: 40px;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 20px;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    .manual-link {
                        display: none;
                        margin-top: 20px;
                        padding: 12px 24px;
                        background: white;
                        color: #7E22CE;
                        text-decoration: none;
                        border-radius: 25px;
                        font-weight: 600;
                        transition: transform 0.2s;
                    }
                    .manual-link:hover {
                        transform: translateY(-2px);
                    }
                </style>
                <script>
                    setTimeout(function() {
                        window.location.href = '${redirectUrl}';
                    }, 100);
                    
                    setTimeout(function() {
                        document.getElementById('manual-link').style.display = 'inline-block';
                        document.getElementById('message').textContent = 'Se o redirecionamento não funcionou, clique no link abaixo:';
                    }, 3000);
                </script>
            </head>
            <body>
                <div class="container">
                    <div class="spinner"></div>
                    <h2>Redirecionando para o Vivavinho...</h2>
                    <p id="message">Aguarde um momento</p>
                    <a id="manual-link" href="${redirectUrl}" class="manual-link">
                        Abrir no App Vivavinho
                    </a>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error("💥 Erro no processamento do OAuth:", error);
        const redirectUrl = `com.vivavinho.enolink://oauthredirect?error=server_error&message=${encodeURIComponent(error.message)}`;
        res.redirect(redirectUrl);
    }
}

export async function exchangeGoogleCode(req, res) {
    const { code, code_verifier } = req.body;

    console.log("🔄 Iniciando exchange do código Google:", code ? `${code.substring(0, 20)}...` : "null");

    try {
        if (!code) {
            return res.status(400).json({ error: "Código é obrigatório" });
        }

        if (!code_verifier) {
            return res.status(400).json({
                error: "Falha na troca de token",
                details: { error: "invalid_grant", error_description: "Missing code verifier." },
            });
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
                redirect_uri: "https://ivino-api.com/api/oauth-redirect",
                grant_type: "authorization_code",
                code_verifier: code_verifier,
            }).toString(),
        });

        const tokenData = await tokenResponse.json();

        console.log("📊 Resposta do Google Token Exchange:", {
            status: tokenResponse.status,
            has_id_token: !!tokenData.id_token,
            has_access_token: !!tokenData.access_token,
            error: tokenData.error,
        });

        if (!tokenResponse.ok) {
            console.error("❌ Erro na troca de token:", tokenData);
            return res.status(400).json({
                error: "Falha na troca de token",
                details: tokenData,
            });
        }

        if (!tokenData.id_token) {
            console.error("❌ ID Token não recebido na resposta:", tokenData);
            return res.status(400).json({
                error: "ID Token não encontrado na resposta",
                details: tokenData,
            });
        }

        console.log("✅ Token exchange realizado com sucesso");

        res.json({
            id_token: tokenData.id_token,
            access_token: tokenData.access_token,
            expires_in: tokenData.expires_in,
            token_type: tokenData.token_type,
        });
    } catch (error) {
        console.error("💥 Erro no exchange:", error);
        res.status(500).json({
            error: "Erro interno no servidor",
            message: error.message,
        });
    }
}
