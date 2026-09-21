import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault(), projectId: 'pionerhouse-app' });
const db = getFirestore();

async function run() {
  const snapshot = await db.collection('articles').where('authorId', '==', 'seed-admin').get();
  console.log(`Found ${snapshot.size} dummy articles.`);
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  console.log('Successfully deleted dummy articles.');
}
run().catch(console.error);
