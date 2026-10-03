import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';

export default function BookmarksScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [bookmarks, setBookmarks] = useState<any[]>([]);

  const fetchBookmarks = async () => {
    try {
      const stored = await AsyncStorage.getItem('bookmarks');
      if (stored) {
        const list = JSON.parse(stored);
        setBookmarks(list.sort((a: any, b: any) => b.savedAt - a.savedAt));
      } else {
        setBookmarks([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBookmarks();
    }, [])
  );

  const removeBookmark = async (id: string) => {
    try {
      const updatedList = bookmarks.filter(b => b.id !== id);
      setBookmarks(updatedList);
      await AsyncStorage.setItem('bookmarks', JSON.stringify(updatedList));
      Alert.alert('Terhapus', 'Berita dihapus dari daftar simpanan.');
    } catch (e) {
      console.error(e);
    }
  };

  const confirmRemove = (id: string, title: string) => {
    Alert.alert(
      "Hapus Bookmark",
      `Apakah Anda yakin ingin menghapus "${title}" dari daftar simpanan?`,
      [
        { text: "Batal", style: "cancel" },
        { text: "Hapus", style: "destructive", onPress: () => removeBookmark(id) }
      ]
    );
  };

  const dyn = {
    container: { backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' },
    header: { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderBottomColor: isDarkMode ? '#334155' : '#f1f5f9' },
    headerTitle: { color: isDarkMode ? '#f8fafc' : '#0f172a' },
    iconColor: isDarkMode ? '#f8fafc' : '#0f172a',
    card: { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderBottomColor: isDarkMode ? '#334155' : '#f1f5f9' },
    title: { color: isDarkMode ? '#f8fafc' : '#334155' },
    emptyText: { color: isDarkMode ? '#94a3b8' : '#64748b' },
    closeBtn: { backgroundColor: isDarkMode ? '#334155' : '#f1f5f9' },
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.card, dyn.card]} 
      onPress={() => router.push(`/article/${item.id}` as any)}
    >
      <Image source={{ uri: item.thumb }} style={styles.thumb} />
      <View style={styles.cardContent}>
        <Text style={styles.category}>{item.category?.toUpperCase() || 'BERITA'}</Text>
        <Text style={[styles.title, dyn.title]} numberOfLines={2}>{item.title}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.date}>Tersimpan: {new Date(item.savedAt).toLocaleDateString('id-ID')}</Text>
          <TouchableOpacity onPress={() => confirmRemove(item.id, item.title)} style={styles.removeBtn}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, dyn.container]}>
      {/* Header Modal */}
      <View style={[styles.header, dyn.header]}>
        <Text style={[styles.headerTitle, dyn.headerTitle]}>Bookmark & Tersimpan</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.closeBtn, dyn.closeBtn]}>
          <Ionicons name="close" size={24} color={dyn.iconColor} />
        </TouchableOpacity>
      </View>

      {bookmarks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="bookmark-outline" size={64} color="#cbd5e1" style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyText, dyn.emptyText]}>Belum ada berita yang disimpan.</Text>
          <Text style={[styles.emptySubtext, dyn.emptyText]}>Klik ikon pita pada berita yang ingin Anda baca nanti.</Text>
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    bottom: 16,
    padding: 4,
    borderRadius: 20,
  },
  listContainer: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#e2e8f0',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  category: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 11,
    color: '#94a3b8',
  },
  removeBtn: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
