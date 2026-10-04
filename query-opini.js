import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

export const firebaseConfig = {
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
  const snap = await getDocs(collection(db, 'articles'));
  const articles = snap.docs.map(d => d.data());
  const opini = articles.filter(a => typeof a.category === 'string' && (a.category.toLowerCase().includes('opini') || a.category.toLowerCase().includes('kolom') || a.category.toLowerCase().includes('tajuk') || a.category.toLowerCase().includes('editorial')));
  console.log("Opini string count:", opini.length);
  if (opini.length > 0) {
    opini.forEach(o => {
      console.log("-", o.title, "| status:", o.status, "| publishedAt:", o.publishedAt);
    });
  }
}
run();
