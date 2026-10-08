import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const firebaseConfig = {
  projectId: "bedain-eb6a6",
  appId: "1:649905383675:web:729d387cfba011c0d2685e",
  storageBucket: "bedain-eb6a6.firebasestorage.app",
  apiKey: "AIzaSyCP5Ghg1kAN3nRMCtqoHlha-4YriU1hPtM",
  authDomain: "bedain-eb6a6.firebaseapp.com",
  messagingSenderId: "649905383675",
  measurementId: "G-Y0FHFBYB1N"
};

let app, auth;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    // getReactNativePersistence is only available/valid in native environment
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  }
} else {
  app = getApp();
  auth = getAuth(app);
}

const db = getFirestore(app);
const storage = getStorage(app);

export { db, auth, storage };
export default app;
