import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "pionerhouse-app",
  appId: "1:472299357078:web:995a87e23ff23326fd53b7",
  storageBucket: "pionerhouse-app.firebasestorage.app",
  apiKey: "AIzaSyB5l9bRv0IdoT2vC7-DjE7a6en_J9vE0MM",
  authDomain: "pionerhouse-app.firebaseapp.com",
  messagingSenderId: "472299357078"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkDate() {
  const docRef = doc(db, 'articles', 'ip5mrmsoWqsjUPH4I2fl');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    let p;
    if (data.publishedAt && typeof data.publishedAt.toDate === 'function') {
      p = data.publishedAt.toDate();
    } else {
      p = new Date(data.publishedAt || Date.now());
    }
    console.log("PublishedAt:", p.toISOString());
  } else {
    console.log("Not found");
  }
}

checkDate().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
