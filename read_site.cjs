const admin = require("firebase-admin");
const fs = require("fs");

const envStr = fs.readFileSync(".env.local", "utf8");
const envVars = {};
envStr.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1]] = match[2].replace(/^["']|["']$/g, '');
});

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(), // Wait, no, we need to pass the config
    projectId: envVars["NEXT_PUBLIC_FIREBASE_PROJECT_ID"]
  });
}

const db = admin.firestore();

async function run() {
  const snap = await db.collection("settings").doc("site").get();
  console.log(snap.exists ? JSON.stringify(snap.data(), null, 2) : "No doc");
}
run();
