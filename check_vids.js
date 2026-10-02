const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Since I am in the project directory, maybe I can just read the config from src/lib/firebase.js
const fs = require('fs');
const content = fs.readFileSync('src/lib/firebase.js', 'utf-8');
console.log("Firebase config found");
