import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ImageBackground, StatusBar, Platform, FlatList, Dimensions, RefreshControl, Linking, Animated, ToastAndroid, Easing, useWindowDimensions } from 'react-native';
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

const HOME_TABS = [
  { id: 'terkini', label: 'Terkini' },
  { id: 'rekomendasi', label: 'Rekomendasi' },
  { id: 'populer', label: 'Populer' },
  { id: 'redaksi', label: 'Meja Redaksi' },
  { id: 'komentar', label: 'Komentar' },
];

const getYouTubeId = (input: string) => {
  if (!input || typeof input !== 'string') return null;
  const regExp = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const match = input.match(regExp);
  return match ? match[1] : null;
};

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

  let cover = a.coverImage || a.imageUrl;
  if (!cover || cover.includes('unsplash')) {
    const ytId = getYouTubeId(a.videoUrl) || getYouTubeId(a.youtubeUrl) || getYouTubeId(a.video) || getYouTubeId(a.content);
    if (ytId) {
      cover = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    }
  }

  return {
    id: a.id,
    title: a.title || 'Tanpa Judul',
    date: dateStr,
    image: cover || 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=400&q=80',
    category: a.category || 'Berita',
    slug: a.slug || a.id,
    videoUrl: hasVideo,
    views: a.views || 0,
  };
};

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
  return true;
};

const PulsingDot = () => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <Animated.View style={{
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#ef4444',
      marginRight: 6,
      opacity: pulseAnim,
      alignSelf: 'center',
    }} />
  );
};


