import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Platform, StatusBar, Image, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';

export default function SearchScreen() {
  const router = useRouter();
  const { isDarkMode, colors } = useTheme();
  const [queryText, setQueryText] = useState('');
  const [popularArticles, setPopularArticles] = useState<any[]>([]);
  const [redaksiArticles, setRedaksiArticles] = useState<any[]>([]);
  const [allArticles, setAllArticles] = useState<any[]>([]);
  
  const popularSearches = ['Politik 2024', 'Timnas Indonesia', 'Harga Emas', 'Cuaca Jakarta', 'Gempa Hari Ini', 'Teknologi'];

  useEffect(() => {
    // 1. Fetch Popular
    const fetchPopular = async () => {
      try {
        const q = query(collection(db, 'articles'), orderBy('views', 'desc'), limit(5));
        const snapshot = await getDocs(q);
        const fetched: any[] = [];
        snapshot.forEach(doc => fetched.push({ id: doc.id, ...doc.data() }));
        
        if (fetched.length > 0) setPopularArticles(fetched);
        else {
          const qFall = query(collection(db, 'articles'), orderBy('publishedAt', 'desc'), limit(5));
          const snapFall = await getDocs(qFall);
          const fFall: any[] = [];
          snapFall.forEach(doc => fFall.push({ id: doc.id, ...doc.data() }));
          setPopularArticles(fFall);
        }
      } catch (e) {
        const qFall = query(collection(db, 'articles'), orderBy('publishedAt', 'desc'), limit(5));
        const snapFall = await getDocs(qFall);
        const fFall: any[] = [];
        snapFall.forEach(doc => fFall.push({ id: doc.id, ...doc.data() }));
        setPopularArticles(fFall);
      }
    };

    // 2. Fetch Redaksi
    const fetchRedaksi = async () => {
      const fallbackData = [
        { id: 'r1', title: 'Pakai Setrika Uap Portabel Tapi Baju Tetep Kusut? Ini 6 Cara Pakai yang Benar', category: 'Meja Redaksi', imageUrl: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=600&q=80' },
        { id: 'r2', title: 'Capek Lipstik Matte Bikin Bibir Pecah? Coba Lip Color dengan Kandungan Serum', category: 'Meja Redaksi', imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80' },
        { id: 'r3', title: 'Rekomendasi Sepatu Olahraga Terbaik untuk Pemula yang Ingin Mulai Lari', category: 'Meja Redaksi', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80' },
        { id: 'r4', title: '5 Skincare Lokal Murah Meriah yang Ampuh Mencerahkan Wajah Kusam', category: 'Meja Redaksi', imageUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80' },
      ];
      try {
        const qR = query(
          collection(db, 'articles'), 
          where('category', '==', 'Meja Redaksi'), 
          where('status', '==', 'published'),
          orderBy('publishedAt', 'desc'), 
          limit(5)
        );
        const snapR = await getDocs(qR);
        const fR: any[] = [];
        snapR.forEach(doc => fR.push({ id: doc.id, ...doc.data() }));
        if(fR.length > 0) setRedaksiArticles(fR);
        else setRedaksiArticles(fallbackData);
      } catch (e) {
        setRedaksiArticles(fallbackData);
      }
    };

    // 3. Fetch All for Local Search (Instant Search)
    const fetchAllForSearch = async () => {
      try {
        const qAll = query(collection(db, 'articles'), orderBy('publishedAt', 'desc'), limit(100));
        const snapAll = await getDocs(qAll);
        const fAll: any[] = [];
        snapAll.forEach(doc => fAll.push({ id: doc.id, ...doc.data() }));
        setAllArticles(fAll);
      } catch(e) {}
    };

    fetchPopular();
    fetchRedaksi();
    fetchAllForSearch();
  }, []);

  // Filter local array (Sangat cepat dan instan)
  const searchResults = queryText.trim().length > 0
    ? allArticles.filter(a => 
        a.title?.toLowerCase().includes(queryText.toLowerCase()) || 
        a.category?.toLowerCase().includes(queryText.toLowerCase())
      )
    : [];

  const dyn = {
    bg: { backgroundColor: colors.background },
    headerTitle: { color: colors.text },
    searchBar: { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: colors.border },
    searchInput: { color: colors.text },
    sectionTitle: { color: isDarkMode ? '#cbd5e1' : '#94a3b8' },
    newsTitle: { color: colors.text },
    tagBadge: { backgroundColor: isDarkMode ? '#1e3a8a' : '#eff6ff', borderColor: isDarkMode ? '#1e40af' : '#bfdbfe' },
    tagText: { color: isDarkMode ? '#60a5fa' : '#1d4ed8' },
    seeMoreBtn: { backgroundColor: isDarkMode ? '#1e3a8a' : '#eff6ff', borderColor: isDarkMode ? '#1e40af' : '#bfdbfe' },
    seeMoreText: { color: isDarkMode ? '#60a5fa' : '#3b82f6' },
    redaksiWidget: { borderTopColor: colors.border },
    redaksiHeader: { color: colors.text },
    redaksiSubBox: { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc' },
    redaksiSubText: { color: isDarkMode ? '#cbd5e1' : '#475569' },
    redaksiCard: { backgroundColor: colors.card, borderColor: colors.border },
    redaksiTitle: { color: colors.text },
    emptySearchText: { color: isDarkMode ? '#94a3b8' : '#64748b' }
  };

  return (
    <SafeAreaView style={[styles.safeArea, dyn.bg]}>
      <View style={[styles.container, dyn.bg]}>
        <View style={[styles.header, { flexDirection: 'row', alignItems: 'center' }]}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="chevron-back" size={24} color={dyn.headerTitle.color} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, dyn.headerTitle, { marginBottom: 0 }]}>Cari Berita</Text>
        </View>
        
        <View style={[styles.searchBarContainer, dyn.searchBar]}>
          <Ionicons name="search" size={20} color="#94a3b8" />
          <TextInput
            style={[styles.searchInput, dyn.searchInput]}
            placeholder="Ketik topik atau kejadian..."
            placeholderTextColor="#94a3b8"
            value={queryText}
            onChangeText={setQueryText}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {queryText.length > 0 && (
            <TouchableOpacity onPress={() => setQueryText('')}>
              <Ionicons name="close-circle" size={20} color="#cbd5e1" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.content}>
          {queryText.trim().length > 0 ? (
            /* TAMPILAN HASIL PENCARIAN */
            <View style={styles.searchResultsContainer}>
              <Text style={[styles.sectionTitle, dyn.sectionTitle]}>HASIL PENCARIAN ({searchResults.length})</Text>
              
              {searchResults.length > 0 ? (
                <View style={styles.popularNewsList}>
                  {searchResults.map((item) => (
                    <TouchableOpacity key={item.id} style={styles.newsCard} onPress={() => router.push(`/article/${item.id}`)}>
                      <Image source={{ uri: item.coverImage || item.imageUrl || 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=400&q=80' }} style={styles.newsImage} />
                      <View style={styles.newsContent}>
                        <Text style={styles.newsCategory}>{item.category?.toUpperCase() || 'BERITA'}</Text>
                        <Text style={[styles.newsTitle, dyn.newsTitle]} numberOfLines={2}>{item.title}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.emptySearch}>
                  <Ionicons name="search-outline" size={48} color="#cbd5e1" />
                  <Text style={[styles.emptySearchText, dyn.emptySearchText]}>Tidak ada berita yang cocok dengan "{queryText}"</Text>
                </View>
              )}
            </View>
          ) : (
            /* TAMPILAN DEFAULT (KOSONG / DISCOVERY) */
            <>
              <Text style={[styles.sectionTitle, dyn.sectionTitle]}>PENCARIAN POPULER</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsWrapper} style={styles.tagsScrollContainer}>
                {popularSearches.map((item, index) => (
                  <TouchableOpacity key={index} style={[styles.tagBadge, dyn.tagBadge]} onPress={() => setQueryText(item)}>
                    <Ionicons name="trending-up" size={14} color={dyn.tagText.color} style={{ marginRight: 6 }} />
                    <Text style={[styles.tagText, dyn.tagText]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.popularNewsContainer}>
                <Text style={[styles.sectionTitle, dyn.sectionTitle]}>BERITA POPULER</Text>
                <View style={styles.popularNewsList}>
                  {popularArticles.map((item, index) => (
                    <TouchableOpacity key={item.id} style={styles.newsCard} onPress={() => router.push(`/article/${item.id}`)}>
                      <Image source={{ uri: item.coverImage || item.imageUrl || 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=400&q=80' }} style={styles.newsImage} />
                      <View style={styles.newsContent}>
                        <Text style={styles.newsCategory}>{item.category?.toUpperCase() || 'BERITA'}</Text>
                        <Text style={[styles.newsTitle, dyn.newsTitle]} numberOfLines={2}>{item.title}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={[styles.seeMoreBtn, dyn.seeMoreBtn]} onPress={() => router.push('/hot')}>
                  <Text style={[styles.seeMoreText, dyn.seeMoreText]}>Lihat Selengkapnya</Text>
                  <Ionicons name="arrow-forward" size={16} color={dyn.seeMoreText.color} />
                </TouchableOpacity>
              </View>

              <View style={[styles.redaksiWidget, dyn.redaksiWidget]}>
                <View style={styles.redaksiHeader}>
                  <Ionicons name="newspaper" size={22} color={dyn.redaksiHeader.color} />
                  <Text style={[styles.redaksiHeaderTitle, dyn.redaksiHeader]}>Meja Redaksi</Text>
                </View>
                <View style={[styles.redaksiSubBox, dyn.redaksiSubBox]}>
                  <Text style={[styles.redaksiSubText, dyn.redaksiSubText]}>Pilihan Artikel Terbaik dari Redaksi Kami</Text>
                </View>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.redaksiScroll} style={styles.redaksiScrollContainer}>
                  {redaksiArticles.map((item, index) => (
                    <TouchableOpacity key={item.id} style={[styles.redaksiCard, dyn.redaksiCard]} onPress={() => {
                      if (item.id.startsWith('r')) return; 
                      router.push(`/article/${item.id}`);
                    }}>
                      <Image source={{ uri: item.coverImage || item.imageUrl }} style={styles.redaksiImg} />
                      <View style={styles.redaksiContent}>
                        <Text style={styles.redaksiCat}>{item.category || 'Meja Redaksi'}</Text>
                        <Text style={[styles.redaksiTitle, dyn.redaksiTitle]} numberOfLines={3}>{item.title}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    marginHorizontal: 20,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16, color: '#0f172a' },
  content: { flex: 1, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#94a3b8', letterSpacing: 1, marginBottom: 16 },
  tagsScrollContainer: { marginHorizontal: -20 },
  tagsWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20 },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  tagText: { color: '#1d4ed8', fontSize: 14, fontWeight: '600' },
  searchResultsContainer: { paddingBottom: 40 },
  emptySearch: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptySearchText: { marginTop: 16, fontSize: 15, color: '#64748b', textAlign: 'center' },
  popularNewsContainer: {
    marginTop: 32,
  },
  popularNewsList: {
    gap: 16,
  },
  newsCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newsImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  newsContent: {
    flex: 1,
    marginLeft: 16,
  },
  newsCategory: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3b82f6',
    letterSpacing: 1,
    marginBottom: 6,
  },
  newsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 22,
  },
  seeMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  seeMoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
    marginRight: 6,
  },
  redaksiWidget: {
    marginTop: 32,
    marginBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 32,
  },
  redaksiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  redaksiHeaderTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginLeft: 8,
    letterSpacing: -0.5,
  },
  redaksiSubBox: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  redaksiSubText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  redaksiScrollContainer: {
    marginHorizontal: -20,
  },
  redaksiScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  redaksiCard: {
    width: 156,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  redaksiImg: {
    width: '100%',
    height: 96,
    backgroundColor: '#f1f5f9',
  },
  redaksiContent: {
    padding: 12,
  },
  redaksiCat: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3b82f6',
    letterSpacing: 1,
    marginBottom: 6,
  },
  redaksiTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 18,
  },
});
