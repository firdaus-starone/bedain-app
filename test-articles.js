const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, orderBy, limit, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  projectId: "pionerhouse-app", // I need the actual config, wait, I can just use firebase-admin
};
