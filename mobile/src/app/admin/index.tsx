import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, query, getCountFromServer, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useTheme } from '../../context/ThemeContext';

export default function NativeAdminDashboard() {
  const router = useRouter();
  const { isDarkMode, colors } = useTheme();
  
  const [stats, setStats] = useState({
    articles: 0,
    users: 0,
    comments: 0,
    pendingComments: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [
          articlesSnap, 
          usersSnap, 
          commentsSnap,
          pendingCommentsSnap
        ] = await Promise.all([
          getCountFromServer(collection(db, 'articles')),
          getCountFromServer(collection(db, 'users')),
          getCountFromServer(collection(db, 'comments')),
          getCountFromServer(query(collection(db, 'comments'), where('status', '==', 'pending')))
        ]);

        setStats({
          articles: articlesSnap.data().count,
          users: usersSnap.data().count,
          comments: commentsSnap.data().count,
          pendingComments: pendingCommentsSnap.data().count,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleFeatureClick = (featureName: string) => {
    Alert.alert("Segera Hadir", `Fitur ${featureName} native sedang dalam tahap perakitan.`);
  };

  const dyn = {
    container: { backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' },
    card: { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderColor: isDarkMode ? '#334155' : '#e2e8f0' },
    textMain: { color: isDarkMode ? '#f8fafc' : '#0f172a' },
    textMuted: { color: isDarkMode ? '#94a3b8' : '#64748b' },
    iconBgBlue: { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff' },
    iconBgGreen: { backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.2)' : '#f0fdf4' },
    iconBgOrange: { backgroundColor: isDarkMode ? 'rgba(249, 115, 22, 0.2)' : '#fff7ed' },
    iconBgPurple: { backgroundColor: isDarkMode ? 'rgba(168, 85, 247, 0.2)' : '#faf5ff' },
  };

  if (loading) {
    return (
      <View style={[styles.center, dyn.container]}>
        <ActivityIndicator size="large" color="#1b61d1" />
        <Text style={[styles.loadingText, dyn.textMuted]}>Memuat Data Dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, dyn.container]} showsVerticalScrollIndicator={false}>
      
      {/* STATISTIK OVERVIEW */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, dyn.card]}>
            <View style={[styles.statIconBox, dyn.iconBgBlue]}>
              <Ionicons name="document-text" size={24} color="#3b82f6" />
            </View>
            <Text style={[styles.statValue, dyn.textMain]}>{stats.articles}</Text>
            <Text style={[styles.statLabel, dyn.textMuted]}>Total Berita</Text>
          </View>

          <View style={[styles.statCard, dyn.card]}>
            <View style={[styles.statIconBox, dyn.iconBgGreen]}>
              <Ionicons name="people" size={24} color="#22c55e" />
            </View>
            <Text style={[styles.statValue, dyn.textMain]}>{stats.users}</Text>
            <Text style={[styles.statLabel, dyn.textMuted]}>Pengguna</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, dyn.card]}>
            <View style={[styles.statIconBox, dyn.iconBgOrange]}>
              <Ionicons name="chatbubbles" size={24} color="#f97316" />
            </View>
            <Text style={[styles.statValue, dyn.textMain]}>{stats.comments}</Text>
            <Text style={[styles.statLabel, dyn.textMuted]}>Total Komentar</Text>
          </View>

          <View style={[styles.statCard, dyn.card]}>
            <View style={[styles.statIconBox, dyn.iconBgPurple]}>
              <Ionicons name="alert-circle" size={24} color="#a855f7" />
            </View>
            <Text style={[styles.statValue, dyn.textMain]}>{stats.pendingComments}</Text>
            <Text style={[styles.statLabel, dyn.textMuted]}>Perlu Tinjauan</Text>
          </View>
        </View>
      </View>

      {/* MANAJEMEN MENU */}
      <View style={styles.menuContainer}>
        <Text style={[styles.sectionTitle, dyn.textMain]}>Menu Manajemen Utama</Text>

        <TouchableOpacity style={[styles.menuItem, dyn.card]} onPress={() => router.push('/admin/write')} activeOpacity={0.7}>
          <View style={[styles.menuIconWrapper, { backgroundColor: '#3b82f6' }]}>
            <Ionicons name="create-outline" size={22} color="#fff" />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={[styles.menuTitle, dyn.textMain]}>Tulis Berita Baru</Text>
            <Text style={[styles.menuDesc, dyn.textMuted]}>Buat artikel draft baru dengan editor cepat</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={dyn.textMuted.color} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, dyn.card]} onPress={() => router.push('/admin/articles')} activeOpacity={0.7}>
          <View style={[styles.menuIconWrapper, { backgroundColor: '#10b981' }]}>
            <Ionicons name="list-outline" size={22} color="#fff" />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={[styles.menuTitle, dyn.textMain]}>Kelola Berita</Text>
            <Text style={[styles.menuDesc, dyn.textMuted]}>Edit, Hapus, dan Atur Status Berita</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={dyn.textMuted.color} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, dyn.card]} onPress={() => router.push('/admin/comments')} activeOpacity={0.7}>
          <View style={[styles.menuIconWrapper, { backgroundColor: '#f59e0b' }]}>
            <Ionicons name="chatbox-ellipses-outline" size={22} color="#fff" />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={[styles.menuTitle, dyn.textMain]}>Moderasi Komentar</Text>
            <Text style={[styles.menuDesc, dyn.textMuted]}>Setujui atau tolak komentar masuk</Text>
          </View>
          {stats.pendingComments > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{stats.pendingComments}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={20} color={dyn.textMuted.color} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.menuItem, dyn.card]} onPress={() => router.push('/admin/users')} activeOpacity={0.7}>
          <View style={[styles.menuIconWrapper, { backgroundColor: '#6366f1' }]}>
            <Ionicons name="people-outline" size={22} color="#fff" />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={[styles.menuTitle, dyn.textMain]}>Manajemen Pengguna</Text>
            <Text style={[styles.menuDesc, dyn.textMuted]}>Kelola hak akses jurnalis & pembaca</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={dyn.textMuted.color} />
        </TouchableOpacity>
      </View>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  statsContainer: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  menuContainer: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  menuIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTextWrapper: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  menuDesc: {
    fontSize: 12,
  },
  badge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  }
});
