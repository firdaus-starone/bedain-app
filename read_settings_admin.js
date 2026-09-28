import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function run() {
  const docRef = db.collection("settings").doc("site");
  const snap = await docRef.get();
  if (snap.exists) {
    console.log(JSON.stringify(snap.data(), null, 2));
  } else {
    console.log("No document!");
  }
}
run();
