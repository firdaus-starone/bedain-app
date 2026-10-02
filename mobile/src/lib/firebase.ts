import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  projectId: "bedain-eb6a6",
  appId: "1:649905383675:web:729d387cfba011c0d2685e",
  storageBucket: "bedain-eb6a6.firebasestorage.app",
  apiKey: "AIzaSyCP5Ghg1kAN3nRMCtqoHlha-4YriU1hPtM",
  authDomain: "bedain-eb6a6.firebaseapp.com",
  messagingSenderId: "649905383675",
  measurementId: "G-Y0FHFBYB1N"
};

// Initialize Firebase only if it hasn't been initialized already (hot-reloading safety)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };
export default app;
