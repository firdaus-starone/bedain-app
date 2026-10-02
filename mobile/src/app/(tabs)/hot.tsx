import { View, Text, StyleSheet, ScrollView, SafeAreaView, Platform, StatusBar, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

export default function HotScreen() {
  const router = useRouter();
  const { isDarkMode, colors } = useTheme();
  const [articles, setArticles] = useState<any[]>([]);

  useEffect(() => {
    const fetchHot = async () => {
      try {
        const q = query(collection(db, 'articles'), orderBy('views', 'desc'), limit(10));
        const snapshot = await getDocs(q);
        const fetched: any[] = [];
        snapshot.forEach(doc => {
          fetched.push({ id: doc.id, ...doc.data() });
        });
        if(fetched.length > 0) setArticles(fetched);
        // Fallback to recent if views sort fails/is empty
        else {
          const qFall = query(collection(db, 'articles'), orderBy('publishedAt', 'desc'), limit(10));
          const snapFall = await getDocs(qFall);
          const fFall: any[] = [];
          snapFall.forEach(doc => fFall.push({ id: doc.id, ...doc.data() }));
          setArticles(fFall);
        }
      } catch (e) {
        // Handle error (often requires Firestore index creation for complex queries)
        console.error(e);
        // Silent fallback
        const qFall = query(collection(db, 'articles'), orderBy('publishedAt', 'desc'), limit(10));
        const snapFall = await getDocs(qFall);
        const fFall: any[] = [];
        snapFall.forEach(doc => fFall.push({ id: doc.id, ...doc.data() }));
        setArticles(fFall);
      }
    };
    fetchHot();
  }, []);

  const dyn = {
    bg: { backgroundColor: colors.background },
    header: { borderBottomColor: colors.border },
    headerTitle: { color: colors.text },
    rankNumber: { color: isDarkMode ? '#334155' : '#f1f5f9' },
    title: { color: colors.text }
  };

  return (
    <SafeAreaView style={[styles.safeArea, dyn.bg]}>
      <View style={[styles.header, dyn.header]}>
        <Ionicons name="flame" size={28} color="#ef4444" />
        <Text style={[styles.headerTitle, dyn.headerTitle]}>Sedang Hangat</Text>
      </View>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>
        {articles.map((item, index) => (
          <TouchableOpacity key={item.id} style={styles.card} onPress={() => router.push(`/article/${item.id}`)}>
            <Text style={[styles.rankNumber, dyn.rankNumber]}>#{index + 1}</Text>
            <View style={styles.cardContent}>
              <Text style={styles.category}>{item.category?.toUpperCase() || 'BERITA TERBARU'}</Text>
              <Text style={[styles.title, dyn.title]} numberOfLines={3}>{item.title}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginLeft: 10 },
  card: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  rankNumber: { fontSize: 28, fontWeight: '900', color: '#f1f5f9', width: 60, fontStyle: 'italic', letterSpacing: -1.5 },
  cardContent: { flex: 1, paddingLeft: 8 },
  category: { color: '#ef4444', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 14, fontWeight: '700', color: '#1e293b', lineHeight: 20 }
});
