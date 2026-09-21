const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  try {
    const docRef = db.collection('settings').doc('site');
    await docRef.set({
      fbPageAccessToken: 'EAAY654iEJfsBSNeuFTeJeg6gJWm4t4HZAejnvHWBz2I26Gn0N5sOdXIUZB7IqgYY4wSEfme44PosZAUTh5noJBoE7ulnsQqNGJZB8XSTXYKS4fekIZCZC0qDAuTBDal2p3BusqXSNo1lXLjr15njNZBxUcvXi9lLWHitgIk5tOLJhEmk9nVIdx4mfKV9sKmnRfQLJwNTeAbQl27ZAnxXdlv55GNV',
      fbPageId: '122102174619395568'
    }, { merge: true });
    console.log('Successfully updated FB settings in Firestore!');
  } catch (error) {
    console.error('Error updating settings:', error);
  } finally {
    process.exit(0);
  }
}

run();
