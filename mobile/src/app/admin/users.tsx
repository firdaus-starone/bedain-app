import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';

export default function AdminUsers() {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'admin' | 'editor' | 'reader'>('all');

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsersList(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      Alert.alert("Error", "Gagal memuat daftar pengguna.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleChangeRole = (id: string, currentRole: string) => {
    Alert.alert("Ubah Hak Akses", "Pilih peran baru untuk pengguna ini:", [
      { text: "Admin", onPress: () => updateRole(id, 'admin') },
      { text: "Editor", onPress: () => updateRole(id, 'editor') },
      { text: "Reader", onPress: () => updateRole(id, 'reader') },
      { text: "Batal", style: "cancel" }
    ]);
  };

  const updateRole = async (id: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', id), { role: newRole });
      setUsersList(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
    } catch (error) {
      Alert.alert("Error", "Gagal mengubah hak akses pengguna.");
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Hapus Pengguna", "Tindakan ini akan menghapus data pengguna dari database (namun akun autentikasinya mungkin masih tersisa di Firebase Auth). Lanjutkan?", [
      { text: "Batal", style: "cancel" },
      { 
        text: "Hapus", 
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'users', id));
            setUsersList(prev => prev.filter(u => u.id !== id));
          } catch (error) {
            Alert.alert("Error", "Gagal menghapus pengguna");
          }
        }
      }
    ]);
  };

  const filteredUsers = usersList.filter(u => {
    if (filter === 'all') return true;
    return (u.role || 'reader') === filter;
  });

  const dyn = {
    container: { backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' },
    card: { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderColor: isDarkMode ? '#334155' : '#e2e8f0' },
    textMain: { color: isDarkMode ? '#f8fafc' : '#0f172a' },
    textMuted: { color: isDarkMode ? '#94a3b8' : '#64748b' },
    filterBg: { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' },
    filterText: { color: isDarkMode ? '#94a3b8' : '#64748b' },
    filterActiveBg: { backgroundColor: '#6366f1' },
    filterActiveText: { color: '#ffffff' },
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#ef4444'; // Red
      case 'editor': return '#f59e0b'; // Orange
      default: return '#3b82f6'; // Blue for reader
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const role = item.role || 'reader';
    const roleColor = getRoleColor(role);

    return (
      <View style={[styles.userCard, dyn.card]}>
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: roleColor }]}>
              <Text style={styles.avatarText}>{(item.name || item.displayName || 'U').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.userName, dyn.textMain]} numberOfLines={1}>{item.name || item.displayName || 'Pengguna Tanpa Nama'}</Text>
              <Text style={[styles.userEmail, dyn.textMuted]} numberOfLines={1}>{item.email || 'Email disembunyikan'}</Text>
            </View>
          </View>
          
          <View style={[styles.roleBadge, { backgroundColor: roleColor + '20' }]}>
            <Text style={[styles.roleText, { color: roleColor }]}>
              {role.toUpperCase()}
            </Text>
          </View>
        </View>
        
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => handleChangeRole(item.id, role)}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#3b82f6" />
            <Text style={[styles.actionText, { color: '#3b82f6' }]}>Ubah Role</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item.id)}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, dyn.container]}>
      {/* Header filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity 
            style={[styles.filterChip, dyn.filterBg, filter === 'all' && dyn.filterActiveBg]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterChipText, dyn.filterText, filter === 'all' && dyn.filterActiveText]}>Semua</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterChip, dyn.filterBg, filter === 'admin' && dyn.filterActiveBg]}
            onPress={() => setFilter('admin')}
          >
            <Text style={[styles.filterChipText, dyn.filterText, filter === 'admin' && dyn.filterActiveText]}>Admin</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterChip, dyn.filterBg, filter === 'editor' && dyn.filterActiveBg]}
            onPress={() => setFilter('editor')}
          >
            <Text style={[styles.filterChipText, dyn.filterText, filter === 'editor' && dyn.filterActiveText]}>Editor</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filterChip, dyn.filterBg, filter === 'reader' && dyn.filterActiveBg]}
            onPress={() => setFilter('reader')}
          >
            <Text style={[styles.filterChipText, dyn.filterText, filter === 'reader' && dyn.filterActiveText]}>Pembaca</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={dyn.textMuted.color} />
              <Text style={[styles.emptyText, dyn.textMuted]}>Tidak ada pengguna {filter !== 'all' ? filter : ''}</Text>
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
    padding: 16,
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
  userCard: {
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
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
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
  editBtn: {
    backgroundColor: '#eff6ff',
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
