import { readFileSync } from 'fs';
import admin from 'firebase-admin';

const serviceAccount = JSON.parse(readFileSync('./bedain-eb6a6-firebase-adminsdk.json', 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function run() {
  try {
    const commentsSnap = await db.collection('comments').get();
    const counts = {};
    
    commentsSnap.docs.forEach(d => {
      const c = d.data();
      if (c.status === 'approved' && c.articleSlug) {
        counts[c.articleSlug] = (counts[c.articleSlug] || 0) + 1;
      }
    });

    console.log("Counts:", counts);

    const articlesSnap = await db.collection('articles').get();
    for (const d of articlesSnap.docs) {
      const a = d.data();
      if (a.slug) {
        const actualCount = counts[a.slug] || 0;
        if (a.commentCount !== actualCount) {
          console.log(`Updating ${a.slug} to ${actualCount}`);
          await db.collection('articles').doc(d.id).update({ commentCount: actualCount });
        }
      }
    }
    console.log("Done");
  } catch(e) {
    console.error(e);
  }
}
run();
