import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import fs from "fs";

const envStr = fs.readFileSync(".env", "utf8");
const envVars = {};
envStr.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1]] = match[2].replace(/^["']|["']$/g, '');
});

const app = initializeApp({
  apiKey: envVars["NEXT_PUBLIC_FIREBASE_API_KEY"],
  authDomain: envVars["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"],
  projectId: envVars["NEXT_PUBLIC_FIREBASE_PROJECT_ID"]
});
const db = getFirestore(app);

async function run() {
  const docRef = doc(db, "settings", "site");
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    console.log(JSON.stringify(snap.data(), null, 2));
  } else {
    console.log("No document!");
  }
}
run();
