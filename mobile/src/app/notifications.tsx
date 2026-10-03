import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTheme } from '../context/ThemeContext';

export default function NotificationsScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, this should filter by user ID. For MVP, we fetch global notifications.
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        // Seed dummy notifications for demonstration
        try {
          const { addDoc, serverTimestamp } = await import('firebase/firestore');
          const notifsRef = collection(db, 'notifications');
          await addDoc(notifsRef, {
            title: '🎉 Selamat Datang di Bedain News',
            body: 'Nikmati pengalaman membaca berita anti-mainstream dengan tampilan aplikasi baru kami yang super cepat dan elegan!',
            type: 'success',
            read: false,
            createdAt: serverTimestamp()
          });
          await addDoc(notifsRef, {
            title: '⚠️ Peringatan Pemeliharaan',
            body: 'Sistem akan mengalami pemeliharaan pada pukul 24:00 WIB. Beberapa fitur mungkin tidak bisa diakses sementara.',
            type: 'alert',
            read: false,
            createdAt: serverTimestamp()
          });
          await addDoc(notifsRef, {
            title: '💡 Tips Membaca',
            body: 'Anda bisa menyesuaikan warna tampilan aplikasi melalui menu Pengaturan di Profil Anda. Coba mode gelap (Dark Mode) untuk kenyamanan mata.',
            type: 'info',
            read: true,
            createdAt: serverTimestamp()
          });
        } catch (err) {
          console.error('Failed to seed notifications', err);
        }
      }

      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(notifs);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching notifications:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const dyn = {
    container: { backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' },
    header: { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderBottomColor: isDarkMode ? '#334155' : '#f1f5f9' },
    headerTitle: { color: isDarkMode ? '#f8fafc' : '#0f172a' },
    iconColor: isDarkMode ? '#f8fafc' : '#0f172a',
    closeBtn: { backgroundColor: isDarkMode ? '#334155' : '#f1f5f9' },
    card: { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderBottomColor: isDarkMode ? '#334155' : '#f1f5f9' },
    title: { color: isDarkMode ? '#f8fafc' : '#334155' },
    body: { color: isDarkMode ? '#cbd5e1' : '#475569' },
    timeText: { color: isDarkMode ? '#94a3b8' : '#64748b' },
    emptyText: { color: isDarkMode ? '#94a3b8' : '#64748b' },
  };

  const getIconForType = (type: string) => {
    switch(type) {
      case 'alert': return { name: 'warning', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
      case 'success': return { name: 'checkmark-circle', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' };
      case 'info': 
      default: return { name: 'information-circle', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' };
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Baru saja';
    const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const renderItem = ({ item }: { item: any }) => {
    const icon = getIconForType(item.type);
    return (
      <TouchableOpacity style={[styles.card, dyn.card]} activeOpacity={0.7}>
        <View style={[styles.iconWrapper, { backgroundColor: icon.bg }]}>
          <Ionicons name={icon.name as any} size={24} color={icon.color} />
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.title, dyn.title]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.body, dyn.body]} numberOfLines={2}>{item.body}</Text>
          <Text style={[styles.timeText, dyn.timeText]}>{formatTime(item.createdAt)}</Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, dyn.container]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={dyn.header.backgroundColor} />
      
      {/* Header */}
      <View style={[styles.header, dyn.header]}>
        <Text style={[styles.headerTitle, dyn.headerTitle]}>Notifikasi</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.closeBtn, dyn.closeBtn]}>
          <Ionicons name="close" size={24} color={dyn.iconColor} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, dyn.emptyText]}>Memuat...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconBg, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}>
            <Ionicons name="notifications-off-outline" size={64} color="#cbd5e1" />
          </View>
          <Text style={[styles.emptyText, dyn.emptyText, { fontSize: 16, fontWeight: '700', marginBottom: 8, color: dyn.title.color }]}>Belum ada notifikasi.</Text>
          <Text style={[styles.emptySubtext, dyn.emptyText]}>Semua pemberitahuan dan info terbaru akan muncul di sini.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 24) + 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    bottom: 16,
    padding: 4,
    borderRadius: 20,
  },
  listContainer: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
    marginLeft: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyText: {
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
