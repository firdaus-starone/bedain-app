import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar, Dimensions, useWindowDimensions, Platform, Animated, TextInput, Share, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, query, orderBy, limit, getDocs, where, addDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import RenderHtml, { defaultSystemFonts } from 'react-native-render-html';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
const systemFonts = [...defaultSystemFonts, 'System', 'sans-serif', 'Roboto'];

const { width } = Dimensions.get('window');

export default function ArticleDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { isDarkMode, colors } = useTheme();
  const { user } = useAuth();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { width: contentWidth } = useWindowDimensions();
  const [commentText, setCommentText] = useState('');
  const [siteSettings, setSiteSettings] = useState({
    siteName: 'Bedain News',
    logoUrl: '',
  });
  const scrollY = useRef(new Animated.Value(0)).current;
  const [relatedArticles, setRelatedArticles] = useState<any[]>([]);
  const [recommendedArticles, setRecommendedArticles] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [articleBanners, setArticleBanners] = useState<any[]>([]);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{id: string, name: string} | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  const handleReaction = async (reactionId: string) => {
    if (!article?.id) return;
    
    const isCurrentlySelected = selectedReaction === reactionId;
    const oldReaction = selectedReaction;
    
    // Optimistic Update Local State
    setSelectedReaction(isCurrentlySelected ? null : reactionId);
    let updatedReactions = { ...(article.reactions || {}) };
    
    if (oldReaction && oldReaction !== reactionId) {
      updatedReactions[oldReaction] = Math.max(0, (updatedReactions[oldReaction] || 0) - 1);
    }
    
    if (isCurrentlySelected) {
      updatedReactions[reactionId] = Math.max(0, (updatedReactions[reactionId] || 0) - 1);
    } else {
      updatedReactions[reactionId] = (updatedReactions[reactionId] || 0) + 1;
    }
    setArticle({ ...article, reactions: updatedReactions });

    // Update Firestore
    try {
      const docRef = doc(db, 'articles', article.id);
      const updates: any = {};
      if (oldReaction && oldReaction !== reactionId) {
        updates[`reactions.${oldReaction}`] = increment(-1);
      }
      if (isCurrentlySelected) {
        updates[`reactions.${reactionId}`] = increment(-1);
      } else {
        updates[`reactions.${reactionId}`] = increment(1);
      }
      if (Object.keys(updates).length > 0) {
        await updateDoc(docRef, updates);
      }
    } catch (e) {
      console.log('Error updating reaction:', e);
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
    
    const fetchArticle = async () => {
      try {
        let articleData = null;
        let actualId = id as string;

        const docRef = doc(db, 'articles', actualId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          articleData = { id: docSnap.id, ...docSnap.data() };
        } else {
          // Fallback to searching by slug
          const qSlug = query(collection(db, 'articles'), where('slug', '==', actualId), limit(1));
          const slugSnap = await getDocs(qSlug);
          if (!slugSnap.empty) {
            articleData = { id: slugSnap.docs[0].id, ...slugSnap.docs[0].data() };
            actualId = slugSnap.docs[0].id;
          }
        }

        if (articleData) {
          setArticle(articleData);
          
          // Fetch Comments
          const slug = articleData.slug || articleData.id;
          const qComments = query(
            collection(db, 'comments'),
            where('articleSlug', '==', slug),
            where('status', '==', 'approved'),
            orderBy('createdAt', 'desc')
          );
          const snapComments = await getDocs(qComments);
          setComments(snapComments.docs.map(d => ({ id: d.id, ...d.data() })));
          
          // Fetch Article Banners
          try {
            const qBanners = query(collection(db, 'banners'), where('status', '==', 'active'), where('slot', '==', 'article'));
            const snapBanners = await getDocs(qBanners);
            setArticleBanners(snapBanners.docs.map(d => ({ id: d.id, ...d.data() })));
          } catch(e) {}
          
          // Check Bookmark
          try {
            const stored = await AsyncStorage.getItem('bookmarks');
            if (stored) {
              const list = JSON.parse(stored);
              setIsBookmarked(list.some((b: any) => b.id === actualId));
            }
          } catch (e) {}
        }
      } catch (e) {
        console.error('Error fetching article:', e);
      } finally {
        setLoading(false);
      }
    };
    
    const fetchRelated = async () => {
      try {
        const q = query(collection(db, 'articles'), orderBy('publishedAt', 'desc'), limit(15));
        const snapshot = await getDocs(q);
        const articles: any[] = [];
        snapshot.forEach(docSnap => {
          if (docSnap.id !== id) {
            articles.push({ id: docSnap.id, ...docSnap.data() });
          }
        });
        setRelatedArticles(articles.slice(0, 5));
        setRecommendedArticles(articles.slice(5, 11));
      } catch (e) {
        console.error('Error fetching related:', e);
      }
    };

    if (id) {
      fetchSettings();
      fetchArticle();
      fetchRelated();
    }
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Memuat berita...</Text>
      </View>
    );
  }

  if (!article) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Berita tidak ditemukan.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#3b82f6', fontWeight: 'bold' }}>Kembali ke Beranda</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleShare = async () => {
    try {
      if (!article) return;
      const shareUrl = `https://bedainapp--bedain-eb6a6.us-central1.hosted.app/article/${article.slug || article.id}`;
      await Share.share({
        message: `${article.title}\n\nBaca selengkapnya di: ${shareUrl}`,
        url: shareUrl,
        title: article.title
      });
    } catch (error: any) {
      console.error('Error sharing:', error.message);
    }
  };

  const submitComment = async () => {
    if (!user) {
      Alert.alert('Belum Login', 'Silakan login terlebih dahulu untuk memberikan komentar.', [
        { text: 'Batal', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/login') }
      ]);
      return;
    }
    if (!commentText.trim() || submittingComment || !article) return;
    setSubmittingComment(true);
    try {
      await addDoc(collection(db, 'comments'), {
        articleSlug: article.slug || article.id,
        articleTitle: article.title || '',
        authorName: user.displayName || 'Pembaca',
        authorEmail: user.email || '',
        content: commentText.trim(),
        status: 'pending',
        reported: false,
        createdAt: serverTimestamp(),
        parentId: replyingTo ? replyingTo.id : null,
      });
      setCommentText('');
      const wasReplying = replyingTo;
      setReplyingTo(null);
      Alert.alert(wasReplying ? 'Balasan Terkirim' : 'Komentar Terkirim', wasReplying ? 'Balasan Anda berhasil dikirim dan menunggu moderasi.' : 'Komentar Anda berhasil dikirim dan menunggu moderasi oleh tim redaksi.');
    } catch (err) {
      console.error(err);
      Alert.alert('Gagal', 'Gagal mengirim komentar. Coba lagi.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const thumb = article.coverImage || article.imageUrl || 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=800&q=80';

  const toggleBookmark = async () => {
    try {
      if (!article) return;
      const stored = await AsyncStorage.getItem('bookmarks');
      let list = stored ? JSON.parse(stored) : [];
      
      if (isBookmarked) {
        list = list.filter((b: any) => b.id !== article.id);
        setIsBookmarked(false);
        Alert.alert('Batal Disimpan', 'Berita dihapus dari daftar simpanan.');
      } else {
        list.push({
          id: article.id,
          title: article.title,
          category: article.category || 'Berita',
          slug: article.slug || article.id,
          thumb: thumb,
          savedAt: Date.now()
        });
        setIsBookmarked(true);
        Alert.alert('Tersimpan', 'Berita berhasil disimpan untuk dibaca nanti.');
      }
      await AsyncStorage.setItem('bookmarks', JSON.stringify(list));
    } catch (e) {
      console.error(e);
      Alert.alert('Gagal', 'Gagal menyimpan berita.');
    }
  };

  let dateStr = 'Baru saja';
  if (article.publishedAt) {
    const dateObj = typeof article.publishedAt.toDate === 'function' ? article.publishedAt.toDate() : new Date(article.publishedAt);
    dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  const dyn = {
    bg: { backgroundColor: colors.background },
    textMain: { color: colors.text },
    textMuted: { color: isDarkMode ? '#cbd5e1' : '#64748b' },
    borderB: { borderBottomColor: colors.border },
    excerpt: { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', color: isDarkMode ? '#cbd5e1' : '#334155' },
    tagBadge: { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: colors.border },
    tagText: { color: isDarkMode ? '#60a5fa' : '#3b82f6' },
    commentAvatar: { backgroundColor: isDarkMode ? '#334155' : '#f1f5f9' },
    commentInputWrapper: { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: colors.border },
    emptyComment: { backgroundColor: isDarkMode ? '#1e293b' : '#fafafa', borderColor: colors.border },
    card: { backgroundColor: colors.card, borderColor: colors.border },
    headerBtn: { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' },
  };

  return (
    <View style={[styles.container, dyn.bg]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
      
      <Animated.ScrollView 
        showsVerticalScrollIndicator={false} 
        bounces={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* Judul dan Meta di atas Gambar */}
        <View style={{ paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 120 : 130, paddingBottom: 16 }}>
          <Text style={[styles.title, dyn.textMain]}>{article.title}</Text>
          <View style={[styles.metaRow, { marginBottom: 0 }]}>
            <View style={styles.authorContainer}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.authorName, dyn.textMain]}>{article.contributorName || article.author?.name || 'Redaksi'}</Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{article.category?.toUpperCase() || 'BERITA'}</Text>
                  </View>
                </View>
                <Text style={[styles.date, dyn.textMuted]}>{dateStr}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Gambar Artikel dengan Efek Parallax */}
        <Animated.View style={[styles.heroContainer, {
          zIndex: -1,
          transform: [
            {
              translateY: scrollY.interpolate({
                inputRange: [-100, 0, 400],
                outputRange: [-50, 0, 200],
                extrapolate: 'clamp',
              })
            }
          ]
        }]}>
          <Animated.Image 
            source={{ uri: thumb }} 
            resizeMode="cover"
            style={[styles.heroImage, {
              transform: [
                {
                  scale: scrollY.interpolate({
                    inputRange: [-100, 0],
                    outputRange: [1.2, 1],
                    extrapolateRight: 'clamp',
                  })
                }
              ]
            }]} 
          />
        </Animated.View>

        <View style={[styles.contentContainer, dyn.bg]}>
          {article.imageCaption ? (
            <Text style={[styles.imageCaptionTextOutside, dyn.textMuted]}>{article.imageCaption}</Text>
          ) : null}

          <View style={[styles.excerptContainer, dyn.excerpt]}>
            {(article.excerpt || article.summary || article.seoDescription || article.description) ? (
              <Text style={[styles.excerpt, dyn.excerpt]}>{article.excerpt || article.summary || article.seoDescription || article.description}</Text>
            ) : (
              <Text style={[styles.excerpt, dyn.textMuted]}>
                [Kolom excerpt/ringkasan akan muncul di sini. Silakan isi kolom ringkasan saat membuat berita untuk menghilangkan teks ini.]
              </Text>
            )}
          </View>

          <View style={[styles.divider, dyn.borderB]} />

          {/* Isi Artikel */}
          <View style={styles.articleBody}>
            {article.content ? (
              <RenderHtml
                contentWidth={contentWidth - 40}
                systemFonts={systemFonts}
                baseStyle={{ 
                  textAlign: 'left',
                  fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
                  fontWeight: '500'
                }}
                source={{ html: (() => {
                  const html = article.content;
                  if (!html) return html;
                  
                  // Bersihkan HTML sesuai dengan panduan Ultimate Fix
                  const cleanHtml = html
                    .replace(/justify/gi, 'left')
                    .replace(/&nbsp;/g, ' ')
                    .replace(/\u00A0/g, ' ')
                    .replace(/color\s*:\s*[^;"']+;?/gi, '') // Hapus inline color bawaan editor (agar bisa beradaptasi ke dark mode)
                    .replace(/\[B\]/g, `<strong style="color: #3b82f6;">BEDAIN NEWS</strong> — `);
                    
                  // Jika tidak ada related articles, kita langsung bungkus saja
                  if (relatedArticles.length === 0) {
                    return `<div style="text-align: left;">${cleanHtml}</div>`;
                  }
                  
                  let pCount = 0;
                  const newHtml = cleanHtml.replace(/<\/p>/g, (match) => {
                    pCount++;
                    let injected = match;
                    
                    // IKLAN SPONSOR: Muncul HANYA di alinea 4 (1 kali saja di tengah artikel)
                    if (pCount === 4 && articleBanners.length > 0) {
                      const banner = articleBanners[Math.floor(Math.random() * articleBanners.length)];
                      const bannerHtml = `
                        <div style="margin: 24px -20px; text-align: left;">
                          <a href="${banner.targetUrl || '#'}" style="text-decoration: none; display: block;">
                            <img src="${banner.imageUrl}" style="width: 100%; background-color: #e2e8f0;" />
                            <div style="font-size: 10px; color: #94a3b8; text-align: left; margin-top: 4px; padding-left: 20px;">IKLAN SPONSOR</div>
                          </a>
                        </div>
                      `;
                      injected = `${injected}${bannerHtml}`;
                    }

                    // BACA JUGA: Muncul di alinea 2, 8, 14... (selang 6 alinea)
                    if (pCount >= 2 && (pCount - 2) % 6 === 0) {
                      // Ambil 3 artikel berbeda untuk setiap kemunculan
                      const groupIndex = Math.floor((pCount - 2) / 6);
                      const startIndex = groupIndex * 3;
                      const articlesToShow = relatedArticles.slice(startIndex, startIndex + 3);
                      
                      if (articlesToShow.length > 0) {
                        const bacaJugaHtml = `
                          <div style="margin: 24px -20px; background-color: ${isDarkMode ? '#1e293b' : '#f8fafc'}; padding: 16px 20px; border-left: 4px solid #3b82f6;">
                            <div style="display: flex; flex-direction: row; align-items: center; margin-bottom: 12px;">
                              <span class="baca-juga-label">BACA JUGA</span>
                            </div>
                            ${articlesToShow.map((item, index, arr) => `
                              <div style="margin-bottom: ${index === arr.length - 1 ? '0' : '12px'}; border-bottom: ${index === arr.length - 1 ? 'none' : `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`}; padding-bottom: ${index === arr.length - 1 ? '0' : '12px'};">
                                <div style="display: flex; flex-direction: row; align-items: center;">
                                  <div style="flex: 1; padding-right: 12px;">
                                    <span class="baca-juga-cat">
                                      ${item.category || 'BERITA'}
                                    </span>
                                    <a href="/article/${item.id}" class="baca-juga-title">
                                      ${item.title}
                                    </a>
                                  </div>
                                  <a href="/article/${item.id}" class="baca-juga-arrow" style="background-color: ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};">
                                    →
                                  </a>
                                </div>
                              </div>
                            `).join('')}
                          </div>
                        `;
                        injected = `${injected}${bacaJugaHtml}`;
                      }
                    }
                    return injected;
                  });
                  return `<div style="text-align: left;">${newHtml}</div>`;
                })() }}
                renderersProps={{
                  a: {
                    onPress: (_, href) => {
                      if (href.includes('/article/')) {
                        const parts = href.split('/article/');
                        const targetId = parts[parts.length - 1].replace(/\/$/, '');
                        router.push({ pathname: '/article/[id]', params: { id: targetId } });
                      } else {
                        Linking.openURL(href).catch(e => console.log('Error opening link:', e));
                      }
                    }
                  }
                }}
                tagsStyles={{
                  body: { textAlign: 'left' },
                  div: { textAlign: 'left' },
                  span: { textAlign: 'left' },
                  p: { fontSize: 15, lineHeight: 24, color: colors.text, marginBottom: 8, textAlign: 'left', fontWeight: '500' },
                  strong: { fontWeight: '800', color: colors.text },
                  h2: { fontSize: 19, fontWeight: '800', marginTop: 14, marginBottom: 6, color: colors.text, textAlign: 'left' },
                  h3: { fontSize: 17, fontWeight: '700', marginTop: 14, marginBottom: 6, color: colors.text, textAlign: 'left' },
                  a: { color: '#3b82f6', textDecorationLine: 'none' },
                  img: { borderRadius: 8, marginVertical: 8 },
                  li: { fontSize: 15, lineHeight: 24, color: colors.text, marginBottom: 6, textAlign: 'left' },
                }}
                classesStyles={{
                  'baca-juga-label': { 
                    color: '#3b82f6', 
                    fontSize: 12, 
                    fontWeight: '900', 
                    letterSpacing: 2, 
                    textTransform: 'uppercase' 
                  },
                  'baca-juga-title': { 
                    color: '#3b82f6', 
                    textDecorationLine: 'none', 
                    fontWeight: '700', 
                    fontSize: 14, 
                    lineHeight: 20 
                  },
                  'baca-juga-cat': { 
                    display: 'flex', 
                    color: isDarkMode ? '#94a3b8' : '#64748b', 
                    fontSize: 10, 
                    fontWeight: '700', 
                    marginBottom: 4, 
                    textTransform: 'uppercase', 
                    letterSpacing: 1 
                  },
                  'baca-juga-arrow': { 
                    color: '#3b82f6',
                    textDecorationLine: 'none', 
                    width: 32, 
                    height: 32, 
                    borderRadius: 16, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: '900', 
                    fontSize: 15 
                  }
                }}
              />
            ) : (
              <Text style={styles.fallbackText}>Konten berita tidak tersedia.</Text>
            )}

            {/* Nama Kontributor / Penulis di Akhir Artikel */}
            <View style={{ marginTop: 24, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="pencil" size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 13, color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                <Text style={{ fontWeight: '700', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>Kontributor: </Text>
                {article.contributorName || article.author?.name || 'Redaksi'}
              </Text>
            </View>

            {/* REAKSI PEMBACA */}
            <View style={{ marginTop: 16, marginBottom: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: dyn.textMain.color, marginBottom: 10, textAlign: 'center' }}>
                Bagaimana reaksi Anda?
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                {[
                  { id: 'like', emoji: '👍', label: 'Suka' },
                  { id: 'love', emoji: '❤️', label: 'Keren' },
                  { id: 'surprised', emoji: '😲', label: 'Kaget' },
                  { id: 'sad', emoji: '😢', label: 'Sedih' },
                  { id: 'angry', emoji: '😡', label: 'Marah' },
                ].map((reaction) => {
                  const isSelected = selectedReaction === reaction.id;
                  const count = article?.reactions?.[reaction.id] || 0;
                  return (
                    <TouchableOpacity
                      key={reaction.id}
                      activeOpacity={0.7}
                      onPress={() => handleReaction(reaction.id)}
                      style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isSelected ? (isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff') : (isDarkMode ? '#1e293b' : '#f8fafc'),
                        borderWidth: 1,
                        borderColor: isSelected ? '#3b82f6' : (isDarkMode ? '#334155' : '#e2e8f0'),
                        borderRadius: 10,
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                        minWidth: 55,
                      }}
                    >
                      <Text style={{ fontSize: 20, marginBottom: 2 }}>{reaction.emoji}</Text>
                      <Text style={{ 
                        fontSize: 10, 
                        fontWeight: isSelected ? '700' : '500', 
                        color: isSelected ? '#3b82f6' : (isDarkMode ? '#94a3b8' : '#64748b') 
                      }}>
                        {reaction.label} {count > 0 ? `(${count})` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* IKLAN SPONSOR BAWAH ARTIKEL */}
            {articleBanners.length > 0 && (
              <View style={{ marginTop: 24, marginBottom: 8 }}>
                {(() => {
                  // Pilih banner kedua jika ada, jika tidak pakai yang pertama
                  const banner = articleBanners.length > 1 ? articleBanners[1] : articleBanners[0];
                  return (
                    <TouchableOpacity 
                      activeOpacity={0.8}
                      onPress={() => {
                        if (banner.targetUrl) {
                          Linking.openURL(banner.targetUrl).catch(e => console.log('Error opening link:', e));
                        }
                      }}
                    >
                      <Image 
                        source={{ uri: banner.imageUrl }} 
                        style={{ width: '100%', height: Math.min(width * 0.4, 200), backgroundColor: '#e2e8f0', borderRadius: 8 }} 
                        resizeMode="cover"
                      />
                      <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 8, textAlign: 'center' }}>IKLAN SPONSOR</Text>
                    </TouchableOpacity>
                  );
                })()}
              </View>
            )}

            {/* Topik / Label Terkait */}
            <View style={[styles.tagsContainer, dyn.borderB]}>
              <Text style={styles.tagsLabel}>TOPIK TERKAIT:</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.tagsWrapper}
              >
                {(article.tags && article.tags.length > 0 ? article.tags : [
                  (article.category ? `#${article.category.replace(/[^a-zA-Z0-9]/g, '')}` : '#BeritaUtama'), 
                  '#Trending', 
                  '#BedainNews'
                ]).map((tag: string, index: number) => (
                  <TouchableOpacity key={index} style={[styles.tagBadge, dyn.tagBadge]}>
                    <Text style={[styles.tagText, dyn.tagText]}>{tag.startsWith('#') ? tag : `#${tag}`}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Kolom Komentar */}
            <View style={[styles.commentSection, dyn.borderB]}>
              <Text style={[styles.commentHeader, dyn.textMain]}>Komentar ({comments.length})</Text>
              
              <View style={[styles.commentInputContainer, { flexDirection: 'column', alignItems: 'stretch' }]}>
                {replyingTo && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: isDarkMode ? '#334155' : '#f1f5f9', borderRadius: 8, alignSelf: 'flex-start' }}>
                    <Text style={{ fontSize: 12, color: dyn.textMain.color }}>Membalas <Text style={{ fontWeight: '700' }}>{replyingTo.name}</Text></Text>
                    <TouchableOpacity onPress={() => setReplyingTo(null)} style={{ marginLeft: 12 }}>
                      <Ionicons name="close-circle" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', width: '100%' }}>
                  <View style={[styles.commentAvatar, dyn.commentAvatar]}>
                    <Ionicons name="person" size={16} color="#94a3b8" />
                  </View>
                  <View style={[styles.commentInputWrapper, dyn.commentInputWrapper, { flex: 1, marginLeft: 12 }]}>
                    <TextInput
                      style={[styles.commentInput, dyn.textMain]}
                      placeholder={replyingTo ? "Tulis balasan..." : "Tulis komentar..."}
                      placeholderTextColor="#94a3b8"
                      value={commentText}
                      onChangeText={setCommentText}
                      multiline
                    />
                    <TouchableOpacity style={styles.commentSubmitBtn} onPress={submitComment} disabled={submittingComment}>
                      <Ionicons name="send" size={16} color={commentText.trim().length > 0 && !submittingComment ? '#3b82f6' : '#cbd5e1'} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {comments.length === 0 ? (
                <View style={[styles.emptyCommentState, dyn.emptyComment]}>
                  <Ionicons name="chatbubbles-outline" size={32} color={isDarkMode ? '#334155' : '#e2e8f0'} />
                  <Text style={[styles.emptyCommentText, dyn.textMuted]}>Belum ada komentar. Jadilah yang pertama memberikan tanggapan!</Text>
                </View>
              ) : (
                <View style={{ gap: 16 }}>
                  {comments.filter(c => !c.parentId).map((c, i) => {
                    let cDate = 'Baru saja';
                    if (c.createdAt) {
                      const d = typeof c.createdAt.toDate === 'function' ? c.createdAt.toDate() : new Date(c.createdAt);
                      cDate = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                    }
                    
                    const replies = comments
                      .filter(r => r.parentId === c.id)
                      .sort((a, b) => {
                        const ta = a.createdAt?.seconds || 0;
                        const tb = b.createdAt?.seconds || 0;
                        return ta - tb;
                      });

                    return (
                      <View key={c.id || i} style={{ flexDirection: 'column', gap: 8 }}>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          <View style={[styles.commentAvatar, dyn.commentAvatar, { width: 32, height: 32, borderRadius: 16 }]}>
                            <Ionicons name="person" size={14} color="#94a3b8" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <Text style={[styles.authorName, dyn.textMain, { fontSize: 13, marginBottom: 0 }]}>{c.authorName}</Text>
                              <Text style={[styles.date, dyn.textMuted, { fontSize: 11 }]}>{cDate}</Text>
                            </View>
                            <Text style={[dyn.textMain, { fontSize: 13, lineHeight: 20 }]}>{c.content}</Text>
                            
                            <TouchableOpacity onPress={() => setReplyingTo({ id: c.id, name: c.authorName })} style={{ marginTop: 6, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons name="arrow-undo-outline" size={14} color="#3b82f6" />
                              <Text style={{ color: '#3b82f6', fontSize: 12, fontWeight: '700' }}>Balas</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        
                        {replies.length > 0 && (
                          <View style={{ marginLeft: 32, marginTop: 4 }}>
                            {!expandedReplies[c.id] ? (
                              <TouchableOpacity onPress={() => toggleReplies(c.id)} style={{ paddingVertical: 8, flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ color: '#3b82f6', fontSize: 12, fontWeight: '700' }}>Lihat {replies.length} balasan...</Text>
                              </TouchableOpacity>
                            ) : (
                              <>
                                <View style={{ paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: isDarkMode ? '#334155' : '#e2e8f0', gap: 12, marginTop: 4 }}>
                                  {replies.map(r => {
                                    let rDate = 'Baru saja';
                                    if (r.createdAt) {
                                      const rd = typeof r.createdAt.toDate === 'function' ? r.createdAt.toDate() : new Date(r.createdAt);
                                      rDate = rd.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                                    }
                                    return (
                                      <View key={r.id} style={{ flexDirection: 'row', gap: 10 }}>
                                        <View style={[styles.commentAvatar, dyn.commentAvatar, { width: 24, height: 24, borderRadius: 12 }]}>
                                          <Ionicons name="person" size={12} color="#94a3b8" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                            <Text style={[styles.authorName, dyn.textMain, { fontSize: 12, marginBottom: 0 }]}>{r.authorName}</Text>
                                            <Text style={[styles.date, dyn.textMuted, { fontSize: 10 }]}>{rDate}</Text>
                                          </View>
                                          <Text style={[dyn.textMain, { fontSize: 12.5, lineHeight: 18 }]}>{r.content}</Text>
                                        </View>
                                      </View>
                                    );
                                  })}
                                </View>
                                <TouchableOpacity onPress={() => toggleReplies(c.id)} style={{ paddingVertical: 8, marginTop: 4, paddingLeft: 12, flexDirection: 'row', alignItems: 'center' }}>
                                  <Text style={{ color: dyn.textMuted.color, fontSize: 12, fontWeight: '600' }}>Sembunyikan balasan</Text>
                                </TouchableOpacity>
                              </>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Berita Terkait Bawah */}
            {relatedArticles.length > 0 && (
              <View style={[styles.relatedBottomContainer, dyn.borderB]}>
                <View style={styles.relatedBottomHeader}>
                  <Text style={[styles.relatedBottomTitle, dyn.textMain]}>BERITA TERKAIT</Text>
                  <View style={[styles.relatedBottomLine, { backgroundColor: dyn.borderB.borderBottomColor }]} />
                </View>
                <View style={styles.relatedBottomList}>
                  {relatedArticles.slice(0, 5).map((item, idx) => (
                    <TouchableOpacity key={idx} style={[styles.relatedBottomItem, dyn.borderB]} onPress={() => router.push(`/article/${item.id}` as any)}>
                      <Text style={styles.relatedBottomItemCategory}>{item.category?.toUpperCase() || 'BERITA'}</Text>
                      <Text style={[styles.relatedBottomItemTitle, dyn.textMain]}>{item.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Rekomendasi (Grid 2 Kolom) */}
            {recommendedArticles.length > 0 && (
              <View style={[styles.recommendationContainer, dyn.borderB]}>
                <View style={styles.relatedBottomHeader}>
                  <Text style={[styles.relatedBottomTitle, dyn.textMain]}>REKOMENDASI</Text>
                  <View style={[styles.relatedBottomLine, { backgroundColor: dyn.borderB.borderBottomColor }]} />
                </View>
                <View style={styles.recommendationGrid}>
                  {recommendedArticles.map((item, idx) => (
                    <TouchableOpacity key={idx} style={[styles.recommendationCard, dyn.card]} onPress={() => router.push(`/article/${item.id}` as any)}>
                      <Image source={{ uri: item.coverImage || item.imageUrl || 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=400&q=80' }} style={styles.recommendationImage} />
                      <View style={styles.recommendationContent}>
                        <Text style={[styles.recommendationTitle, dyn.textMain]} numberOfLines={3}>{item.title}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

          </View>
          
          <View style={{ height: 60 }} />
        </View>
      </Animated.ScrollView>

      {/* Header Solid */}
      <View style={[styles.header, dyn.card, { borderBottomWidth: 1 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={dyn.textMain.color} />
          </TouchableOpacity>
          
          <View style={styles.headerCapsule}>
            {siteSettings.logoUrl ? (
              <Image source={{ uri: siteSettings.logoUrl }} style={{ width: 38, height: 38, marginRight: 8, borderRadius: 19 }} resizeMode="contain" />
            ) : null}
            <Text style={[{ fontSize: 22, fontWeight: '900' }, dyn.textMain]}>
              {siteSettings.siteName?.split(' ')[0]?.toLowerCase()}
              {siteSettings.siteName?.split(' ').length > 1 && (
                <Text style={{ color: '#1b61d1' }}>{siteSettings.siteName.split(' ').slice(1).join('').toLowerCase()}</Text>
              )}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 4 }}>
          <TouchableOpacity style={styles.bookmarkButton} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={24} color={dyn.textMain.color} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.bookmarkButton} onPress={toggleBookmark}>
            <Ionicons name={isBookmarked ? "bookmark" : "bookmark-outline"} size={24} color={dyn.textMain.color} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600'
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 40) + 10 : 50,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  bookmarkButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContainer: {
    width: '100%',
    aspectRatio: 16 / 9, 
    backgroundColor: '#f1f5f9',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageCaptionTextOutside: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  categoryText: {
    color: '#3b82f6',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: 30,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  excerptContainer: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  excerpt: {
    fontSize: 15,
    lineHeight: 24,
    color: '#334155',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  authorInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#475569',
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  date: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 24,
  },
  articleBody: {
    flex: 1,
  },
  fallbackText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#334155',
  },
  tagsContainer: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 20,
    marginHorizontal: -20, // Negative margin agar scroll tembus ujung layar
  },
  tagsLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#94a3b8',
    marginBottom: 12,
    letterSpacing: 1,
    paddingHorizontal: 20, // Kembalikan padding khusus untuk judulnya
  },
  tagsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20, // Padding di dalam scroll view
  },
  tagBadge: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tagText: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '600',
  },
  commentSection: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
  },
  commentHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginBottom: 2,
  },
  commentInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 4,
  },
  commentInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    color: '#334155',
    fontSize: 14,
    paddingTop: 8,
    paddingBottom: 8,
  },
  commentSubmitBtn: {
    padding: 8,
    marginBottom: 2,
  },
  emptyCommentState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderStyle: 'dashed',
  },
  emptyCommentText: {
    marginTop: 12,
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  relatedBottomContainer: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 20,
  },
  relatedBottomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  relatedBottomTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginRight: 12,
  },
  relatedBottomLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  relatedBottomList: {
    gap: 12,
  },
  relatedBottomItem: {
    flexDirection: 'column',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  relatedBottomItemCategory: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  relatedBottomItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    lineHeight: 22,
  },
  recommendationContainer: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 20,
  },
  recommendationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  recommendationCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  recommendationImage: {
    width: '100%',
    height: 100,
    backgroundColor: '#e2e8f0',
  },
  recommendationContent: {
    padding: 10,
  },
  recommendationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    lineHeight: 18,
  },
});
