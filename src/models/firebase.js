import admin from "firebase-admin";
//const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
const config = {
    type: "service_account",
    project_id: "ivino-app",
    private_key_id: "e042992acec73d3bfdc97b3998a0f49506973db5",
    private_key:
        "-----BEGIN PRIVATE KEY-----\nMIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQDmXSsEnJD58uQZ\nOl7AxaofXrn1JVpv2a5mkjIKMrTGSXisJslOWZBvX8fP3SAf1+eiMHYYgwW0kkxs\nYn8/6GFGdd6SHC9Vp8aIsgAea9Y0rHTGGDEyCye9g7ejP0ipRugrLZ6NeSZtTgMW\na1E2wm4CtuQo2vIqoHxt0cgiYjXgBAUW8pWVbFJyPDgH66BC0ZFDrjKNDDgCJXbK\nPl6PMxYK6CaX3dHwxYlmyuCIbta2ZpR5LXYtJfveJXN9L6TMSXtpehxOy9KJ+6r1\nEdtwm0nPDN+q/fnVCxKVBrCnqs4bnANh40Mct4Sqizy0nz9U96ZFtTsJ6deG+BYA\nsShbr/kpAgMBAAECggEAG2mrWJNkCiZd/+WLCIANIEoGsXYmNqiuAP01MLL7gZwV\nHNFJw8XTMvmwHpt2+usXoJyJNR4EVApTx1MKRvnZd4fHulXZySTbsoESFAyrkx2R\nkNAorIaYzkvKEsZRWHl8X8UAOOAZk0jFA8o2AiDtc+u9J2J0jl+GJxBfcz4CILvH\n6PCv37T6iMJo5cf8eJfXZX2QS6lTRxpzb2FJ3o0FrMnaso++4XgcqOeBtbShFXIW\nHykvp4QMOiCDRsTddsIhmIKbMIhdjm/k3EU2mok5Zq3vAKxTVyvbawVel4iO/ydh\nd/83bO3NcA5WPI4GejgpUyAGP1l478nMs04JweYGXQKBgQD5fmMMBYtG8S9sa0IX\nH7oLyQ/PB6fN+JtVPnf//WVD7I/s00VYRDSQiMYJQsMfokGo7lvnp/HEQogUFNjN\nxK/+vDVDuG6U2n9FcG65tgUGts9rLv1jqWZE9o4hBU6P9fY3vol2E5ZzCMM59OEG\nsxS7LgYiuxq17E3RWC7CLVPthQKBgQDsXxJFqD2bD099/1LswKMa6mZlH0Rtb+Qa\n7+koE2ly1N8TC2T7VC7ibijdCuKVBxcjpllrouV+N/S93NmC//blxaj5eWbhb2Ut\n0MplQGHbmSLJS2J/SoBwAQElOXXrc7QBR4fwqcuvaecetj9wVn9ZHXdcaLfELoEv\n5pVSN4ZsVQKBgQCDtyTFSPwBpP0baPjISninFivhabI+fDxNYaBqpjVbCb3mEpeu\nhLuXfo3Gf9eRkNDHRaeBglmR+mnq6CKZZ3herLAWI31F2qCMYVIjeyPmKocQmAsw\nHVOfnubkKfAS8pBdV5ssmiS4cGzY4R4Xsl2EgES++zabyrg+iCaPXuzLHQJ/eAfP\nP5AvuI4Nz+3YLmGkcgaV+MPn+6rWKtepjrBM3AM9RG6E2RvmsxU9qwHcDdGL7o6K\n2h3ebDn+DmwYCG3y8rttE0KS++eVea6NGN2Y0+rvv0iIvBsZHcdkzYJgXzBiOEQa\nxBt1U55zvyTNEj7abGaKNmL27qiu8aQmL5oCqQKBgDJMSH5x8ErhrEveRyxMED77\nT8hJtDo3yVd+5RUQfTkTlKt6pBlOP2jSS204ow1UvmnbuGzuP1WgMoAgNymS3mf0\n/sjOcPcuzv8xnh2laC0t9gcoWqAtCRnYkgRTcLgQfIlLN+Htptd6ePdUQhAtAkiK\nlDP4H0I0LJbJzz0f4SxN\n-----END PRIVATE KEY-----\n",
    client_email: "firebase-adminsdk-fbsvc@ivino-app.iam.gserviceaccount.com",
    client_id: "100180381568409520409",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40ivino-app.iam.gserviceaccount.com",
    universe_domain: "googleapis.com",
};

admin.initializeApp({
    credential: admin.credential.cert(config),
});

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

export default db;
