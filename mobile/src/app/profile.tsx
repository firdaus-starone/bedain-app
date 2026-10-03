import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTheme } from '../context/ThemeContext';

export default function ProfileModal() {
  const router = useRouter();
  const { isDarkMode, toggleTheme } = useTheme();
  const [pages, setPages] = useState<{ id: string, title: string, slug: string }[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);

  useEffect(() => {
    const fetchPages = async () => {
      try {
        const q = query(collection(db, 'pages'), where('status', '==', 'published'));
        const snapshot = await getDocs(q);
        const pagesData = snapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title,
          slug: doc.data().slug
        }));
        
        // Urutkan abjad atau sesuai urutan (di sini berdasar judul)
        pagesData.sort((a, b) => a.title.localeCompare(b.title));
        
        setPages(pagesData);
      } catch (error) {
        console.error("Error fetching pages:", error);
      } finally {
        setLoadingPages(false);
      }
    };

    fetchPages();
  }, []);

  const handleFeatureNotReady = (featureName: string) => {
    Alert.alert("Segera Hadir!", `Fitur ${featureName} sedang dalam pengembangan.`);
  };

  const handlePagePress = (slug: string) => {
    if (slug === 'faq') {
      WebBrowser.openBrowserAsync(`https://bedainnews.com/page/${slug}`);
    } else {
      router.push(`/page/${slug}`);
    }
  };

  const dyn = {
    container: { backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' },
    header: { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderBottomColor: isDarkMode ? '#334155' : '#f1f5f9' },
    headerTitle: { color: isDarkMode ? '#f8fafc' : '#0f172a' },
    closeBtn: { backgroundColor: isDarkMode ? '#334155' : '#f1f5f9' },
    iconColor: isDarkMode ? '#f8fafc' : '#0f172a',
    userCard: { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', shadowOpacity: isDarkMode ? 0 : 0.05 },
    userName: { color: isDarkMode ? '#f8fafc' : '#0f172a' },
    userEmail: { color: isDarkMode ? '#94a3b8' : '#64748b' },
    menuSection: { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', shadowOpacity: isDarkMode ? 0 : 0.03 },
    sectionTitle: { color: isDarkMode ? '#94a3b8' : '#64748b' },
    menuText: { color: isDarkMode ? '#f8fafc' : '#1e293b' },
    menuIconBox: { backgroundColor: isDarkMode ? '#334155' : '#eff6ff' },
    menuIconBoxGray: { backgroundColor: isDarkMode ? '#334155' : '#f1f5f9' },
    menuIconBoxYellow: { backgroundColor: isDarkMode ? 'rgba(217, 119, 6, 0.2)' : '#fef3c7' },
    chevron: isDarkMode ? '#64748b' : '#cbd5e1',
    infoCard: { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' },
    infoText: { color: isDarkMode ? '#e2e8f0' : '#0f172a' },
    sectionTitleWithoutMargin: { color: isDarkMode ? '#cbd5e1' : '#475569' },
  };

  return (
    <View style={[styles.container, dyn.container]}>
      {/* Header Modal */}
      <View style={[styles.header, dyn.header]}>
        <Text style={[styles.headerTitle, dyn.headerTitle]}>Menu Profil</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.closeBtn, dyn.closeBtn]}>
          <Ionicons name="close" size={24} color={dyn.iconColor} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info Card */}
        <View style={[styles.userCard, dyn.userCard]}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={32} color="#ffffff" />
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, dyn.userName]}>Pembaca Setia</Text>
            <Text style={[styles.userEmail, dyn.userEmail]}>Belum login</Text>
          </View>
          <TouchableOpacity style={styles.loginBtn} onPress={() => handleFeatureNotReady('Login')}>
            <Text style={styles.loginBtnText}>Login</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <View style={[styles.menuSection, dyn.menuSection]}>
          <Text style={[styles.sectionTitle, dyn.sectionTitle]}>Akun & Aktivitas</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => handleFeatureNotReady('Profil Saya')}>
            <View style={[styles.menuIconBox, dyn.menuIconBox]}>
              <Ionicons name="person-outline" size={20} color="#1b61d1" />
            </View>
            <Text style={[styles.menuText, dyn.menuText]}>Profil Saya</Text>
            <Ionicons name="chevron-forward" size={20} color={dyn.chevron} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/bookmarks')}>
            <View style={[styles.menuIconBox, dyn.menuIconBox]}>
              <Ionicons name="bookmark-outline" size={20} color="#1b61d1" />
            </View>
            <Text style={[styles.menuText, dyn.menuText]}>Bookmark & Tersimpan</Text>
            <Ionicons name="chevron-forward" size={20} color={dyn.chevron} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => handleFeatureNotReady('Langganan Premium')}>
            <View style={[styles.menuIconBox, dyn.menuIconBoxYellow]}>
              <Ionicons name="star-outline" size={20} color="#d97706" />
            </View>
            <Text style={[styles.menuText, dyn.menuText]}>Langganan Premium</Text>
            <Ionicons name="chevron-forward" size={20} color={dyn.chevron} />
          </TouchableOpacity>
        </View>

        <View style={[styles.menuSection, dyn.menuSection]}>
          <Text style={[styles.sectionTitle, dyn.sectionTitle]}>Pengaturan Aplikasi</Text>
          
          <View style={styles.menuItem}>
            <View style={[styles.menuIconBox, dyn.menuIconBoxGray]}>
              <Ionicons name={isDarkMode ? "moon-outline" : "sunny-outline"} size={20} color={isDarkMode ? "#cbd5e1" : "#475569"} />
            </View>
            <Text style={[styles.menuText, dyn.menuText]}>Mode Gelap</Text>
            <Switch 
              value={isDarkMode} 
              onValueChange={toggleTheme} 
              trackColor={{ false: '#cbd5e1', true: '#1e3a8a' }}
              thumbColor={isDarkMode ? '#3b82f6' : '#ffffff'}
            />
          </View>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => handleFeatureNotReady('Notifikasi')}>
            <View style={[styles.menuIconBox, dyn.menuIconBoxGray]}>
              <Ionicons name="notifications-outline" size={20} color={isDarkMode ? "#cbd5e1" : "#475569"} />
            </View>
            <Text style={[styles.menuText, dyn.menuText]}>Notifikasi</Text>
            <Ionicons name="chevron-forward" size={20} color={dyn.chevron} />
          </TouchableOpacity>
        </View>

        {/* Section Informasi & Layanan (Dinamis dari Firestore) */}
        <View style={styles.infoSection}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.blueDot} />
            <Text style={[styles.sectionTitleWithoutMargin, dyn.sectionTitleWithoutMargin]}>INFORMASI & LAYANAN</Text>
          </View>
          
          {loadingPages ? (
            <ActivityIndicator size="small" color="#1b61d1" style={{ marginVertical: 20 }} />
          ) : (
            pages.length > 0 ? (
              pages.map((page) => (
                <TouchableOpacity 
                  key={page.id} 
                  style={[styles.infoCard, dyn.infoCard]} 
                  onPress={() => handlePagePress(page.slug)}
                >
                  <Ionicons name="document-text-outline" size={20} color={isDarkMode ? "#cbd5e1" : "#475569"} style={styles.infoIcon} />
                  <Text style={[styles.infoText, dyn.infoText]}>{page.title}</Text>

                </TouchableOpacity>
              ))
            ) : (
              <Text style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic', marginTop: 8 }}>
                Belum ada halaman tersedia.
              </Text>
            )
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 16 : 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: '#64748b',
  },
  loginBtn: {
    backgroundColor: '#1b61d1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  menuSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
  },
  infoSection: {
    marginTop: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  blueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1b61d1',
    marginRight: 8,
  },
  sectionTitleWithoutMargin: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  infoIcon: {
    marginRight: 10,
  },
  infoText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  }
});
