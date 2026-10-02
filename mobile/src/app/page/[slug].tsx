import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import RenderHtml from 'react-native-render-html';

export default function StaticPage() {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [pageData, setPageData] = useState<{ title: string, content: string } | null>(null);

  const pageSlug = typeof slug === 'string' ? slug : '';

  useEffect(() => {
    const fetchPage = async () => {
      if (!pageSlug) return;
      try {
        const q = query(collection(db, 'pages'), where('slug', '==', pageSlug));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data();
          setPageData({
            title: docData.title,
            content: docData.content || ''
          });
        }
      } catch (error) {
        console.error("Error fetching page:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [pageSlug]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {loading ? 'Memuat...' : (pageData?.title || 'Halaman Tidak Ditemukan')}
        </Text>
        <View style={{ width: 40 }} /> {/* Spacer */}
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          {loading ? (
            <ActivityIndicator size="large" color="#1b61d1" style={{ marginTop: 40 }} />
          ) : pageData ? (
            <>
              <Text style={styles.pageTitle}>{pageData.title}</Text>
              <RenderHtml
                contentWidth={width - 72}
                baseStyle={{ 
                  textAlign: 'left',
                  fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif'
                }}
                source={{ html: (() => {
                  const html = pageData.content || '<p>Tidak ada konten.</p>';
                  const cleanHtml = html
                    .replace(/justify/gi, 'left')
                    .replace(/&nbsp;/g, ' ')
                    .replace(/\u00A0/g, ' ');
                  return `<div style="text-align: left;">${cleanHtml}</div>`;
                })() }}
                tagsStyles={{
                  body: { textAlign: 'left' },
                  div: { textAlign: 'left' },
                  span: { textAlign: 'left' },
                  p: { fontSize: 15, lineHeight: 24, color: '#334155', marginBottom: 10, textAlign: 'left' },
                  h1: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', marginBottom: 8, textAlign: 'left' },
                  h2: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 8, textAlign: 'left' },
                  li: { fontSize: 15, lineHeight: 24, color: '#334155', marginBottom: 6, textAlign: 'left' },
                  a: { color: '#1b61d1', textDecorationLine: 'underline' }
                }}
              />
            </>
          ) : (
            <>
              <Text style={styles.pageTitle}>Halaman Tidak Ditemukan</Text>
              <Text style={styles.pageContent}>Maaf, informasi yang Anda cari belum tersedia atau URL tidak valid.</Text>
              
              <View style={styles.illustrationBox}>
                <Ionicons name="newspaper-outline" size={64} color="#cbd5e1" />
                <Text style={styles.illustrationText}>Data lebih lengkap akan segera ditambahkan oleh tim redaksi.</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    minHeight: 300,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 16,
  },
  pageContent: {
    fontSize: 16,
    lineHeight: 26,
    color: '#475569',
  },
  illustrationBox: {
    marginTop: 40,
    padding: 24,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  illustrationText: {
    marginTop: 12,
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    fontWeight: '500',
  }
});
