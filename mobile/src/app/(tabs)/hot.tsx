import { View, Text, StyleSheet, ScrollView, SafeAreaView, Platform, StatusBar, TouchableOpacity, Image } from 'react-native';
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
        else {
          const qFall = query(collection(db, 'articles'), orderBy('publishedAt', 'desc'), limit(10));
          const snapFall = await getDocs(qFall);
          const fFall: any[] = [];
          snapFall.forEach(doc => fFall.push({ id: doc.id, ...doc.data() }));
          setArticles(fFall);
        }
      } catch (e) {
        console.error(e);
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
    card: { backgroundColor: colors.card, borderColor: colors.border },
    title: { color: colors.text },
    date: { color: colors.textSecondary }
  };

  return (
    <SafeAreaView style={[styles.safeArea, dyn.bg]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={[styles.header, dyn.header]}>
        <View style={styles.headerIconContainer}>
          <Ionicons name="flame" size={24} color="#ffffff" />
        </View>
        <View>
          <Text style={[styles.headerTitle, dyn.headerTitle]}>Sedang Hangat</Text>
          <Text style={styles.headerSubtitle}>Berita paling banyak dibaca saat ini</Text>
        </View>
      </View>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}>
        {articles.map((item, index) => {
          const isTop3 = index < 3;
          const rankColor = index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : (isDarkMode ? '#334155' : '#cbd5e1');
          
          let dateStr = 'Baru saja';
          if (item.publishedAt) {
            const dateObj = typeof item.publishedAt.toDate === 'function' ? item.publishedAt.toDate() : new Date(item.publishedAt);
            dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
          }

          return (
            <TouchableOpacity key={item.id} style={[styles.card, dyn.card]} onPress={() => router.push(`/article/${item.id}`)} activeOpacity={0.8}>
              <View style={styles.rankContainer}>
                <Text style={[styles.rankNumber, { color: rankColor, fontSize: isTop3 ? 32 : 24 }]}>{index + 1}</Text>
              </View>
              
              <View style={styles.cardContent}>
                <Text style={styles.category}>{item.category?.toUpperCase() || 'BERITA'}</Text>
                <Text style={[styles.title, dyn.title]} numberOfLines={3}>{item.title}</Text>
                <Text style={[styles.dateText, dyn.date]}>{dateStr}</Text>
              </View>

              {(item.coverImage || item.imageUrl) && (
                <Image source={{ uri: item.coverImage || item.imageUrl }} style={styles.thumbnail} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerIconContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  headerSubtitle: { fontSize: 11, color: '#64748b', fontWeight: '500', marginTop: 2 },
  card: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, padding: 8, borderRadius: 12, borderWidth: 1, backgroundColor: '#ffffff', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  rankContainer: { width: 35, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  rankNumber: { fontWeight: '900', fontStyle: 'italic', letterSpacing: -1.5 },
  cardContent: { flex: 1, paddingHorizontal: 6 },
  category: { color: '#ef4444', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 13, fontWeight: '700', color: '#1e293b', lineHeight: 18, marginBottom: 6 },
  dateText: { fontSize: 10, fontWeight: '500' },
  thumbnail: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#e2e8f0', marginLeft: 6 }
});
