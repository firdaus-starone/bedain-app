import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, query, orderBy, getDocs, where, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

// Kamus ikon filosofis dan modern untuk kategori berita
const ICON_MAP: Record<string, string> = {
  // Utama & Pemerintahan
  'nasional': 'map-outline',
  'politik': 'podium-outline',
  'parlemen': 'business-outline',
  'hukum': 'scale-outline',
  'kriminal': 'shield-half-outline',
  'internasional': 'globe-outline',
  'dunia': 'earth-outline',

  // Ekonomi & Bisnis
  'ekonomi': 'trending-up-outline',
  'bisnis': 'briefcase-outline',
  'finansial': 'wallet-outline',
  'keuangan': 'pie-chart-outline',
  'saham': 'stats-chart-outline',

  // Olahraga & Hobi
  'olahraga': 'trophy-outline',
  'sepakbola': 'football-outline',
  'otomotif': 'car-sport-outline',
  'game': 'game-controller-outline',
  'esports': 'headset-outline',

  // Teknologi & Sains
  'teknologi': 'hardware-chip-outline',
  'sains': 'flask-outline',
  'gadget': 'phone-portrait-outline',
  'ai-tech': 'cpu-outline',

  // Gaya Hidup & Hiburan
  'hiburan': 'sparkles-outline',
  'lifestyle': 'cafe-outline',
  'gaya-hidup': 'color-palette-outline',
  'musik': 'musical-notes-outline',
  'film': 'film-outline',
  'seni': 'brush-outline',
  'budaya': 'library-outline',

  // Kesehatan & Masyarakat
  'kesehatan': 'fitness-outline',
  'wellness': 'water-outline',
  'pendidikan': 'school-outline',
  'pariwisata': 'airplane-outline',
  'travel': 'compass-outline',
  'kuliner': 'restaurant-outline',
  'lingkungan': 'leaf-outline',
  'opini': 'create-outline',
};

// Fallback jika tidak ada di map
const FALLBACK_ICONS = ['planet-outline', 'prism-outline', 'aperture-outline', 'snow-outline', 'bonfire-outline', 'flash-outline'];
const getIconForSlug = (slug: string) => {
  if (ICON_MAP[slug]) return ICON_MAP[slug];
  
  // Deteksi kata kunci di dalam slug
  if (slug.includes('tek') || slug.includes('tech')) return 'hardware-chip-outline';
  if (slug.includes('uang') || slug.includes('ekonomi')) return 'wallet-outline';
  if (slug.includes('sehat')) return 'fitness-outline';
  if (slug.includes('bola') || slug.includes('sport')) return 'trophy-outline';
  if (slug.includes('wisata')) return 'airplane-outline';
  
  // Jika benar-benar tidak terdeteksi, pilih acak secara deterministik berdasar karakter
  const charCodeSum = slug.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return FALLBACK_ICONS[charCodeSum % FALLBACK_ICONS.length];
};