export default function Home() {
  const router = useRouter();
  const { isDarkMode, colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [categories, setCategories] = useState<{ name: string, slug: string }[]>([]);
  const [activeTab, setActiveTab] = useState<'terkini' | 'rekomendasi' | 'populer' | 'redaksi' | 'komentar'>('terkini');
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(['terkini']));
  const [allApprovedComments, setAllApprovedComments] = useState<any[]>([]);
  const scrollViewRef = useRef<any>(null);
  const horizontalScrollRef = useRef<ScrollView>(null);
  const tabBarScrollRef = useRef<ScrollView>(null);

  const markTabVisited = (tabId: string) => {
    setVisitedTabs(prev => {
      if (prev.has(tabId)) return prev;
      const next = new Set(prev);
      next.add(tabId);
      return next;
    });
  };

  const handleTabChange = (tabId: any) => {
    markTabVisited(tabId);
    setActiveTab(tabId);
    const index = HOME_TABS.findIndex(t => t.id === tabId);
    if (index !== -1 && horizontalScrollRef.current) {
      horizontalScrollRef.current.scrollTo({
        x: index * screenWidth,
        animated: true,
      });
    }
  };

  const handleHorizontalScrollEnd = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    if (index >= 0 && index < HOME_TABS.length) {
      const nextTab = HOME_TABS[index].id as any;
      markTabVisited(nextTab);
      if (nextTab !== activeTab) {
        setActiveTab(nextTab);
      }
    }
  };

  useEffect(() => {
    const index = HOME_TABS.findIndex(t => t.id === activeTab);
    if (index !== -1 && tabBarScrollRef.current) {
      const approxTabWidth = 100;
      const targetX = Math.max(0, index * approxTabWidth - screenWidth / 2 + approxTabWidth / 2);
      tabBarScrollRef.current.scrollTo({ x: targetX, animated: true });
    }
  }, [activeTab, screenWidth]);

  const [siteSettings, setSiteSettings] = useState({
    siteName: 'Bedain News',
    logoUrl: '',
  });
  const [rawArticles, setRawArticles] = useState<any[]>([]);
  const [hotTopics, setHotTopics] = useState<string[]>(HOT_TOPICS);
  const [refreshing, setRefreshing] = useState(false);
  const [banners, setBanners] = useState<any[]>([]);
  const [dbRedaksiArticles, setDbRedaksiArticles] = useState<any[]>([]);

  const headerBanners = banners.filter(b => b.slot === 'header');
  const feedBanners = banners.filter(b => b.slot === 'sidebar');

  const fetchRedaksi = async () => {
    try {
      let docs: any[] = [];
      try {
        const qR = query(
          collection(db, 'articles'),
          where('category', 'in', ['Meja Redaksi', 'meja-redaksi', 'Meja-Redaksi']),
          where('status', '==', 'published'),
          orderBy('publishedAt', 'desc'),
          limit(30)
        );
        const snapR = await getDocs(qR);
        docs = snapR.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch {
        try {
          const qR2 = query(
            collection(db, 'articles'),
            where('category', '==', 'Meja Redaksi'),
            where('status', '==', 'published'),
            orderBy('publishedAt', 'desc'),
            limit(30)
          );
          const snapR2 = await getDocs(qR2);
          docs = snapR2.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch {
          try {
            const qR3 = query(
              collection(db, 'articles'),
              where('category', 'in', ['Meja Redaksi', 'meja-redaksi']),
              limit(50)
            );
            const snapR3 = await getDocs(qR3);
            docs = snapR3.docs.map(d => ({ id: d.id, ...d.data() }));
          } catch {
            const qR4 = query(
              collection(db, 'articles'),
              where('category', '==', 'Meja Redaksi'),
              limit(50)
            );
            const snapR4 = await getDocs(qR4);
            docs = snapR4.docs.map(d => ({ id: d.id, ...d.data() }));
          }
        }
      }

      const validDocs = docs.filter(filterPublished).map(mapArticle);
      setDbRedaksiArticles(validDocs);
    } catch (err) {
      console.error('Error fetching redaksi articles:', err);
    }
  };

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
      
      const qComments = query(collection(db, 'comments'), orderBy('createdAt', 'desc'), limit(50));
      const snapComments = await getDocs(qComments);
      const allComments = snapComments.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const validComments = allComments.filter((c: any) => c.status === 'approved');
      setAllApprovedComments(validComments);

      await fetchRedaksi();

      await new Promise(resolve => setTimeout(resolve, 1500));
      if (Platform.OS === 'android') {
        ToastAndroid.show('Berita berhasil diperbarui', ToastAndroid.SHORT);
      }
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

    const fetchComments = async () => {
      try {
        const q = query(collection(db, 'comments'), orderBy('createdAt', 'desc'), limit(50));
        const snap = await getDocs(q);
        const allComments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const validComments = allComments.filter((c: any) => c.status === 'approved');
        setAllApprovedComments(validComments);
      } catch (e) {
        console.error('Error fetching comments:', e);
      }
    };

    fetchSettings();
    fetchCategories();
    fetchBanners();
    fetchComments();
    fetchRedaksi();
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
    LATEST_NEWS,
    BREAKING_NEWS,
    VIDEO_ARTICLES,
    REKOMENDASI_ARTICLES,
    POPULER_ARTICLES,
    REDAKSI_ARTICLES
  } = useMemo(() => {
    const allMapped = rawArticles.map(mapArticle);
    const breaking = rawArticles.filter(a => a.isBreakingNews).map(mapArticle);
    
    // Urutan Berita Terbaru Secara Natural (Sesuai Waktu Publish)
    const mainFeed = allMapped;

    const terkini = mainFeed.slice(0, 5);
    const featured = mainFeed[5];
    const related = mainFeed.slice(6, 8);
    const list = mainFeed.slice(8, 13);
    const latest = mainFeed.slice(13, 28);
    
    // Video Articles: Diambil dari artikel yang memiliki video
    const filteredVideos = allMapped.filter(a => a.videoUrl);
    // Fallback jika belum banyak artikel bervideo di database
    const videoArticles = filteredVideos.length > 0
      ? filteredVideos.slice(0, 10)
      : allMapped.slice(0, 6).map(a => ({ ...a, videoUrl: true }));

    // Tab Rekomendasi
    const rekomendasiArticles = allMapped.slice(0, 15);

    // Tab Populer
    const populerArticles = [...allMapped].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 20);

    // Tab Meja Redaksi: Diambil murni dari kategori "Meja Redaksi"
    const localRedaksi = allMapped.filter(a => {
      const cat = (a.category || '').trim().toLowerCase();
      return cat === 'meja redaksi' || cat === 'meja-redaksi';
    });

    const combinedRedaksiMap = new Map();
    [...localRedaksi, ...dbRedaksiArticles].forEach(item => {
      if (item && item.id && !combinedRedaksiMap.has(item.id)) {
        combinedRedaksiMap.set(item.id, item);
      }
    });
    const redaksiArticles = Array.from(combinedRedaksiMap.values());
    
    return {
      BERITA_TERKINI: terkini || [],
      FEATURED_ARTICLE: featured || null,
      RELATED_ARTICLES: related || [],
      BERITA_LIST: list || [],
      LATEST_NEWS: latest || [],
      BREAKING_NEWS: breaking || [],
      VIDEO_ARTICLES: videoArticles || [],
      REKOMENDASI_ARTICLES: rekomendasiArticles || [],
      POPULER_ARTICLES: populerArticles || [],
      REDAKSI_ARTICLES: redaksiArticles || []
    };
  }, [rawArticles, dbRedaksiArticles]);

  const flatListRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tickerIndex, setTickerIndex] = useState(0);

  const tickerItems = useMemo(() => {
    const items: any[] = [];
    if (BREAKING_NEWS && BREAKING_NEWS.length > 0) {
      BREAKING_NEWS.forEach((article: any) => items.push({ type: 'breaking', data: article }));
    }
    if (hotTopics && hotTopics.length > 0) {
      hotTopics.forEach((topic: any) => items.push({ type: 'topic', data: topic }));
    }
    return items.length > 0 ? items : [{ type: 'topic', data: '#BeritaTerbaru' }];
  }, [BREAKING_NEWS, hotTopics]);

  // 0 = tampil, -1 = keluar ke atas, 1 = siap masuk dari bawah
  const tickerAnim = useRef(new Animated.Value(0)).current;
  // Ticker berhenti sementara selama jari menahan item (agar judul panjang sempat dibaca)
  const tickerPaused = useRef(false);

  useEffect(() => {
    if (tickerItems.length <= 1) return;
    const interval = setInterval(() => {
      if (tickerPaused.current) return;
      Animated.timing(tickerAnim, {
        toValue: -1,
        duration: 250,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        setTickerIndex(prev => (prev + 1) % tickerItems.length);
        tickerAnim.setValue(1);
        Animated.timing(tickerAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [tickerItems.length, tickerAnim]);

  const tickerTranslateY = tickerAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: [-12, 0, 12] });
  const tickerOpacity = tickerAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] });
  const pauseTicker = () => { tickerPaused.current = true; };
  const resumeTicker = () => { tickerPaused.current = false; };

  // Index aman: jika daftar menyusut (realtime), modulo mencegah akses di luar batas
  const currentTicker = tickerItems[tickerIndex % tickerItems.length];

  useEffect(() => {
    if (activeTab !== 'terkini' || BERITA_TERKINI.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const nextIndex = (prev + 1) % BERITA_TERKINI.length;
        if (flatListRef.current) {
          try {
            flatListRef.current.scrollToIndex({ 
              index: nextIndex, 
              animated: true,
              viewPosition: 0,
              viewOffset: 16 
            });
          } catch (_) {}
        }
        return nextIndex;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [activeTab, BERITA_TERKINI.length]);

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
    videoSectionBg: {
      backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
      borderColor: isDarkMode ? '#1e293b' : '#e2e8f0',
    },
    videoSectionTitle: {
      color: isDarkMode ? '#f8fafc' : '#0f172a',
    },
    videoSectionSub: {
      color: isDarkMode ? '#94a3b8' : '#64748b',
    },
    videoMoreBtn: {
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
    },
    videoMoreTxt: {
      color: isDarkMode ? '#60a5fa' : '#2563eb',
    },
    videoCardBg: {
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },
    videoCardTitle: {
      color: isDarkMode ? '#f1f5f9' : '#0f172a',
    },
    tabBarBg: {
      backgroundColor: isDarkMode ? colors.card : '#1b61d1',
      borderBottomColor: isDarkMode ? colors.border : '#1550ac',
    },
    tabBarItemActive: {
      backgroundColor: isDarkMode ? '#2563eb' : '#ffffff',
    },
    tabBarItemInactive: {
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.18)',
    },
    tabTextActive: {
      color: isDarkMode ? '#ffffff' : '#1b61d1',
      fontWeight: '800' as const,
    },
    tabTextInactive: {
      color: isDarkMode ? '#94a3b8' : 'rgba(255,255,255,0.92)',
      fontWeight: '600' as const,
    },
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
          <Text style={[styles.logoText, { color: colors.text }]}>
            {siteSettings.siteName?.split(' ')[0]?.toLowerCase() || 'bedain'}
            <Text style={styles.logoTextOrange}>
              {siteSettings.siteName?.split(' ').length > 1 ? siteSettings.siteName.split(' ').slice(1).join('').toLowerCase() : 'news'}
            </Text>
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

      {/* NAVIGASI TAB UTAMA (Pengganti Menu Kategori Atas) */}
      <View style={[styles.tabBarContainer, dyn.tabBarBg]}>
        <ScrollView 
          ref={tabBarScrollRef}
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.tabBarScroll}
        >
          {HOME_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => handleTabChange(tab.id)}
                style={[
                  styles.tabBarItem,
                  isActive ? dyn.tabBarItemActive : dyn.tabBarItemInactive
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabBarText, isActive ? dyn.tabTextActive : dyn.tabTextInactive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* KONTEN TAB UTAMA DENGAN SWIPE HORIZONTAL (PAGING) */}
      <ScrollView
        ref={horizontalScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleHorizontalScrollEnd}
        directionalLockEnabled={true}
        overScrollMode="never"
        removeClippedSubviews={Platform.OS === 'android'}
        nestedScrollEnabled={true}
        style={{ flex: 1 }}
      >
        {/* TAB 1: TERKINI */}
        <View style={{ width: screenWidth, flex: 1 }}>
          <Animated.ScrollView 
            ref={scrollViewRef}
            nestedScrollEnabled={true}
            directionalLockEnabled={true}
            overScrollMode="never"
            removeClippedSubviews={Platform.OS === 'android'}
            style={[styles.container, dyn.bg]} 
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh} 
                colors={['#1b61d1']} 
                tintColor={isDarkMode ? '#ffffff' : '#1b61d1'} 
              />
            }
          >
            {/* TOPIK HANGAT & BREAKING NEWS */}
            <View style={[styles.hotTopicContainer, dyn.card, dyn.borderBottom]}>
          <View style={[styles.hotTopicLabel, currentTicker.type === 'breaking' ? { backgroundColor: '#ef4444' } : {}]}>
            <Text style={styles.hotTopicLabelText}>{currentTicker.type === 'breaking' ? 'BREAKING NEWS' : 'TOPIK HANGAT'}</Text>
          </View>
          <Animated.View style={{ flex: 1, paddingRight: 16, opacity: tickerOpacity, transform: [{ translateY: tickerTranslateY }] }}>
            {currentTicker.type === 'breaking' ? (
              <TouchableOpacity 
                style={styles.hotTopicItem}
                onPressIn={pauseTicker}
                onPressOut={resumeTicker}
                onPress={() => currentTicker.data.videoUrl ? router.push(`/watch/${currentTicker.data.id}` as any) : router.push(`/article/${currentTicker.data.id}`)}
              >
                <PulsingDot />
                <Text style={[styles.hotTopicText, dyn.hotTopicText, { fontWeight: 'bold', flexShrink: 1 }]} numberOfLines={1}>{currentTicker.data.title}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.hotTopicItem}
                onPressIn={pauseTicker}
                onPressOut={resumeTicker}
                onPress={() => router.push({ pathname: '/search', params: { q: String(currentTicker.data).replace('#', '') } })}
              >
                <Ionicons name="trending-up" size={16} color="#1b61d1" style={{ marginRight: 4 }} />
                <Text style={[styles.hotTopicText, dyn.hotTopicText, { flexShrink: 1 }]} numberOfLines={1}>{currentTicker.data}</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </View>

        {/* HEADER BANNER */}
        {headerBanners.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            {headerBanners.map((b, index) => {
              // Calculate a simple parallax translation for the banner
              // The banner is near the top (offset maybe ~100-200), so we just map scrollY
              const translateY = scrollY.interpolate({
                inputRange: [-100, 0, 400],
                outputRange: [-20, 0, 80],
                extrapolate: 'clamp',
              });
              
              return (
                <TouchableOpacity key={b.id} onPress={() => b.targetUrl && Linking.openURL(b.targetUrl)} activeOpacity={0.9} style={{ marginBottom: index === headerBanners.length - 1 ? 0 : 10, overflow: 'hidden', backgroundColor: '#e2e8f0' }}>
                  <Animated.Image source={{ uri: b.imageUrl }} style={{ width: '100%', aspectRatio: 4 / 3, transform: [{ translateY }, { scale: 1.2 }] }} resizeMode="cover" />
                  <Text style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 9, paddingHorizontal: 4, borderRadius: 4 }}>SPONSOR</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* KORUSEL BERITA TERKINI (Versi Mungil) */}
        <FlatList
          ref={flatListRef}
          data={BERITA_TERKINI}
          keyExtractor={(item) => item.id}
          horizontal
          nestedScrollEnabled={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.terkiniScroll}
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => item.videoUrl ? router.push(`/watch/${item.id}` as any) : router.push(`/article/${item.id}`)} style={styles.terkiniCard} activeOpacity={0.9}>
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
              <TouchableOpacity onPress={() => FEATURED_ARTICLE.videoUrl ? router.push(`/watch/${FEATURED_ARTICLE.id}` as any) : router.push(`/article/${FEATURED_ARTICLE.id}`)} activeOpacity={0.9}>
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
                      <TouchableOpacity key={`related-${related.id}`} style={{ flex: 1, marginRight: 8 }} onPress={() => related.videoUrl ? router.push(`/watch/${related.id}` as any) : router.push(`/article/${related.id}`)}>
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
              <TouchableOpacity onPress={() => item.videoUrl ? router.push(`/watch/${item.id}` as any) : router.push(`/article/${item.id}`)} style={styles.listRow} activeOpacity={0.7}>
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

        
        {/* SECTION BERITA TERBARU (MIXED LAYOUT) */}
        <View style={styles.bottomSectionHeader}>
          <Text style={[styles.bottomSectionTitle, dyn.textMain]}>Lebih Banyak Berita</Text>
        </View>
        <View style={styles.mixedListContainer}>
          {LATEST_NEWS.map((item, index) => {
            const isFirst = index === 0;
            const isFifth = index === 4;
            const isFallbackTrigger = LATEST_NEWS.length < 5 && index === LATEST_NEWS.length - 1;
            const showVideoSection = (isFifth || isFallbackTrigger) && VIDEO_ARTICLES.length > 0;

            return (
              <Fragment key={`latest-frag-${item.id || index}`}>
                {isFirst ? (
                  <TouchableOpacity onPress={() => item.videoUrl ? router.push(`/watch/${item.id}` as any) : router.push(`/article/${item.id}`)} key={`latest-${item.id}`} style={[styles.mixedCardFirst, dyn.mixedCardBg]} activeOpacity={0.8}>
                    <View style={styles.mixedCardFirstText}>
                      <Text style={[styles.mixedCardFirstTitle, dyn.textMain]} numberOfLines={3}>{item.title}</Text>
                      <Text style={styles.mixedCardFirstDate}>{item.date}</Text>
                    </View>
                    <Image source={{ uri: item.image }} style={styles.mixedCardFirstImage} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => item.videoUrl ? router.push(`/watch/${item.id}` as any) : router.push(`/article/${item.id}`)} key={`latest-${item.id}`} style={styles.mixedListItem} activeOpacity={0.7}>
                    <Image source={{ uri: item.image }} style={styles.mixedListImage} />
                    <View style={styles.mixedListText}>
                      <Text style={[styles.mixedListTitle, dyn.textMain]} numberOfLines={2}>{item.title}</Text>
                      <Text style={styles.mixedListDate}>{item.date}</Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* SETELAH KARTU KE-5: TAMBAH SECTION BARU BLOK VIDEO */}
                {showVideoSection && (
                  <View style={[styles.videoSectionContainer, dyn.videoSectionBg]}>
                    <View style={styles.videoHeaderRow}>
                      <View style={styles.videoHeaderTitleWrap}>
                        <View style={styles.videoRedBadge}>
                          <Ionicons name="play" size={13} color="#ffffff" style={{ marginLeft: 2 }} />
                        </View>
                        <View>
                          <Text style={[styles.videoSectionTitle, dyn.videoSectionTitle]}>Video Pilihan</Text>
                          <Text style={[styles.videoSectionSubtitle, dyn.videoSectionSub]}>Tonton video berita terkini</Text>
                        </View>
                      </View>
                      <TouchableOpacity 
                        onPress={() => router.push('/(tabs)/video' as any)}
                        style={[styles.videoMoreButton, dyn.videoMoreBtn]}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.videoMoreText, dyn.videoMoreTxt]}>Lihat Semua</Text>
                        <Ionicons name="chevron-forward" size={13} color={dyn.videoMoreTxt.color} />
                      </TouchableOpacity>
                    </View>

                    <ScrollView 
                      horizontal 
                      nestedScrollEnabled={true}
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.videoScrollContent}
                    >
                      {VIDEO_ARTICLES.map((vid: any) => (
                        <TouchableOpacity
                          key={`video-card-${vid.id}`}
                          style={[styles.videoCard, dyn.videoCardBg]}
                          activeOpacity={0.85}
                          onPress={() => router.push(`/watch/${vid.id}` as any)}
                        >
                          <View style={styles.videoThumbContainer}>
                            <Image 
                              source={{ uri: vid.image }} 
                              style={styles.videoThumbImage}
                              resizeMode="cover"
                            />
                            {/* Overlay Tombol Play Glassmorphism */}
                            <View style={styles.videoPlayOverlay}>
                              <View style={styles.videoPlayCircle}>
                                <Ionicons name="play" size={18} color="#ffffff" style={{ marginLeft: 2 }} />
                              </View>
                            </View>
                            {/* Badge Merah VIDEO */}
                            <View style={styles.videoTagBadge}>
                              <Text style={styles.videoTagText}>VIDEO</Text>
                            </View>
                            {/* Badge Views */}
                            {vid.views > 0 && (
                              <View style={styles.videoViewsBadge}>
                                <Ionicons name="eye-outline" size={10} color="#ffffff" />
                                <Text style={styles.videoViewsText}>{vid.views}</Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.videoCardBody}>
                            <Text style={[styles.videoCardTitle, dyn.videoCardTitle]} numberOfLines={2}>
                              {vid.title}
                            </Text>
                            <View style={styles.videoCardMeta}>
                              <Text style={styles.videoCardCategory} numberOfLines={1}>{vid.category}</Text>
                              <Text style={[styles.videoCardDot, dyn.textMuted]}>•</Text>
                              <Text style={[styles.videoCardDate, dyn.textMuted]}>{vid.date}</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </Fragment>
            );
          })}
        </View>

            <View style={{ height: 160 }} />
          </Animated.ScrollView>
        </View>

        {/* TAB 2: REKOMENDASI */}
        <View style={{ width: screenWidth, flex: 1 }}>
          {visitedTabs.has('rekomendasi') ? (
            <ScrollView
              nestedScrollEnabled={true}
              directionalLockEnabled={true}
              overScrollMode="never"
              removeClippedSubviews={Platform.OS === 'android'}
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
              <View style={styles.tabContentWrapper}>
              {/* Hero Card Pertama */}
              {REKOMENDASI_ARTICLES[0] && (
                <TouchableOpacity 
                  style={[styles.recomHeroCard, dyn.card]} 
                  activeOpacity={0.85}
                  onPress={() => REKOMENDASI_ARTICLES[0].videoUrl ? router.push(`/watch/${REKOMENDASI_ARTICLES[0].id}` as any) : router.push(`/article/${REKOMENDASI_ARTICLES[0].id}`)}
                >
                  <Image source={{ uri: REKOMENDASI_ARTICLES[0].image }} style={styles.recomHeroImage} />
                  <View style={styles.recomHeroBody}>
                    <View style={styles.recomBadgeRow}>
                      <View style={styles.recomCategoryBadge}>
                        <Text style={styles.recomCategoryText}>{REKOMENDASI_ARTICLES[0].category?.toUpperCase() || 'PILIHAN'}</Text>
                      </View>
                      <Text style={[styles.recomHeroDate, dyn.textMuted]}>{REKOMENDASI_ARTICLES[0].date}</Text>
                    </View>
                    <Text style={[styles.recomHeroTitle, dyn.textMain]} numberOfLines={3}>{REKOMENDASI_ARTICLES[0].title}</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* List Rekomendasi Lainnya */}
              <View style={styles.recomListContainer}>
                {REKOMENDASI_ARTICLES.slice(1).map((item) => (
                  <TouchableOpacity
                    key={`recom-${item.id}`}
                    style={[styles.recomListItem, dyn.card]}
                    activeOpacity={0.8}
                    onPress={() => item.videoUrl ? router.push(`/watch/${item.id}` as any) : router.push(`/article/${item.id}`)}
                  >
                    <Image source={{ uri: item.image }} style={styles.recomListImage} />
                    <View style={styles.recomListBody}>
                      <Text style={styles.recomCategorySmall}>{item.category?.toUpperCase() || 'BERITA'}</Text>
                      <Text style={[styles.recomListTitle, dyn.textMain]} numberOfLines={2}>{item.title}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 }}>
                        <Ionicons name="time-outline" size={12} color={dyn.textMuted.color} />
                        <Text style={[styles.recomListDate, dyn.textMuted]}>{item.date}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={{ height: 160 }} />
          </ScrollView>
          ) : (
            <View style={{ flex: 1, backgroundColor: colors.background }} />
          )}
        </View>

        {/* TAB 3: POPULER */}
        <View style={{ width: screenWidth, flex: 1 }}>
          {visitedTabs.has('populer') ? (
            <ScrollView
              nestedScrollEnabled={true}
              directionalLockEnabled={true}
              overScrollMode="never"
              removeClippedSubviews={Platform.OS === 'android'}
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
              <View style={styles.tabContentWrapper}>
              {/* Juara #1 Terpopuler */}
              {POPULER_ARTICLES[0] && (
                <TouchableOpacity 
                  style={[styles.popularTopCard, dyn.card]} 
                  activeOpacity={0.85}
                  onPress={() => POPULER_ARTICLES[0].videoUrl ? router.push(`/watch/${POPULER_ARTICLES[0].id}` as any) : router.push(`/article/${POPULER_ARTICLES[0].id}`)}
                >
                  <Image source={{ uri: POPULER_ARTICLES[0].image }} style={styles.popularTopImage} />
                  <View style={styles.rankBadgeFirst}>
                    <Text style={styles.rankBadgeFirstText}>#1 TERPOPULER</Text>
                  </View>
                  <View style={styles.popularTopBody}>
                    <Text style={[styles.popularTopTitle, dyn.textMain]} numberOfLines={2}>{POPULER_ARTICLES[0].title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                      <Text style={[styles.recomListDate, dyn.textMuted]}>{POPULER_ARTICLES[0].date}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="eye" size={13} color="#f97316" />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#f97316' }}>{POPULER_ARTICLES[0].views || 0} pembaca</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {/* Peringkat #2 sampai seterusnya */}
              <View style={styles.popularRankList}>
                {POPULER_ARTICLES.slice(1).map((item, idx) => {
                  const rank = idx + 2;
                  return (
                    <TouchableOpacity
                      key={`pop-${item.id}`}
                      style={[styles.popularRankItem, dyn.card]}
                      activeOpacity={0.8}
                      onPress={() => item.videoUrl ? router.push(`/watch/${item.id}` as any) : router.push(`/article/${item.id}`)}
                    >
                      <View style={[styles.rankNumberBox, rank <= 3 ? styles.rankNumberTop : {}]}>
                        <Text style={[styles.rankNumberText, rank <= 3 ? { color: '#f97316' } : dyn.textMuted]}>
                          {rank < 10 ? `0${rank}` : rank}
                        </Text>
                      </View>
                      <View style={styles.popularRankContent}>
                        <Text style={styles.recomCategorySmall}>{item.category?.toUpperCase() || 'BERITA'}</Text>
                        <Text style={[styles.popularRankTitle, dyn.textMain]} numberOfLines={2}>{item.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <Ionicons name="eye-outline" size={12} color={dyn.textMuted.color} />
                          <Text style={[styles.recomListDate, dyn.textMuted]}>{item.views || 0} views</Text>
                          <Text style={dyn.textMuted}>•</Text>
                          <Text style={[styles.recomListDate, dyn.textMuted]}>{item.date}</Text>
                        </View>
                      </View>
                      <Image source={{ uri: item.image }} style={styles.popularRankThumb} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={{ height: 160 }} />
          </ScrollView>
          ) : (
            <View style={{ flex: 1, backgroundColor: colors.background }} />
          )}
        </View>

        {/* TAB 4: MEJA REDAKSI */}
        <View style={{ width: screenWidth, flex: 1 }}>
          {visitedTabs.has('redaksi') ? (
            <ScrollView
              nestedScrollEnabled={true}
              directionalLockEnabled={true}
              overScrollMode="never"
              removeClippedSubviews={Platform.OS === 'android'}
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
              <View style={styles.tabContentWrapper}>
              {/* Editorial Manifesto Box */}
              <View style={[styles.editorialBox, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: '#1b61d1' }]}>
                <Text style={[styles.editorialBoxText, dyn.textMain]}>
                  "Menyajikan fakta dengan independen, tajam, dan berimbang langsung dari ruang redaksi kami untuk pembaca cerdas."
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#1b61d1', marginTop: 8, textAlign: 'right' }}>— Dewan Redaksi Bedain News</Text>
              </View>

              {/* Daftar Artikel Redaksi */}
              {REDAKSI_ARTICLES.length === 0 ? (
                <View style={[styles.emptyCommentFeed, dyn.card, { marginTop: 12 }]}>
                  <Ionicons name="newspaper-outline" size={48} color={isDarkMode ? '#475569' : '#cbd5e1'} />
                  <Text style={[styles.emptyCommentTitle, dyn.textMain]}>Belum Ada Artikel Redaksi</Text>
                  <Text style={[styles.emptyCommentSub, dyn.textMuted]}>
                    Belum ada artikel yang diterbitkan pada kategori Meja Redaksi.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 14, marginTop: 10 }}>
                  {REDAKSI_ARTICLES.map((item) => (
                    <TouchableOpacity
                      key={`redaksi-${item.id}`}
                      style={[styles.editorialCard, dyn.card]}
                      activeOpacity={0.8}
                      onPress={() => item.videoUrl ? router.push(`/watch/${item.id}` as any) : router.push(`/article/${item.id}`)}
                    >
                      <Image source={{ uri: item.image }} style={styles.editorialCardImg} />
                      <View style={styles.editorialCardBody}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <View style={styles.editorialBadge}>
                            <Text style={styles.editorialBadgeText}>MEJA REDAKSI</Text>
                          </View>
                          <Text style={[styles.recomListDate, dyn.textMuted]}>{item.date}</Text>
                        </View>
                        <Text style={[styles.editorialCardTitle, dyn.textMain]} numberOfLines={3}>{item.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 }}>
                          <Ionicons name="pencil" size={12} color="#16a34a" />
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#16a34a' }}>Liputan Khusus Redaksi</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <View style={{ height: 160 }} />
          </ScrollView>
          ) : (
            <View style={{ flex: 1, backgroundColor: colors.background }} />
          )}
        </View>

        {/* TAB 5: KOMENTAR */}
        <View style={{ width: screenWidth, flex: 1 }}>
          {visitedTabs.has('komentar') ? (
            <ScrollView
              nestedScrollEnabled={true}
              directionalLockEnabled={true}
              overScrollMode="never"
              removeClippedSubviews={Platform.OS === 'android'}
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
              <View style={styles.tabContentWrapper}>
              {/* List Komentar Feed */}
              {allApprovedComments.length === 0 ? (
                <View style={[styles.emptyCommentFeed, dyn.card]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={48} color={isDarkMode ? '#475569' : '#cbd5e1'} />
                  <Text style={[styles.emptyCommentTitle, dyn.textMain]}>Belum Ada Komentar</Text>
                  <Text style={[styles.emptyCommentSub, dyn.textMuted]}>Jadilah pembaca pertama yang memberikan tanggapan di artikel kami!</Text>
                </View>
              ) : (
                <View style={{ gap: 14, marginTop: 8 }}>
                  {allApprovedComments.map((comment: any, idx: number) => {
                    let commentDate = 'Baru saja';
                    if (comment.createdAt) {
                      const d = typeof comment.createdAt.toDate === 'function' ? comment.createdAt.toDate() : new Date(comment.createdAt);
                      commentDate = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                    }

                    return (
                      <View key={comment.id || idx} style={[styles.commentFeedCard, dyn.card]}>
                        {/* Header Komentar */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={styles.commentFeedAvatar}>
                              <Text style={styles.commentFeedAvatarText}>
                                {(comment.authorName || 'A').charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View>
                              <Text style={[styles.commentFeedAuthor, dyn.textMain]}>{comment.authorName || 'Anonim'}</Text>
                              <Text style={[styles.recomListDate, dyn.textMuted]}>{commentDate}</Text>
                            </View>
                          </View>
                          <View style={styles.readerBadge}>
                            <Text style={styles.readerBadgeText}>Pembaca</Text>
                          </View>
                        </View>

                        {/* Isi Komentar */}
                        <View style={[styles.commentFeedBubble, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc' }]}>
                          <Ionicons name="chatbox-outline" size={14} color="#7c3aed" style={{ marginBottom: 4 }} />
                          <Text style={[styles.commentFeedText, dyn.textMain]}>
                            "{comment.content}"
                          </Text>
                        </View>

                        {/* Tautan ke Artikel Terkait */}
                        <TouchableOpacity
                          onPress={() => router.push(`/article/${comment.articleSlug}`)}
                          style={[styles.commentArticleLink, { borderColor: isDarkMode ? '#334155' : '#e2e8f0' }]}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="newspaper-outline" size={15} color="#1b61d1" />
                          <Text style={[styles.commentArticleTitle, dyn.textMain]} numberOfLines={1}>
                            {comment.articleTitle || 'Lihat Artikel Terkait'}
                          </Text>
                          <Ionicons name="arrow-forward" size={14} color="#1b61d1" style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
            <View style={{ height: 160 }} />
          </ScrollView>
          ) : (
            <View style={{ flex: 1, backgroundColor: colors.background }} />
          )}
        </View>
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
  },
  videoSectionContainer: {
    marginVertical: 14,
    marginBottom: 20,
    borderRadius: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  videoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  videoHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  videoRedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  videoSectionSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  videoMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 2,
  },
  videoMoreText: {
    fontSize: 11,
    fontWeight: '700',
  },
  videoScrollContent: {
    paddingLeft: 14,
    paddingRight: 4,
  },
  videoCard: {
    width: 220,
    marginRight: 12,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  videoThumbContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
    backgroundColor: '#000',
  },
  videoThumbImage: {
    width: '100%',
    height: '100%',
  },
  videoPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTagBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 4,
  },
  videoTagText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  videoViewsBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  videoViewsText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '600',
  },
  videoCardBody: {
    padding: 10,
  },
  videoCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 6,
  },
  videoCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  videoCardCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ef4444',
    textTransform: 'uppercase',
  },
  videoCardDot: {
    fontSize: 10,
  },
  videoCardDate: {
    fontSize: 10,
  },
  // TAB BAR NAVIGATION
  tabBarContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tabBarScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  tabBarItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  tabBarText: {
    fontSize: 13,
    letterSpacing: 0.1,
  },
  // TAB CONTENT COMMON
  tabContentWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  tabHeroBanner: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  tabHeroTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  tabHeroSub: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  // REKOMENDASI TAB
  recomHeroCard: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  recomHeroImage: {
    width: '100%',
    height: 190,
    backgroundColor: '#cbd5e1',
  },
  recomHeroBody: {
    padding: 14,
  },
  recomBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recomCategoryBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  recomCategoryText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  recomHeroDate: {
    fontSize: 11,
  },
  recomHeroTitle: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  recomListContainer: {
    gap: 12,
  },
  recomListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 10,
    gap: 12,
  },
  recomListImage: {
    width: 95,
    height: 75,
    borderRadius: 8,
    backgroundColor: '#cbd5e1',
  },
  recomListBody: {
    flex: 1,
  },
  recomCategorySmall: {
    color: '#3b82f6',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
  },
  recomListTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  recomListDate: {
    fontSize: 11,
  },
  // POPULER TAB
  popularTopCard: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  popularTopImage: {
    width: '100%',
    height: 190,
    backgroundColor: '#cbd5e1',
  },
  rankBadgeFirst: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  rankBadgeFirstText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  popularTopBody: {
    padding: 14,
  },
  popularTopTitle: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  popularRankList: {
    gap: 12,
  },
  popularRankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  rankNumberBox: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumberTop: {
    transform: [{ scale: 1.1 }],
  },
  rankNumberText: {
    fontSize: 18,
    fontWeight: '900',
  },
  popularRankContent: {
    flex: 1,
  },
  popularRankTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  popularRankThumb: {
    width: 75,
    height: 65,
    borderRadius: 8,
    backgroundColor: '#cbd5e1',
  },
  // MEJA REDAKSI TAB
  editorialBox: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  editorialBoxText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  editorialCard: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  editorialCardImg: {
    width: '100%',
    height: 160,
    backgroundColor: '#cbd5e1',
  },
  editorialCardBody: {
    padding: 14,
  },
  editorialBadge: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  editorialBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  editorialCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
  },
  // KOMENTAR TAB
  emptyCommentFeed: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  emptyCommentTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },
  emptyCommentSub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  commentFeedCard: {
    borderRadius: 14,
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  commentFeedAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1b61d1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentFeedAvatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  commentFeedAuthor: {
    fontSize: 13,
    fontWeight: '700',
  },
  readerBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  readerBadgeText: {
    color: '#3b82f6',
    fontSize: 10,
    fontWeight: '700',
  },
  commentFeedBubble: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  commentFeedText: {
    fontSize: 13,
    lineHeight: 20,
  },
  commentArticleLink: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 8,
  },
  commentArticleTitle: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  }
});
