import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "bedain-eb6a6",
  appId: "1:649905383675:web:729d387cfba011c0d2685e",
  apiKey: "AIzaSyCP5Ghg1kAN3nRMCtqoHlha-4YriU1hPtM"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  const q = query(collection(db, 'articles'));
  const snap = await getDocs(q);
  const articles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const specific = articles.find(a => a.title && a.title.includes('Danau'));
  if (specific) {
    console.log("Specific article found:", specific.title);
    console.log("Status:", specific.status);
    console.log("publishedAt:", specific.publishedAt ? specific.publishedAt.toDate() : 'none');
  } else {
    console.log("Not found in whole db");
  }
}
test().catch(console.error);
