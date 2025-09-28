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
        code: code ? `${code.substring(0, 20)}...` : null,
        state,
        error,
        error_description,
    });

    try {
        if (error) {
            console.error("❌ Erro no OAuth do Google:", error, error_description);
            const errorParams = new URLSearchParams({
                error: error,
                state: state || "",
                ...(error_description && { error_description }),
            }).toString();

            return res.redirect(`com.vivavinho.enolink://oauthredirect?${errorParams}`);
        }

        if (!code) {
            console.error("❌ Código de autorização não recebido");
            return res.redirect(`com.vivavinho.enolink://oauthredirect?error=missing_code&state=${state || ""}`);
        }

        const params = new URLSearchParams({
            code: code,
            state: state || "",
            source: "google_oauth",
        }).toString();

        const redirectUrl = `com.vivavinho.enolink://oauthredirect?${params}`;

        console.log("🔀 Redirecionando para app (primeiros 50 chars):", redirectUrl.substring(0, 50) + "...");

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Redirecionando para Vivavinho...</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <script>
                    console.log("Iniciando redirecionamento OAuth...");
                    
                    function redirectToApp() {
                        const appUrl = '${redirectUrl}';
                        console.log("Redirecionando para:", appUrl);
                        
                        window.location.href = appUrl;
                        
                        setTimeout(function() {
                            console.log("Fallback: mostrando link manual");
                            document.getElementById('manual-link').style.display = 'block';
                            document.getElementById('status').innerHTML = 'Se o redirecionamento automático não funcionar, clique no link abaixo:';
                        }, 1500);
                    }
                    
                    window.onload = redirectToApp;
                </script>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        text-align: center;
                        padding: 50px 20px;
                        background: linear-gradient(135deg, #7E22CE 0%, #3B82F6 100%);
                        color: white;
                        min-height: 100vh;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                    }
                    .container {
                        background: rgba(255, 255, 255, 0.1);
                        backdrop-filter: blur(10px);
                        padding: 40px 30px;
                        border-radius: 20px;
                        max-width: 500px;
                        width: 100%;
                    }
                    h2 {
                        margin-bottom: 20px;
                        font-size: 24px;
                    }
                    .spinner {
                        border: 4px solid rgba(255, 255, 255, 0.3);
                        border-radius: 50%;
                        border-top: 4px solid white;
                        width: 40px;
                        height: 40px;
                        animation: spin 1s linear infinite;
                        margin: 20px auto;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    #manual-link {
                        display: none;
                        padding: 12px 24px;
                        background: white;
                        color: #7E22CE;
                        text-decoration: none;
                        border-radius: 10px;
                        font-weight: bold;
                        margin-top: 20px;
                        transition: transform 0.2s;
                    }
                    #manual-link:hover {
                        transform: translateY(-2px);
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>🎉 Login realizado com sucesso!</h2>
                    <p id="status">Redirecionando para o Vivavinho...</p>
                    <div class="spinner"></div>
                    <a id="manual-link" href="${redirectUrl}">
                        Abrir no App Vivavinho
                    </a>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error("💥 Erro no processamento do OAuth:", error);
        const errorParams = new URLSearchParams({
            error: "processing_error",
            message: error.message,
        }).toString();
        res.redirect(`com.vivavinho.enolink://oauthredirect?${errorParams}`);
    }
}

export async function exchangeGoogleCode(req, res) {
    const { code } = req.body;

    console.log("🔄 Iniciando exchange do código Google:", code ? `${code.substring(0, 20)}...` : "null");

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
                client_id: process.env.GOOGLE_CLIENT_ID || "27430021409-n25b5e2urcnv1m0sot5stg8m81muo386.apps.googleusercontent.com",
                client_secret: process.env.GOOGLE_CLIENT_SECRET || "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",
                redirect_uri: process.env.GOOGLE_REDIRECT_URI || "https://ivino-api.com/oauth-redirect",
                grant_type: "authorization_code",
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
