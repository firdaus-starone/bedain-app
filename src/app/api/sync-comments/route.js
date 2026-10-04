import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

export async function GET(req) {
  try {
    const commentsSnap = await getDocs(collection(db, 'comments'));
    const counts = {};
    
    commentsSnap.docs.forEach(d => {
      const c = d.data();
      if (c.status === 'approved' && c.articleSlug) {
        counts[c.articleSlug] = (counts[c.articleSlug] || 0) + 1;
      }
    });

    const articlesSnap = await getDocs(collection(db, 'articles'));
    const batch = writeBatch(db);
    let updated = 0;
    
    articlesSnap.docs.forEach(d => {
      const a = d.data();
      if (a.slug) {
        const actualCount = counts[a.slug] || 0;
        if (a.commentCount !== actualCount) {
          batch.update(doc(db, 'articles', d.id), { commentCount: actualCount });
          updated++;
        }
      }
    });

    if (updated > 0) {
      await batch.commit();
    }
    
    return NextResponse.json({ success: true, updated, counts });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
