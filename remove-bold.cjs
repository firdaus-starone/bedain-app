const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  try {
    console.log("Memulai proses pembersihan tulisan tebal (bold) pada artikel...");
    const snapshot = await db.collection('articles').get();
    let updatedCount = 0;
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      let content = data.content;
      
      if (content && typeof content === 'string') {
        // Cari tag <strong> atau <b>
        if (content.match(/<strong[^>]*>|<\/strong>|<b\b[^>]*>|<\/b>/i)) {
          // Hapus semua tag strong dan b, tapi sisakan teks di dalamnya
          const newContent = content.replace(/<strong[^>]*>|<\/strong>|<b\b[^>]*>|<\/b>/gi, '');
          
          if (newContent !== content) {
            await doc.ref.update({ content: newContent });
            console.log(`✅ Membersihkan artikel: ${data.title || doc.id}`);
            updatedCount++;
          }
        }
      }
    }
    console.log(`\nSelesai! Total artikel yang dibersihkan: ${updatedCount}`);
  } catch (error) {
    console.error('Error saat membersihkan:', error);
  } finally {
    process.exit(0);
  }
}

run();
