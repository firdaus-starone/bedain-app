import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ImageBackground, StatusBar, Platform, FlatList, Dimensions, RefreshControl, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, query, orderBy, limit, getDocs, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useTheme } from '../../context/ThemeContext';

const HOT_TOPICS = [
  '#Teknologi AI', 
  '#Bisnis Digital', 
  '#Produktivitas', 
  '#Investasi', 
  '#Green Tech', 
  '#Karir', 
  '#Review Gadget', 
  '#StartUp', 
  '#Kripto', 
  '#Otomotif'
];

const mapArticle = (a: any) => {
  let dateStr = 'Baru saja';
  if (a.publishedAt) {
    const dateObj = typeof a.publishedAt.toDate === 'function' ? a.publishedAt.toDate() : new Date(a.publishedAt);
    dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  const hasVideo = !!(
    a.videoUrl || 
    a.youtubeUrl || 
    a.video || 
    (a.content && (
      a.content.includes('<iframe') || 
      a.content.includes('<video') || 
      a.content.includes('youtube.com') || 
      a.content.includes('youtu.be') ||
      a.content.includes('20detik')
    ))
  );

  return {
    id: a.id,
    title: a.title || 'Tanpa Judul',
    date: dateStr,
    image: a.coverImage || a.imageUrl || 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=400&q=80',
    category: a.category || 'Berita',
    slug: a.slug || a.id,
    videoUrl: hasVideo
  };
};

export default function Home() {
  const router = useRouter();
  const { isDarkMode, colors } = useTheme();
  const [categories, setCategories] = useState<{ name: string, slug: string }[]>([]);
  const [siteSettings, setSiteSettings] = useState({
    siteName: 'Bedain News',
    logoUrl: '',
  });
  const [rawArticles, setRawArticles] = useState<any[]>([]);
  const [hotTopics, setHotTopics] = useState<string[]>(HOT_TOPICS);
  const [refreshing, setRefreshing] = useState(false);
  const [banners, setBanners] = useState<any[]>([]);

  const headerBanners = banners.filter(b => b.slot === 'header');
  const feedBanners = banners.filter(b => b.slot === 'sidebar');

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const docRef = doc(db, 'settings', 'site');
      const snap = await getDoc(docRef);
      if (snap.exists()) setSiteSettings(snap.data() as any);
      
      const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
      const snapCat = await getDocs(q);
      const data = snapCat.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(cat => cat.active !== false)
        .map(cat => ({ name: cat.name, slug: cat.slug }));
      setCategories([{ name: 'Semua', slug: '' }, ...data]);
      
      const qBanners = query(collection(db, 'banners'), where('status', '==', 'active'));
      const snapBanners = await getDocs(qBanners);
      setBanners(snapBanners.docs.map(d => ({ id: d.id, ...d.data() })));
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch(e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'site');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setSiteSettings(snap.data() as any);
        }
      } catch (e) {
        console.error('Error fetching settings:', e);
      }
    };
    
    let unsubscribeArticles: any = null;

    const filterPublished = (article: any) => {
      const now = new Date();
      if (article.status === 'draft') return false;
      if (article.status === 'scheduled') {
        const p = article.publishedAt?.toDate ? article.publishedAt.toDate() : (article.publishedAt ? new Date(article.publishedAt) : null);
        if (p) return p <= now;
        const s = article.scheduledAt ? new Date(article.scheduledAt) : null;
        if (s) return s <= now;
        return false;
      }
      return true; // Loloskan semua yang bukan draft atau belum waktunya
    };

    const fetchArticlesRealtime = () => {
      try {
        const q = query(
          collection(db, 'articles'), 
          orderBy('publishedAt', 'desc'), 
          limit(50)
        );
        unsubscribeArticles = onSnapshot(q, (snapshot) => {
          const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          const published = data.filter(filterPublished);
          setRawArticles(published);

        // Ekstrak tags untuk Topik Hangat seperti di portal web
        const topicCounts: Record<string, number> = {};
        const tagDisplays: Record<string, string> = {};
        
        published.slice(0, 15).forEach((article: any) => {
           const rawTags = article.tags || [];
           const tags = typeof rawTags === 'string' ? rawTags.split(',') : rawTags;
           if (Array.isArray(tags)) {
             tags.forEach(tag => {
               if (typeof tag !== 'string') return;
               const cleanTag = tag.trim();
               if (cleanTag && cleanTag.length > 2) {
                 const key = cleanTag.toLowerCase();
                 topicCounts[key] = (topicCounts[key] || 0) + 1;
                 if (!tagDisplays[key] || cleanTag === cleanTag.toUpperCase()) {
                   tagDisplays[key] = cleanTag;
                 }
               }
             });
           }
        });

        const sortedTopics = Object.entries(topicCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(entry => `#${tagDisplays[entry[0]].replace(/\\s+/g, '')}`);
          
        if (sortedTopics.length > 0) {
          setHotTopics(sortedTopics);
        }
        }, (error) => {
          console.error("onSnapshot error:", error);
        }); // Penutup onSnapshot

      } catch (e) {
        console.error('Error fetching articles:', e);
      }
    };

    const fetchCategories = async () => {
      try {
        const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
        const snap = await getDocs(q);
        const data = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter(cat => cat.active !== false)
          .map(cat => ({ name: cat.name, slug: cat.slug }));
        
        // Tambahkan "Semua" di awal
        setCategories([{ name: 'Semua', slug: '' }, ...data]);
      } catch (e) {
        console.error('Error fetching categories:', e);
      }
    };

    const fetchBanners = async () => {
      try {
        const qBanners = query(collection(db, 'banners'), where('status', '==', 'active'));
        const snapBanners = await getDocs(qBanners);
        setBanners(snapBanners.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Error fetching banners:', e);
      }
    };

    fetchSettings();
    fetchCategories();
    fetchBanners();
    fetchArticlesRealtime();

    return () => {
      if (unsubscribeArticles) unsubscribeArticles();
    };
  }, []);

  const {
    BERITA_TERKINI,
    FEATURED_ARTICLE,
    RELATED_ARTICLES,
    BERITA_LIST,
    BERITA_PILIHAN,
    LATEST_NEWS
  } = useMemo(() => {
    const mapped = rawArticles.map(mapArticle);
    
    // Berita Pilihan (Editor's Choice)
    const headlines = rawArticles.filter(a => a.isHeadline).map(mapArticle);
    const pilihan = headlines.length >= 5 
      ? headlines.slice(0, 5) 
      : mapped.slice(15, 20); // Fallback

    // Urutan Berita Terbaru Secara Natural (Sesuai Waktu Publish)
    const terkini = mapped.slice(0, 5);
    const featured = mapped[5];
    const related = mapped.slice(6, 8);
    const list = mapped.slice(8, 13);
    const latest = mapped.slice(13, 28);
    
    return {
      BERITA_TERKINI: terkini || [],
      FEATURED_ARTICLE: featured || null,
      RELATED_ARTICLES: related || [],
      BERITA_LIST: list || [],
      BERITA_PILIHAN: pilihan || [],
      LATEST_NEWS: latest || []
    };
  }, [rawArticles]);

  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (BERITA_TERKINI.length === 0) return;
    const interval = setInterval(() => {
      let nextIndex = currentIndex + 1;
      if (nextIndex >= BERITA_TERKINI.length) {
        nextIndex = 0;
      }
      setCurrentIndex(nextIndex);
      if (flatListRef.current) {
        flatListRef.current.scrollToIndex({ 
          index: nextIndex, 
          animated: true,
          viewPosition: 0,
          viewOffset: 16 
        });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [currentIndex, BERITA_TERKINI.length]);

  const dyn = {
    bg: { backgroundColor: colors.background },
    card: { backgroundColor: colors.card },
    textMain: { color: colors.text },
    textMuted: { color: colors.textSecondary },
    borderBottom: { borderBottomColor: colors.border },
    divider: { backgroundColor: colors.border },
    headerIcon: { borderColor: colors.border },
    iconColor: isDarkMode ? '#f8fafc' : '#000',
    hotTopicText: { color: isDarkMode ? '#cbd5e1' : '#475569' },
    bottomBanner: { backgroundColor: isDarkMode ? 'rgba(30,41,59,0.95)' : 'rgba(241,245,249,0.95)' },
    mixedCardBg: { backgroundColor: isDarkMode ? colors.card : '#f1f5f9' },
  };

  return (
    <SafeAreaView style={[styles.safeArea, dyn.bg]} edges={Platform.OS === 'android' ? ['right', 'bottom', 'left'] : undefined}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={isDarkMode ? colors.card : "#ffffff"}
        translucent={false}
      />
      {/* HEADER UTAMA */}
      <View style={[styles.headerContainer, dyn.card]}>
        <View style={styles.logoContainer}>
          {siteSettings.logoUrl ? (
            <Image 
              source={{ uri: siteSettings.logoUrl }} 
              style={{ height: 40, width: 40, marginRight: 6 }} 
              resizeMode="contain" 
            />
          ) : null}
          <Text style={[styles.logoText, dyn.textMain]}>
            {siteSettings.siteName?.split(' ')[0]?.toLowerCase()}
            {siteSettings.siteName?.split(' ').length > 1 && (
              <Text style={styles.logoTextOrange}>
                {siteSettings.siteName?.split(' ').slice(1).join('').toLowerCase()}
              </Text>
            )}
          </Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={[styles.iconButton, dyn.headerIcon]} onPress={() => router.push('/search')}>
            <Ionicons name="search-outline" size={22} color={dyn.iconColor} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconButton, dyn.headerIcon]} onPress={() => router.push('/profile')}>
            <Ionicons name="person-outline" size={20} color={dyn.iconColor} />
          </TouchableOpacity>
        </View>
      </View>

      {/* NAVIGASI KATEGORI (Bar Biru) Dibuat Sticky */}
      <View style={styles.categoryBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {categories.map((cat, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.categoryItem}
              onPress={() => router.push(`/category/${cat.slug || 'semua'}`)}
            >
              <Text style={styles.categoryText}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        style={[styles.container, dyn.bg]} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={['#1b61d1']} 
            tintColor={isDarkMode ? '#ffffff' : '#1b61d1'} 
          />
        }
      >
        
        {/* TOPIK HANGAT */}
        <View style={[styles.hotTopicContainer, dyn.card, dyn.borderBottom]}>
          <View style={styles.hotTopicLabel}>
            <Text style={styles.hotTopicLabelText}>TOPIK HANGAT</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hotTopicScroll}>
            {hotTopics.map((topic, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.hotTopicItem}
                onPress={() => router.push({ pathname: '/search', params: { q: topic.replace('#', '') } })}
              >
                <Ionicons name="trending-up" size={16} color="#1b61d1" style={{ marginRight: 4 }} />
                <Text style={[styles.hotTopicText, dyn.hotTopicText]}>{topic}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* HEADER BANNER */}
        {headerBanners.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            {headerBanners.map(b => (
              <TouchableOpacity key={b.id} onPress={() => b.targetUrl && Linking.openURL(b.targetUrl)} activeOpacity={0.9} style={{ marginBottom: 10 }}>
                <Image source={{ uri: b.imageUrl }} style={{ width: '100%', height: 60, borderRadius: 8, backgroundColor: '#e2e8f0' }} resizeMode="cover" />
                <Text style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 9, paddingHorizontal: 4, borderRadius: 4 }}>SPONSOR</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* KORUSEL BERITA TERKINI (Versi Mungil) */}
        <FlatList
          ref={flatListRef}
          data={BERITA_TERKINI}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.terkiniScroll}
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => item.videoUrl ? router.push('/video') : router.push(`/article/${item.id}`)} style={styles.terkiniCard} activeOpacity={0.9}>
              <ImageBackground source={{ uri: item.image }} style={styles.terkiniImage} resizeMode="cover">
                <View style={styles.terkiniOverlay}>
                  <View style={[styles.terkiniBadge, { backgroundColor: item.videoUrl ? 'red' : '#3b82f6' }]}>
                    <Text style={styles.terkiniBadgeText}>{item.videoUrl ? 'VIDEO' : 'TERKINI'}</Text>
                  </View>
                  <View style={styles.terkiniTextContainer}>
                    <Text style={styles.terkiniTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.terkiniDate}>{item.date}</Text>
                  </View>
                </View>
                {item.videoUrl && (
                  <View style={{ position: 'absolute', top: '35%', left: '35%', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 8, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="play" size={20} color="white" style={{ marginLeft: 2 }} />
                  </View>
                )}
              </ImageBackground>
            </TouchableOpacity>
          )}
        />

        {/* ARTIKEL UTAMA (FEATURED) */}
        {FEATURED_ARTICLE && (
          <View style={styles.featuredContainer}>
            <View style={[styles.featuredCard, dyn.card]}>
              <TouchableOpacity onPress={() => router.push(`/article/${FEATURED_ARTICLE.id}`)} activeOpacity={0.9}>
                <View style={styles.featuredImageContainer}>
                  <Image source={{ uri: FEATURED_ARTICLE.image }} style={styles.featuredImage} />
                  <View style={styles.featuredOverlay}>
                    <Text style={styles.featuredTitle} numberOfLines={3}>{FEATURED_ARTICLE.title}</Text>
                    <Text style={styles.featuredAuthor}>{FEATURED_ARTICLE.category?.toUpperCase() || 'REDAKSI'} | {FEATURED_ARTICLE.date}</Text>
                  </View>
                </View>
              </TouchableOpacity>
              {RELATED_ARTICLES.length > 0 && (
                <View style={styles.relatedBox}>
                  <Text style={styles.relatedTitle}>TERKAIT</Text>
                  <View style={styles.relatedList}>
                    {RELATED_ARTICLES.map(related => (
                      <TouchableOpacity key={`related-${related.id}`} style={{ flex: 1, marginRight: 8 }} onPress={() => router.push(`/article/${related.id}`)}>
                        <Text style={[styles.relatedItem, { marginRight: 0 }]} numberOfLines={2}>
                          • {related.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* --- DAFTAR BERITA STANDAR (List) --- */}
        <View style={styles.bottomSectionHeader}>
          <Text style={[styles.bottomSectionTitle, dyn.textMain]}>Berita Terbaru</Text>
        </View>
        <View style={styles.listContainer}>
          {BERITA_LIST.map((item, index) => (
            <View key={item.id}>
              <TouchableOpacity onPress={() => router.push(`/article/${item.id}`)} style={styles.listRow} activeOpacity={0.7}>
                <View style={styles.listTextContainer}>
                  <Text style={[styles.listTitle, dyn.textMain]} numberOfLines={3}>{item.title}</Text>
                  <Text style={styles.listDate}>{item.date}</Text>
                </View>

                {/* Gambar selalu di kanan sesuai screenshot */}
                <Image source={{ uri: item.image }} style={styles.listImage} />
              </TouchableOpacity>
              
              {/* Garis pembatas tipis di bawah setiap item, kecuali item terakhir */}
              {index !== BERITA_LIST.length - 1 && <View style={[styles.divider, dyn.divider]} />}
            </View>
          ))}
        </View>

        {/* FEED BANNER (Diterjemahkan dari Sidebar Web) */}
        {feedBanners.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: 16, marginBottom: 8 }}>
            {feedBanners.map(b => (
              <TouchableOpacity key={b.id} onPress={() => b.targetUrl && Linking.openURL(b.targetUrl)} activeOpacity={0.9} style={{ marginBottom: 10 }}>
                <Image source={{ uri: b.imageUrl }} style={{ width: '100%', height: 90, borderRadius: 8, backgroundColor: '#e2e8f0' }} resizeMode="cover" />
                <Text style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 9, paddingHorizontal: 4, borderRadius: 4 }}>IKLAN SPONSOR</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* SECTION SEPERTI PALING ATAS (Korusel Mungil) */}
        <View style={styles.bottomSectionHeader}>
          <Text style={[styles.bottomSectionTitle, dyn.textMain]}>Berita Pilihan</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.terkiniScroll, { paddingVertical: 0, paddingBottom: 8 }]}>
          {BERITA_PILIHAN.map((item) => (
            <TouchableOpacity onPress={() => router.push(`/article/${item.id}`)} key={`bottom-${item.id}`} style={styles.bottomCard} activeOpacity={0.9}>
              <ImageBackground source={{ uri: item.image }} style={styles.terkiniImage} resizeMode="cover">
                <View style={styles.bottomOverlay}>
                  <View style={styles.terkiniBadge}>
                    <Text style={styles.terkiniBadgeText}>PILIHAN</Text>
                  </View>
                  <View style={[styles.bottomTextContainer, dyn.bottomBanner]}>
                    <Text style={[styles.bottomTitle, dyn.textMain]} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.bottomDate}>{item.date}</Text>
                  </View>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* SECTION BERITA TERBARU (MIXED LAYOUT) */}
        <View style={styles.bottomSectionHeader}>
          <Text style={[styles.bottomSectionTitle, dyn.textMain]}>Lebih Banyak Berita</Text>
        </View>
        <View style={styles.mixedListContainer}>
          {LATEST_NEWS.map((item, index) => {
            if (index === 0) {
              return (
                <TouchableOpacity onPress={() => router.push(`/article/${item.id}`)} key={`latest-${item.id}`} style={[styles.mixedCardFirst, dyn.mixedCardBg]} activeOpacity={0.8}>
                  <View style={styles.mixedCardFirstText}>
                    <Text style={[styles.mixedCardFirstTitle, dyn.textMain]} numberOfLines={3}>{item.title}</Text>
                    <Text style={styles.mixedCardFirstDate}>{item.date}</Text>
                  </View>
                  <Image source={{ uri: item.image }} style={styles.mixedCardFirstImage} />
                </TouchableOpacity>
              );
            } else {
              return (
                <TouchableOpacity onPress={() => router.push(`/article/${item.id}`)} key={`latest-${item.id}`} style={styles.mixedListItem} activeOpacity={0.7}>
                  <Image source={{ uri: item.image }} style={styles.mixedListImage} />
                  <View style={styles.mixedListText}>
                    <Text style={[styles.mixedListTitle, dyn.textMain]} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.mixedListDate}>{item.date}</Text>
                  </View>
                </TouchableOpacity>
              );
            }
          })}
        </View>

        {/* Ruang kosong di bawah untuk Bottom Navigation bar nanti */}
        <View style={{ height: 160 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
// Lebar layar dikurangi padding kiri-kanan (32) dan gap antar 3 kartu (24), lalu dibagi 3
const CARD_WIDTH = (width - 32 - 24) / 3;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    marginRight: 6,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '900', // Tambah tebal agar seimbang dengan ukuran baru
    color: '#000',
  },
  logoTextOrange: {
    color: '#1b61d1',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBar: {
    backgroundColor: '#1b61d1',
    paddingVertical: 12,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 24,
  },
  categoryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '400',
  },
  categoryItem: {
  },
  hotTopicContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  hotTopicLabel: {
    backgroundColor: '#1b61d1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 10,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  hotTopicLabelText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  hotTopicScroll: {
    gap: 16,
    paddingRight: 16,
  },
  hotTopicItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hotTopicText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  terkiniScroll: {
    padding: 16,
  },
  terkiniCard: {
    width: CARD_WIDTH,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ccc',
  },
  terkiniImage: {
    width: '100%',
    height: '100%',
  },
  terkiniOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
    padding: 8, // Padding diperkecil
  },
  terkiniBadge: {
    backgroundColor: '#3b82f6',
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  terkiniBadgeText: {
    color: '#fff',
    fontSize: 8, // Font diperkecil
    fontWeight: 'bold',
  },
  terkiniTextContainer: {
    marginTop: 'auto',
  },
  terkiniTitle: {
    color: '#fff',
    fontSize: 10, // Font judul diperkecil
    fontWeight: 'bold',
    marginBottom: 4,
  },
  terkiniDate: {
    color: '#e2e8f0',
    fontSize: 8,
  },
  featuredContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  featuredCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  featuredImageContainer: {
    position: 'relative',
    height: 220, // Direndahkan sesuai permintaan
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  featuredTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 4,
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  featuredAuthor: {
    color: '#f8fafc',
    fontSize: 12,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  relatedBox: {
    backgroundColor: '#1b61d1',
    padding: 16,
  },
  relatedTitle: {
    color: '#fcd34d',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  relatedList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  relatedItem: {
    color: '#fff',
    fontSize: 12,
    flex: 1,
    marginRight: 8,
    lineHeight: 18,
  },

  // STYLES BARU UNTUK LIST STANDAR
  listContainer: {
    paddingHorizontal: 16,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  listImage: {
    width: 100,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    marginLeft: 12,
  },
  listTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
    lineHeight: 20,
  },
  listDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    width: '100%',
  },
  bottomSectionHeader: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  bottomSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  bottomCard: {
    width: (width - 48) / 2, // Tampil pas 2 kartu (padding kiri 16 + padding kanan 16 + gap 16 = 48)
    height: 190,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ccc',
    marginRight: 16,
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    padding: 10,
  },
  bottomTitle: {
    color: '#1e293b', 
    fontSize: 12, // Font diperbesar sedikit
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bottomDate: {
    color: '#64748b',
    fontSize: 10,
  },
  bottomTextContainer: {
    marginTop: 'auto',
    backgroundColor: 'rgba(241, 245, 249, 0.95)', // Banner warna abu-abu (grey) terang
    padding: 8,
    marginHorizontal: -10,
    marginBottom: -10,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  mixedListContainer: {
    paddingHorizontal: 16,
    marginTop: 24,
    paddingBottom: 20,
  },
  mixedCardFirst: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mixedCardFirstText: {
    flex: 1,
    paddingRight: 12,
    justifyContent: 'space-between',
  },
  mixedCardFirstTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
    lineHeight: 22,
  },
  mixedCardFirstDate: {
    fontSize: 12,
    color: '#64748b',
  },
  mixedCardFirstImage: {
    width: 100,
    height: 70,
    borderRadius: 8,
  },
  mixedListItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  mixedListImage: {
    width: 90,
    height: 75,
    borderRadius: 8,
    marginRight: 12,
  },
  mixedListText: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  mixedListTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
    lineHeight: 20,
  },
  mixedListDate: {
    fontSize: 12,
    color: '#64748b',
  }
});
