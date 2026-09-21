import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getFunctions } from 'firebase/functions';

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
const auth = getAuth(app);
const storage = getStorage(app);

let messaging = null;
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  }
});

const functions = getFunctions(app);

export { db, auth, storage, messaging, functions };

export default app;
