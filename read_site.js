import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  projectId: "bedain-eb6a6",
  appId: "1:649905383675:web:729d387cfba011c0d2685e",
  storageBucket: "bedain-eb6a6.firebasestorage.app",
  apiKey: "AIzaSyCP5Ghg1kAN3nRMCtqoHlha-4YriU1hPtM",
  authDomain: "bedain-eb6a6.firebaseapp.com",
  messagingSenderId: "649905383675",
  measurementId: "G-Y0FHFBYB1N"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const snap = await getDoc(doc(db, "settings", "site"));
  console.log(snap.exists() ? JSON.stringify(snap.data(), null, 2) : "No doc");
  process.exit(0);
}
run();
