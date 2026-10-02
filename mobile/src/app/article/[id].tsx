import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar, Dimensions, useWindowDimensions, Platform, Animated, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import RenderHtml, { defaultSystemFonts } from 'react-native-render-html';
import { useTheme } from '../../context/ThemeContext';
const systemFonts = [...defaultSystemFonts, 'System', 'sans-serif', 'Roboto'];

const { width } = Dimensions.get('window');

export default function ArticleDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { isDarkMode, colors } = useTheme();
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
        const docRef = doc(db, 'articles', id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setArticle({ id: docSnap.id, ...docSnap.data() });
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

  const thumb = article.coverImage || article.imageUrl || 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=800&q=80';
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
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <Animated.ScrollView 
        showsVerticalScrollIndicator={false} 
        bounces={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* Gambar Hero dengan Parallax */}
        <Animated.View style={[styles.heroContainer, {
          transform: [
            {
              translateY: scrollY.interpolate({
                inputRange: [-100, 0, 350],
                outputRange: [-50, 0, 175],
                extrapolate: 'clamp',
              })
            }
          ]
        }]}>
          <Animated.Image 
            source={{ uri: thumb }} 
            style={[styles.heroImage, {
              transform: [
                {
                  scale: scrollY.interpolate({
                    inputRange: [-100, 0],
                    outputRange: [1.3, 1],
                    extrapolateRight: 'clamp',
                  })
                }
              ]
            }]} 
          />
          <View style={styles.heroOverlay} />
        </Animated.View>
        <View style={[styles.contentContainer, dyn.bg]}>
          {article.imageCaption ? (
            <Text style={[styles.imageCaptionTextOutside, dyn.textMuted]}>{article.imageCaption}</Text>
          ) : null}

          <Text style={[styles.title, dyn.textMain]}>{article.title}</Text>
          <View style={styles.metaRow}>
            <View style={styles.authorContainer}>
              <View style={[styles.authorAvatar, dyn.commentAvatar]}>
                <Text style={styles.authorInitial}>{(article.author?.name || 'R')[0].toUpperCase()}</Text>
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.authorName, dyn.textMain]}>{article.author?.name || 'Redaksi'}</Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{article.category?.toUpperCase() || 'BERITA'}</Text>
                  </View>
                </View>
                <Text style={[styles.date, dyn.textMuted]}>{dateStr}</Text>
              </View>
            </View>
          </View>

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
                  if (!html || relatedArticles.length === 0) return html;
                  const cleanHtml = html
                    .replace(/justify/gi, 'left')
                    .replace(/&nbsp;/g, ' ')
                    .replace(/\u00A0/g, ' ')
                    .replace(/\[B\]/g, `<strong style="color: #3b82f6;">BEDAIN NEWS</strong> — `);
                  let pCount = 0;
                  const newHtml = cleanHtml.replace(/<\/p>/g, (match) => {
                    pCount++;
                    if (pCount === 2) {
                      const bacaJugaHtml = `
                        <div style="margin: 32px 0; background-color: ${isDarkMode ? '#1e293b' : '#0f172a'}; border-radius: 16px; padding: 24px; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15); border-left: 4px solid #3b82f6;">
                          <div style="display: flex; flex-direction: row; align-items: center; margin-bottom: 20px;">
                            <span style="background-color: #3b82f6; color: #ffffff; font-size: 10px; font-weight: 900; letter-spacing: 2px; padding: 4px 10px; border-radius: 20px; text-transform: uppercase;">
                              BACA JUGA
                            </span>
                          </div>
                          ${relatedArticles.slice(0, 3).map((item, index, arr) => `
                            <div style="margin-bottom: ${index === arr.length - 1 ? '0' : '16px'}; border-bottom: ${index === arr.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.1)'}; padding-bottom: ${index === arr.length - 1 ? '0' : '16px'};">
                              <a href="/article/${item.id}" style="text-decoration: none; display: flex; flex-direction: row; align-items: center;">
                                <div style="flex: 1; padding-right: 16px;">
                                  <span style="display: flex; color: ${isDarkMode ? '#94a3b8' : '#cbd5e1'}; font-size: 10px; font-weight: 700; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px;">
                                    ${item.category || 'BERITA'}
                                  </span>
                                  <span style="display: flex; color: ${isDarkMode ? '#f8fafc' : '#ffffff'}; font-weight: 700; font-size: 16px; line-height: 24px;">
                                    ${item.title}
                                  </span>
                                </div>
                                <div style="width: 32px; height: 32px; border-radius: 16px; background-color: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center;">
                                  <span style="color: #3b82f6; font-weight: 900; font-size: 16px;">→</span>
                                </div>
                              </a>
                            </div>
                          `).join('')}
                        </div>
                      `;
                      return `${match}${bacaJugaHtml}`;
                    }
                    return match;
                  });
                  return `<div style="text-align: left;">${newHtml}</div>`;
                })() }}
                renderersProps={{
                  a: {
                    onPress: (_, href) => {
                      if (href.startsWith('/article/')) {
                        router.push(href as any);
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
              />
            ) : (
              <Text style={styles.fallbackText}>Konten berita tidak tersedia.</Text>
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
              <Text style={[styles.commentHeader, dyn.textMain]}>Komentar (0)</Text>
              
              <View style={styles.commentInputContainer}>
                <View style={[styles.commentAvatar, dyn.commentAvatar]}>
                  <Ionicons name="person" size={16} color="#94a3b8" />
                </View>
                <View style={[styles.commentInputWrapper, dyn.commentInputWrapper]}>
                  <TextInput
                    style={[styles.commentInput, dyn.textMain]}
                    placeholder="Tulis komentar..."
                    placeholderTextColor="#94a3b8"
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                  />
                  <TouchableOpacity style={styles.commentSubmitBtn} onPress={() => {}}>
                    <Ionicons name="send" size={16} color={commentText.trim().length > 0 ? '#3b82f6' : '#cbd5e1'} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.emptyCommentState, dyn.emptyComment]}>
                <Ionicons name="chatbubbles-outline" size={32} color={isDarkMode ? '#334155' : '#e2e8f0'} />
                <Text style={[styles.emptyCommentText, dyn.textMuted]}>Belum ada komentar. Jadilah yang pertama memberikan tanggapan!</Text>
              </View>
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

      {/* Header Mengambang */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, dyn.headerBtn]}>
            <Ionicons name="chevron-back" size={28} color={dyn.textMain.color} />
          </TouchableOpacity>
          
          <View style={[styles.headerCapsule, dyn.headerBtn]}>
            {siteSettings.logoUrl ? (
              <Image source={{ uri: siteSettings.logoUrl }} style={{ width: 22, height: 22, marginRight: 8, borderRadius: 11 }} resizeMode="contain" />
            ) : null}
            <Text style={{ fontSize: 16, fontWeight: '900', color: dyn.textMain.color }}>
              {siteSettings.siteName?.split(' ')[0]?.toLowerCase()}
              {siteSettings.siteName?.split(' ').length > 1 && (
                <Text style={{ color: '#3b82f6' }}>{siteSettings.siteName.split(' ').slice(1).join('').toLowerCase()}</Text>
              )}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={[styles.bookmarkButton, dyn.headerBtn]}>
            <Ionicons name="share-social-outline" size={22} color={dyn.textMain.color} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.bookmarkButton, dyn.headerBtn]}>
            <Ionicons name="bookmark-outline" size={22} color={dyn.textMain.color} />
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
    top: Platform.OS === 'android' ? 40 : 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bookmarkButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  heroContainer: {
    width: '100%',
    height: 350, 
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)', 
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
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -40, 
    paddingHorizontal: 20,
    paddingTop: 30,
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
    lineHeight: 32,
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
