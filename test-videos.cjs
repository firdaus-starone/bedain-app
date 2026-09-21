const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin (assuming default credentials work)
initializeApp({
  projectId: 'pionerhouse-app'
});

const db = getFirestore();

const getYouTubeId = (input) => {
  if (!input || typeof input !== 'string') return null;
  const regExp = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const match = input.match(regExp);
  return match ? match[1] : null;
};

async function test() {
  const snapshot = await db.collection('articles').orderBy('publishedAt', 'desc').limit(30).get();
  console.log(`Found ${snapshot.docs.length} articles.`);
  
  let foundVideos = 0;
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const ytId = getYouTubeId(data.videoUrl || data.youtubeUrl || data.video || data.content);
    if (ytId && data.status === 'published') {
      console.log(`- [VIDEO] ${data.title} -> YouTube ID: ${ytId}`);
      foundVideos++;
    } else if (data.status === 'published') {
      // Check if it has an iframe at all
      if (data.content && data.content.includes('<iframe')) {
         console.log(`- [NO YT MATCH BUT HAS IFRAME] ${data.title}`);
         // print the iframe part
         const iframeMatch = data.content.match(/<iframe.*?<\/iframe>/i);
         if (iframeMatch) console.log('  Iframe:', iframeMatch[0]);
      }
    }
  });
  console.log(`Total video articles found: ${foundVideos}`);
}

test().catch(console.error);
