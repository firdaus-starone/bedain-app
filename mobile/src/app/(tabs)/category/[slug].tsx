import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, getDocs, limit, startAfter } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function CategoryPage() {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  
  const [categoryName, setCategoryName] = useState<string>('Kategori');
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const mapArticleData = (doc: any, catName: string) => {
    const a = doc.data();
    let dateStr = 'Baru saja';
    if (a.publishedAt) {
      const dateObj = typeof a.publishedAt.toDate === 'function' ? a.publishedAt.toDate() : new Date(a.publishedAt);
      dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return {
      id: doc.id,
      title: a.title,
      category: a.category || catName,
      date: dateStr,
      image: a.coverImage || a.imageUrl || 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=400&q=80',
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Dapatkan nama kategori berdasarkan slug
        let catName = '';
        if (slug && slug !== 'semua' && slug !== '') {
          const catQuery = query(collection(db, 'categories'), where('slug', '==', slug));
          const catSnap = await getDocs(catQuery);
          if (!catSnap.empty) {
            catName = catSnap.docs[0].data().name;
          } else {
            catName = String(slug).charAt(0).toUpperCase() + String(slug).slice(1);
          }
        } else {
          catName = 'Semua Berita';
        }
        setCategoryName(catName);

        // 2. Fetch 20 artikel pertama
        let q;
        if (catName === 'Semua Berita') {
           q = query(
             collection(db, 'articles'),
             where('status', '==', 'published'),
             orderBy('publishedAt', 'desc'),
             limit(20)
           );
        } else {
           q = query(
             collection(db, 'articles'),
             where('status', '==', 'published'),
             where('category', '==', catName),
             orderBy('publishedAt', 'desc'),
             limit(20)
           );
        }
        
        const snap = await getDocs(q);
        if (!snap.empty) {
          setLastDoc(snap.docs[snap.docs.length - 1]);
          if (snap.docs.length < 20) setHasMore(false);
          else setHasMore(true);
        } else {
          setHasMore(false);
        }

        const data = snap.docs.map(doc => mapArticleData(doc, catName));
        setArticles(data);
      } catch (error) {
        console.error("Error fetching category data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  const loadMore = async () => {
    if (!lastDoc || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      let q;
      if (categoryName === 'Semua Berita') {
         q = query(
           collection(db, 'articles'),
           where('status', '==', 'published'),
           orderBy('publishedAt', 'desc'),
           startAfter(lastDoc),
           limit(20)
         );
      } else {
         q = query(
           collection(db, 'articles'),
           where('status', '==', 'published'),
           where('category', '==', categoryName),
           orderBy('publishedAt', 'desc'),
           startAfter(lastDoc),
           limit(20)
         );
      }
      
      const snap = await getDocs(q);
      if (!snap.empty) {
        setLastDoc(snap.docs[snap.docs.length - 1]);
        if (snap.docs.length < 20) setHasMore(false);
        const moreData = snap.docs.map(doc => mapArticleData(doc, categoryName));
        setArticles(prev => [...prev, ...moreData]);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const renderArticle = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.articleCard}
      onPress={() => router.push(`/article/${item.id}`)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.image }} style={styles.articleImage} />
      <View style={styles.articleContent}>
        <Text style={styles.categoryTag}>{item.category.toUpperCase()}</Text>
        <Text style={styles.articleTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.articleDate}>{item.date}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!hasMore) {
      if (articles.length === 0) return null;
      return (
        <View style={styles.footerContainer}>
          <Text style={styles.endText}>Tidak ada berita lagi.</Text>
        </View>
      );
    }
    return (
      <TouchableOpacity 
        style={styles.loadMoreBtn} 
        onPress={loadMore} 
        disabled={loadingMore}
      >
        {loadingMore ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.loadMoreText}>Lihat Lebih Banyak</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{categoryName}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1b61d1" />
        </View>
      ) : articles.length > 0 ? (
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id}
          renderItem={renderArticle}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={renderFooter}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="newspaper-outline" size={64} color="#cbd5e1" />
          <Text style={styles.emptyText}>Belum ada berita di kategori ini.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  articleCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  articleImage: {
    width: 84,
    height: 84,
    borderRadius: 8,
  },
  articleContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  categoryTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#3b82f6',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  articleTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    lineHeight: 20,
    marginBottom: 6,
  },
  articleDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
  loadMoreBtn: {
    backgroundColor: '#1b61d1',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  loadMoreText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  footerContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  endText: {
    color: '#94a3b8',
    fontSize: 12,
    fontStyle: 'italic',
  }
});
