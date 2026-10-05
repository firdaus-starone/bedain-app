import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';

export default function AdminComments() {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending');

  const fetchComments = async () => {
    try {
      const q = query(collection(db, 'comments'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setComments(data);
    } catch (error) {
      console.error("Error fetching comments:", error);
      Alert.alert("Error", "Gagal memuat komentar.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchComments();
  };

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(db, 'comments', id), { status: 'approved' });
      setComments(prev => prev.map(c => c.id === id ? { ...c, status: 'approved' } : c));
    } catch (error) {
      Alert.alert("Error", "Gagal menyetujui komentar");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateDoc(doc(db, 'comments', id), { status: 'rejected' });
      setComments(prev => prev.map(c => c.id === id ? { ...c, status: 'rejected' } : c));
    } catch (error) {
      Alert.alert("Error", "Gagal menolak komentar");
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Hapus Komentar", "Apakah Anda yakin ingin menghapus komentar ini permanen?", [
      { text: "Batal", style: "cancel" },
      { 
        text: "Hapus", 
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'comments', id));
            setComments(prev => prev.filter(c => c.id !== id));
          } catch (error) {
            Alert.alert("Error", "Gagal menghapus komentar");
          }
        }
      }
    ]);
  };

  const filteredComments = comments.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const dyn = {
    container: { backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' },
    card: { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderColor: isDarkMode ? '#334155' : '#e2e8f0' },
    textMain: { color: isDarkMode ? '#f8fafc' : '#0f172a' },
    textMuted: { color: isDarkMode ? '#94a3b8' : '#64748b' },
    filterBg: { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' },
    filterText: { color: isDarkMode ? '#94a3b8' : '#64748b' },
    filterActiveBg: { backgroundColor: '#1b61d1' },
    filterActiveText: { color: '#ffffff' },
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.commentCard, dyn.card]}>
      <View style={styles.cardHeader}>
        <View style={styles.authorInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.authorName?.charAt(0).toUpperCase() || '?'}</Text>
          </View>
          <View>
            <Text style={[styles.authorName, dyn.textMain]}>{item.authorName || 'Anonim'}</Text>
            <Text style={[styles.articleTitle, dyn.textMuted]} numberOfLines={1}>di: {item.articleTitle}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'approved' ? '#dcfce7' : item.status === 'rejected' ? '#fee2e2' : '#fef9c3' }]}>
          <Text style={[styles.statusText, { color: item.status === 'approved' ? '#166534' : item.status === 'rejected' ? '#991b1b' : '#854d0e' }]}>
            {item.status === 'approved' ? 'Disetujui' : item.status === 'rejected' ? 'Ditolak' : 'Pending'}
          </Text>
        </View>
      </View>
      
      <Text style={[styles.commentContent, dyn.textMain]}>{item.content}</Text>
      
      <View style={styles.actionRow}>
        {item.status !== 'approved' && (
          <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleApprove(item.id)}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#16a34a" />
            <Text style={[styles.actionText, { color: '#16a34a' }]}>Setujui</Text>
          </TouchableOpacity>
        )}
        
        {item.status !== 'rejected' && (
          <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleReject(item.id)}>
            <Ionicons name="close-circle-outline" size={18} color="#d97706" />
            <Text style={[styles.actionText, { color: '#d97706' }]}>Tolak</Text>
          </TouchableOpacity>
        )}
        
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
          style={[styles.filterChip, dyn.filterBg, filter === 'pending' && dyn.filterActiveBg]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterChipText, dyn.filterText, filter === 'pending' && dyn.filterActiveText]}>Pending</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterChip, dyn.filterBg, filter === 'approved' && dyn.filterActiveBg]}
          onPress={() => setFilter('approved')}
        >
          <Text style={[styles.filterChipText, dyn.filterText, filter === 'approved' && dyn.filterActiveText]}>Disetujui</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterChip, dyn.filterBg, filter === 'all' && dyn.filterActiveBg]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterChipText, dyn.filterText, filter === 'all' && dyn.filterActiveText]}>Semua</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1b61d1" />
        </View>
      ) : (
        <FlatList
          data={filteredComments}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={dyn.textMuted.color} />
              <Text style={[styles.emptyText, dyn.textMuted]}>Tidak ada komentar {filter !== 'all' ? filter : ''}</Text>
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
  commentCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1b61d1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  authorName: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  articleTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  commentContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  approveBtn: {
    backgroundColor: '#f0fdf4',
  },
  rejectBtn: {
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
