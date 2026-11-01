import { addDoc, collection, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Mencatat log aktivitas staf redaksi (Admin, Editor, Reporter)
 * Hanya dapat dibaca oleh Superadmin untuk kebutuhan audit & monitoring.
 */
export const logActivity = async ({
  userId,
  userName,
  userEmail,
  userRole,
  action, // 'CREATE_ARTICLE', 'UPDATE_ARTICLE', 'DELETE_ARTICLE', 'PUBLISH_ARTICLE', 'MODERATE_COMMENT', 'LOGIN', etc.
  targetTitle = '',
  targetId = '',
  targetType = 'article', // 'article', 'comment', 'user', 'settings', 'auth'
  details = '',
}) => {
  try {
    if (!userId) return;

    // 1. Simpan ke koleksi activity_logs
    await addDoc(collection(db, 'activity_logs'), {
      userId,
      userName: userName || userEmail?.split('@')[0] || 'Pengguna',
      userEmail: userEmail || '',
      userRole: userRole || 'reporter',
      action,
      targetTitle,
      targetId,
      targetType,
      details,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
    });

    // 2. Perbarui stempel waktu terakhir aktif di profil user
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        lastActiveAt: serverTimestamp(),
        lastAction: action,
        lastActionTitle: targetTitle || '',
      });
    } catch {
      // Abaikan jika update user gagal (bukan critical path)
    }
  } catch (err) {
    console.error('Gagal mencatat log aktivitas:', err);
  }
};
