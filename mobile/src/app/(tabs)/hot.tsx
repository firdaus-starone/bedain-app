import { View, Text, StyleSheet, ScrollView, SafeAreaView, Platform, StatusBar, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function HotScreen() {
  const router = useRouter();
  const { isDarkMode, colors } = useTheme();
  const { lang, t, getArticleTitle, getCategoryName } = useLanguage();
  const [articles, setArticles] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHot = async () => {
    try {
      const q = query(collection(db, 'articles'), orderBy('views', 'desc'), limit(15));
      const snapshot = await getDocs(q);
      const fetched: any[] = [];
      snapshot.forEach(doc => {
        fetched.push({ id: doc.id, ...doc.data() });
      });
      if (fetched.length > 0) {
        setArticles(fetched);
      } else {
        const qFall = query(collection(db, 'articles'), orderBy('publishedAt', 'desc'), limit(15));
        const snapFall = await getDocs(qFall);
        const fFall: any[] = [];
        snapFall.forEach(doc => fFall.push({ id: doc.id, ...doc.data() }));
        setArticles(fFall);
      }
    } catch (e) {
      console.error(e);
      const qFall = query(collection(db, 'articles'), orderBy('publishedAt', 'desc'), limit(15));
      const snapFall = await getDocs(qFall);
      const fFall: any[] = [];
      snapFall.forEach(doc => fFall.push({ id: doc.id, ...doc.data() }));
      setArticles(fFall);
    }
  };

  useEffect(() => {
    fetchHot();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHot();
    setRefreshing(false);
  };

  const dyn = {
    bg: { backgroundColor: colors.background },
    header: { borderBottomColor: colors.border },
    headerTitle: { color: colors.text },
    title: { color: colors.text },
    date: { color: colors.textSecondary }
  };

  return (
    <SafeAreaView style={[styles.safeArea, dyn.bg]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={[styles.header, dyn.header]}>
        <View style={styles.headerIconContainer}>
          <Ionicons name="flame" size={22} color="#ffffff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, dyn.headerTitle]}>{t('home.hot_topics', 'Sedang Hangat')}</Text>
          <Text style={styles.headerSubtitle}>{t('home.trending_desc', 'Berita paling banyak dibaca saat ini')}</Text>
        </View>
      </View>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[colors.primary]} 
            tintColor={colors.primary} 
          />
        }
      >
        {articles.map((item, index) => {
          const isTop3 = index < 3;
          const rankColor = index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : (isDarkMode ? '#475569' : '#cbd5e1');
          
          let dateStr = 'Baru saja';
          if (item.publishedAt) {
            const dateObj = typeof item.publishedAt.toDate === 'function' ? item.publishedAt.toDate() : new Date(item.publishedAt);
            dateStr = dateObj.toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'zh' ? 'zh-CN' : 'id-ID', { day: 'numeric', month: 'short' });
          }

          const isLast = index === articles.length - 1;

          return (
            <TouchableOpacity 
              key={item.id || index} 
              style={[
                styles.itemRow, 
                !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }
              ]} 
              onPress={() => item.videoUrl ? router.push(`/watch/${item.id}` as any) : router.push(`/article/${item.id}`)} 
              activeOpacity={0.7}
            >
              <View style={styles.rankContainer}>
                <Text style={[styles.rankNumber, { color: rankColor, fontSize: isTop3 ? 28 : 22 }]}>
                  {index + 1}
                </Text>
              </View>
              
              <View style={styles.cardContent}>
                <Text style={styles.category}>{getCategoryName(item.category)?.toUpperCase() || 'BERITA'}</Text>
                <Text style={[styles.title, dyn.title]} numberOfLines={3}>{getArticleTitle(item)}</Text>
                <Text style={[styles.dateText, dyn.date]}>{dateStr}</Text>
              </View>

              {(item.coverImage || item.imageUrl || item.image) && (
                <Image 
                  source={{ uri: item.coverImage || item.imageUrl || item.image }} 
                  style={[styles.thumbnail, { backgroundColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]} 
                  resizeMode="cover"
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#ffffff', 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 
  },
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingTop: 16, 
    paddingBottom: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f1f5f9' 
  },
  headerIconContainer: { 
    width: 34, 
    height: 34, 
    borderRadius: 17, 
    backgroundColor: '#ef4444', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 10 
  },
  headerTitle: { 
    fontFamily: 'Montserrat-Black',
    fontSize: 20, 
    fontWeight: '900', 
    color: '#0f172a' 
  },
  headerSubtitle: { 
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 11, 
    color: '#64748b', 
    fontWeight: '500', 
    marginTop: 2 
  },
  itemRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 14, 
    backgroundColor: 'transparent'
  },
  rankContainer: { 
    width: 32, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 8 
  },
  rankNumber: { 
    fontFamily: 'Montserrat-Black',
    fontWeight: '900', 
    fontStyle: 'italic', 
    letterSpacing: -1 
  },
  cardContent: { 
    flex: 1, 
    paddingHorizontal: 6 
  },
  category: { 
    fontFamily: 'Montserrat-Bold',
    color: '#ef4444', 
    fontSize: 9.5, 
    fontWeight: '800', 
    letterSpacing: 0.8, 
    marginBottom: 4 
  },
  title: { 
    fontFamily: 'Montserrat-Bold',
    fontSize: 13.5, 
    fontWeight: '700', 
    color: '#1e293b', 
    lineHeight: 19, 
    marginBottom: 6 
  },
  dateText: { 
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 10.5, 
    fontWeight: '500' 
  },
  thumbnail: { 
    width: 72, 
    height: 72, 
    borderRadius: 10, 
    marginLeft: 8 
  }
});

