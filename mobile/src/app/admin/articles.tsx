import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';

export default function AdminArticles() {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');

  const fetchArticles = async () => {
    try {
      const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setArticles(data);
    } catch (error) {
      console.error("Error fetching articles:", error);
      Alert.alert("Error", "Gagal memuat berita.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchArticles();
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    try {
      await updateDoc(doc(db, 'articles', id), { status: newStatus });
      setArticles(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    } catch (error) {
      Alert.alert("Error", "Gagal mengubah status berita");
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Hapus Berita", "Apakah Anda yakin ingin menghapus berita ini secara permanen?", [
      { text: "Batal", style: "cancel" },
      { 
        text: "Hapus", 
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'articles', id));
            setArticles(prev => prev.filter(a => a.id !== id));
          } catch (error) {
            Alert.alert("Error", "Gagal menghapus berita");
          }
        }
      }
    ]);
  };

  const filteredArticles = articles.filter(a => {
    if (filter === 'all') return true;
    return a.status === filter;
  });

  const dyn = {
    container: { backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' },
    card: { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderColor: isDarkMode ? '#334155' : '#e2e8f0' },
    textMain: { color: isDarkMode ? '#f8fafc' : '#0f172a' },
    textMuted: { color: isDarkMode ? '#94a3b8' : '#64748b' },
    filterBg: { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' },
    filterText: { color: isDarkMode ? '#94a3b8' : '#64748b' },
    filterActiveBg: { backgroundColor: '#10b981' },
    filterActiveText: { color: '#ffffff' },
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.articleCard, dyn.card]}>
      <View style={styles.cardContent}>
        <View style={styles.imageContainer}>
          {item.thumbnailUrl ? (
            <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnailPlaceholder, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]}>
              <Ionicons name="image-outline" size={24} color={dyn.textMuted.color} />
            </View>
          )}
        </View>
        <View style={styles.textContent}>
          <Text style={[styles.title, dyn.textMain]} numberOfLines={2}>{item.title || 'Tanpa Judul'}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.author, dyn.textMuted]}>{item.authorName || 'Redaksi'}</Text>
            <View style={styles.dot} />
            <Ionicons name="eye-outline" size={12} color={dyn.textMuted.color} />
            <Text style={[styles.views, dyn.textMuted]}>{item.views || 0}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'published' ? '#dcfce7' : '#f1f5f9' }]}>
            <Text style={[styles.statusText, { color: item.status === 'published' ? '#166534' : '#475569' }]}>
              {item.status === 'published' ? 'Published' : 'Draft'}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => Alert.alert('Segera Hadir', 'Editor berita native sedang dirakit.')}>
          <Ionicons name="create-outline" size={18} color="#3b82f6" />
          <Text style={[styles.actionText, { color: '#3b82f6' }]}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionBtn, item.status === 'published' ? styles.draftBtn : styles.publishBtn]} 
          onPress={() => handleToggleStatus(item.id, item.status)}
        >
          <Ionicons name={item.status === 'published' ? "archive-outline" : "globe-outline"} size={18} color={item.status === 'published' ? "#d97706" : "#10b981"} />
          <Text style={[styles.actionText, { color: item.status === 'published' ? '#d97706' : '#10b981' }]}>
            {item.status === 'published' ? 'Jadikan Draft' : 'Publish'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item.id)}>
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, dyn.container]}>
      {/* Header filter */}
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterChip, dyn.filterBg, filter === 'all' && dyn.filterActiveBg]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterChipText, dyn.filterText, filter === 'all' && dyn.filterActiveText]}>Semua</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterChip, dyn.filterBg, filter === 'published' && dyn.filterActiveBg]}
          onPress={() => setFilter('published')}
        >
          <Text style={[styles.filterChipText, dyn.filterText, filter === 'published' && dyn.filterActiveText]}>Published</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterChip, dyn.filterBg, filter === 'draft' && dyn.filterActiveBg]}
          onPress={() => setFilter('draft')}
        >
          <Text style={[styles.filterChipText, dyn.filterText, filter === 'draft' && dyn.filterActiveText]}>Draft</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : (
        <FlatList
          data={filteredArticles}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color={dyn.textMuted.color} />
              <Text style={[styles.emptyText, dyn.textMuted]}>Belum ada berita {filter !== 'all' ? filter : ''}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipText: {
    fontWeight: '600',
    fontSize: 14,
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  articleCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12,
  },
  imageContainer: {
    marginRight: 12,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  thumbnailPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontWeight: 'bold',
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  author: {
    fontSize: 12,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 6,
  },
  views: {
    fontSize: 12,
    marginLeft: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    padding: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  editBtn: {
    backgroundColor: '#eff6ff',
  },
  publishBtn: {
    backgroundColor: '#f0fdf4',
  },
  draftBtn: {
    backgroundColor: '#fff7ed',
  },
  deleteBtn: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
  },
  actionText: {
    fontWeight: '600',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
  }
});