export default function CategoriesModal() {
  const router = useRouter();
  const { isDarkMode, colors } = useTheme();
  const { t, getCategoryName, translateText } = useLanguage();
  const [categories, setCategories] = useState<{ id: string, name: string, slug: string, color: string, icon: string }[]>([]);
  const [regions, setRegions] = useState<{ id: string, name: string, color: string, icon: string }[]>([]);
  const [popularTags, setPopularTags] = useState<{ name: string, count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCatsAndRegions = async () => {
      try {
        const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
        const snap = await getDocs(q);
        const data = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter(cat => cat.active !== false)
          .map(cat => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            color: cat.color || '#3b82f6',
            icon: getIconForSlug(cat.slug)
          }));
        setCategories(data);

        const qArt = query(collection(db, 'articles'), orderBy('publishedAt', 'desc'), limit(200));
        const snapArt = await getDocs(qArt);
        const uniqueLocations = new Map<string, string>(); // Menyimpan <lowercaseName, DisplayName>
        const tagCounts: Record<string, number> = {};
        const tagDisplays: Record<string, string> = {};
        
        const toTitleCase = (str: string) => {
          return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        };

        snapArt.forEach(doc => {
          const artData = doc.data();
          let rawLoc = artData.location || artData.lokasi || artData.region;
          if (rawLoc && typeof rawLoc === 'string') {
            const cleanLoc = rawLoc.trim();
            const lowerLoc = cleanLoc.toLowerCase();
            if (lowerLoc && !uniqueLocations.has(lowerLoc)) {
              // Simpan versi bersih yang dikapitalisasi awal (Title Case)
              uniqueLocations.set(lowerLoc, toTitleCase(cleanLoc));
            }
          }

          // Ekstrak tag artikel
          const rawTags = artData.tags || [];
          const tagsList = typeof rawTags === 'string' ? rawTags.split(',') : (Array.isArray(rawTags) ? rawTags : []);
          tagsList.forEach((tag: any) => {
            if (typeof tag !== 'string') return;
            const cleanTag = tag.trim().replace(/^#/, '');
            if (cleanTag && cleanTag.length >= 3) {
              const key = cleanTag.toLowerCase();
              tagCounts[key] = (tagCounts[key] || 0) + 1;
              if (!tagDisplays[key] || cleanTag === cleanTag.toUpperCase()) {
                tagDisplays[key] = cleanTag;
              }
            }
          });
        });

        // Urutkan tag paling populer
        const sortedTags = Object.entries(tagCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 16)
          .map(([key, count]) => ({
            name: tagDisplays[key] || key,
            count
          }));
        setPopularTags(sortedTags);

        const regData = Array.from(uniqueLocations.values()).map((displayLoc, i) => ({
          id: `reg-${i}`,
          name: displayLoc,
          color: '#ef4444',
          icon: 'map-outline'
        })).sort((a, b) => a.name.localeCompare(b.name));
        setRegions(regData);

      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCatsAndRegions();
  }, []);

  const handleSelectCategory = (categorySlug: string) => {
    // Navigasi ke halaman kategori khusus
    router.push(`/category/${categorySlug || 'semua'}`);
  };

  const handleSelectTag = (tagName: string) => {
    // Navigasi langsung ke pencarian artikel dengan kata kunci tag tersebut
    router.push({
      pathname: '/search',
      params: { q: tagName }
    } as any);
  };

  const dyn = {
    bg: { backgroundColor: colors.background },
    header: { backgroundColor: colors.card, borderBottomColor: colors.border },
    headerTitle: { color: colors.text },
    closeBtn: { backgroundColor: isDarkMode ? '#334155' : '#f1f5f9' },
    iconColor: isDarkMode ? '#f8fafc' : '#0f172a',
    card: { backgroundColor: colors.card, borderColor: colors.border, shadowOpacity: isDarkMode ? 0 : 0.05 },
    categoryName: { color: colors.text }
  };

  return (
    <View style={[styles.container, dyn.bg]}>
      {/* Header Tab */}
      <View style={[styles.header, dyn.header, { paddingTop: Platform.OS === 'android' ? 40 : 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <Text style={[styles.headerTitle, dyn.headerTitle]}>{t('navigation.categories', 'Kategori Berita')}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#1b61d1" style={{ marginTop: 40 }} />
        ) : (
          <View>
            {/* Section: Topik / Tag Populer (di atas Topik Utama) */}
            {popularTags.length > 0 && (
              <View style={styles.popularTagsSection}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderTitleWrap}>
                    <Ionicons name="flame" size={18} color="#ef4444" style={{ marginRight: 6 }} />
                    <Text style={[styles.sectionHeading, { color: colors.text }]}>
                      {t('categories.popular_tags', 'Topik / Tag Populer')}
                    </Text>
                  </View>
                  <Text style={styles.tagCountHint}>
                    {popularTags.length} {t('categories.hot_topics', 'Topik Hangat')}
                  </Text>
                </View>

                <View style={styles.tagsContainer}>
                  {popularTags.map((tag, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.tagChip,
                        {
                          backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#fff1f2',
                          borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.25)' : '#fecdd3',
                        }
                      ]}
                      onPress={() => handleSelectTag(tag.name)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.tagHash, { color: '#ef4444' }]}>#</Text>
                      <Text style={[styles.tagText, { color: isDarkMode ? '#f8fafc' : '#1e293b' }]}>
                        {translateText(tag.name)}
                      </Text>
                      {tag.count > 1 && (
                        <View style={[styles.tagCountBadge, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.25)' : '#ffe4e6' }]}>
                          <Text style={styles.tagCountBadgeText}>{tag.count}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Section: Topik Utama */}
            <View style={styles.sectionHeaderWrap}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>
                {t('categories.main_topics', 'Topik Utama')}
              </Text>
            </View>
            <View style={styles.gridContainer}>
              {categories.map((cat, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[styles.categoryCard, dyn.card]} 
                  onPress={() => handleSelectCategory(cat.slug)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: `${cat.color}15` }]}>
                    <Ionicons name={cat.icon as any} size={22} color={cat.color} />
                  </View>
                  <Text style={[styles.categoryName, dyn.categoryName]}>{getCategoryName(cat.slug || cat.name)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {regions.length > 0 && (
              <>
                <View style={styles.sectionHeaderWrap}>
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>
                    {t('categories.region', 'Daerah')}
                  </Text>
                </View>
                <View style={styles.gridContainer}>
                  {regions.map((reg, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={[styles.categoryCard, dyn.card]} 
                      onPress={() => router.push(`/region/${encodeURIComponent(reg.name)}`)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.iconContainer, { backgroundColor: `${reg.color}15` }]}>
                        <Ionicons name={reg.icon as any} size={22} color={reg.color} />
                      </View>
                      <Text style={[styles.categoryName, dyn.categoryName]}>{translateText(reg.name)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        )}
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
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: '2.6%',
    rowGap: 16,
    paddingBottom: 16,
  },
  sectionHeaderWrap: {
    marginBottom: 12,
    marginTop: 8,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoryCard: {
    width: '23%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 10,
    fontWeight: '500',
    color: '#1e293b',
    textAlign: 'center',
  },
  popularTagsSection: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagCountHint: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagHash: {
    fontSize: 13,
    fontWeight: '800',
    marginRight: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tagCountBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tagCountBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ef4444',
  }
});
