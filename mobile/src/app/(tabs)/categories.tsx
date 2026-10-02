import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useTheme } from '../../context/ThemeContext';

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
  const [categories, setCategories] = useState<{ id: string, name: string, slug: string, color: string, icon: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCats = async () => {
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
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCats();
  }, []);

  const handleSelectCategory = (categorySlug: string) => {
    // Navigasi ke halaman kategori khusus
    router.push(`/category/${categorySlug || 'semua'}`);
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
      <View style={[styles.header, dyn.header, { paddingTop: Platform.OS === 'android' ? 40 : 50 }]}>
        <Text style={[styles.headerTitle, dyn.headerTitle]}>Kategori Berita</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#1b61d1" style={{ marginTop: 40 }} />
        ) : (
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
                <Text style={[styles.categoryName, dyn.categoryName]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
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
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  }
});
