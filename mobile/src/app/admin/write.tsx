import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../../lib/firebase';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';

export default function AdminWriteArticle() {
  const { isDarkMode, colors } = useTheme();
  const router = useRouter();

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Nasional');
  const [categories, setCategories] = useState<string[]>(['Nasional', 'Politik', 'Ekonomi', 'Daerah', 'Hukum', 'Olahraga', 'Teknologi', 'Hiburan']);
  const [location, setLocation] = useState('Padang');
  const [contributorName, setContributorName] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [content, setContent] = useState('');
  const [isHeadline, setIsHeadline] = useState(false);
  const [isBreakingNews, setIsBreakingNews] = useState(false);
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [tags, setTags] = useState('');
  const [slug, setSlug] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  // UI / Action states
  const [saving, setSaving] = useState(false);
  const [savingStage, setSavingStage] = useState('');
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [catSearch, setCatSearch] = useState('');

  // Fetch categories & current user info
  useEffect(() => {
    const fetchInitData = async () => {
      try {
        const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
        const snap = await getDocs(q);
        const fetchedCats = snap.docs
          .map((d) => d.data())
          .filter((c: any) => c.active !== false)
          .map((c: any) => c.name as string)
          .filter(Boolean);

        if (fetchedCats.length > 0) {
          setCategories(fetchedCats);
          if (!category || category === 'Nasional') {
            setCategory(fetchedCats[0]);
          }
        }
      } catch (err) {
        console.warn('Gagal memuat kategori:', err);
      }

      try {
        const user = auth.currentUser;
        if (user) {
          const userSnap = await getDoc(doc(db, 'users', user.uid));
          if (userSnap.exists() && userSnap.data().name) {
            setContributorName(userSnap.data().name);
          } else if (user.displayName) {
            setContributorName(user.displayName);
          }
        }
      } catch (err) {
        console.warn('Gagal memuat profil pengguna:', err);
      }
    };

    fetchInitData();
  }, []);

  // Image picker
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal membuka galeri foto di perangkat.');
    }
  };

  // Content stats
  const wordCount = useMemo(() => {
    const text = content.trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
  }, [content]);

  const readingTimeMinutes = useMemo(() => {
    return Math.max(1, Math.ceil(wordCount / 180));
  }, [wordCount]);

  // Auto SEO & Tag generator
  const handleAutoSEO = () => {
    if (!title.trim()) {
      Alert.alert('Perhatian', 'Isi judul berita terlebih dahulu.');
      return;
    }

    // Auto slug
    const generatedSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setSlug(generatedSlug);

    // Auto SEO Title
    setSeoTitle(title.trim());

    // Auto SEO Description
    const plainText = content.replace(/\s+/g, ' ').trim();
    if (plainText) {
      setSeoDescription(plainText.substring(0, 155) + (plainText.length > 155 ? '...' : ''));
    }

    // Auto tags
    if (!tags.trim()) {
      const stopWords = [
        'yang', 'di', 'dan', 'ke', 'dari', 'ini', 'itu', 'untuk', 'dengan', 'pada', 'adalah',
        'dalam', 'sebagai', 'tidak', 'akan', 'bisa', 'juga', 'sudah', 'saat', 'oleh', 'karena',
        'atau', 'ada', 'mereka', 'kita', 'kami', 'saya', 'dia', 'hingga', 'namun', 'telah',
        'setelah', 'lebih', 'menjadi', 'hanya', 'banyak', 'sangat', 'seperti', 'lagi', 'terus',
      ];
      const titleWords = title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stopWords.includes(w));
      const uniqueKeywords = Array.from(new Set(titleWords)).slice(0, 4);
      if (location.trim() && !uniqueKeywords.includes(location.trim().toLowerCase())) {
        uniqueKeywords.unshift(location.trim().toLowerCase());
      }
      const formattedTags = uniqueKeywords
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(', ');
      setTags(formattedTags);
    }

    Alert.alert('⚡ Sukses Auto-Generate', 'Slug, Tag, SEO Title, dan Deskripsi berhasil dirangkai otomatis!');
  };

  // Helper Auto-Format paragraf jurnalistik (30-50 kata per paragraf)
  const handleAutoFormatParagraphs = () => {
    if (!content.trim()) {
      Alert.alert('Perhatian', 'Tuliskan isi berita terlebih dahulu.');
      return;
    }

    const words = content.replace(/\s+/g, ' ').trim().split(' ');
    if (words.length < 30) {
      Alert.alert('Info', 'Isi berita masih pendek, pemformatan tidak diperlukan.');
      return;
    }

    const paragraphs: string[] = [];
    let currentParagraph: string[] = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      currentParagraph.push(word);

      const minWords = 30;
      const maxWords = 50;
      const isSentenceEnd = /[.?!]["']?$/.test(word);
      const len = currentParagraph.length;

      if ((len >= minWords && isSentenceEnd) || len >= maxWords) {
        paragraphs.push(currentParagraph.join(' '));
        currentParagraph = [];
      }
    }

    if (currentParagraph.length > 0) {
      paragraphs.push(currentParagraph.join(' '));
    }

    setContent(paragraphs.join('\n\n'));
    Alert.alert('✨ Berhasil Dirapikan', 'Isi berita berhasil ditata menjadi paragraf-paragraf ideal (30-50 kata) agar nyaman dibaca.');
  };

  // Helper insert BACA JUGA
  const handleInsertBacaJuga = () => {
    const template = `\n\n[BACA JUGA: Tulis judul artikel terkait di sini]\n\n`;
    setContent((prev) => prev + template);
  };

  // Convert plain text to standard HTML <p>...</p> for web editor (Quill)
  const formatContentForWeb = (rawText: string): string => {
    if (!rawText) return '';
    // If it already has HTML paragraphs, keep it
    if (/<p[\s>]|<div[\s>]|<br\s*\/?>/i.test(rawText)) {
      return rawText;
    }

    // Split by 2 or more newlines
    const paragraphs = rawText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (paragraphs.length === 0) {
      return `<p>${rawText.trim()}</p>`;
    }

    return paragraphs
      .map((p) => {
        // If it's a BACA JUGA block
        if (p.includes('[BACA JUGA:')) {
          const titleText = p.replace(/\[BACA JUGA:\s*/i, '').replace(/\]$/, '').trim();
          return `<div style="margin: 20px 0; padding: 14px 18px; background: rgba(239, 68, 68, 0.08); border-left: 4px solid #ef4444; border-radius: 8px;"><strong style="color: #ef4444; font-size: 13px; text-transform: uppercase; display: block; margin-bottom: 6px;">BACA JUGA:</strong><p style="margin: 0; font-weight: 600;">${titleText}</p></div>`;
        }
        return `<p>${p.replace(/\n/g, '<br/>')}</p>`;
      })
      .join('<p><br></p>');
  };

  // Save handler (Draft or Publish)
  const handleSaveArticle = async (targetStatus: 'draft' | 'published') => {
    if (!title.trim()) {
      Alert.alert('⚠️ Judul Wajib Diisi', 'Silakan masukkan judul berita sebelum menyimpan.');
      return;
    }

    if (!content.trim()) {
      Alert.alert('⚠️ Isi Berita Wajib Diisi', 'Silakan tulis isi berita sebelum menyimpan.');
      return;
    }

    setSaving(true);
    setSavingStage('Menyiapkan data...');

    try {
      const user = auth.currentUser;
      const authorDisplayName =
        contributorName.trim() ||
        user?.displayName ||
        user?.email?.split('@')[0] ||
        'Tim Redaksi';

      // 1. Upload Cover Image if selected
      let uploadedImageUrl = '';
      if (imageUri) {
        setSavingStage('Mengunggah foto sampul ke server...');
        try {
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const filename = `articles/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
          const imageRef = ref(storage, filename);
          await uploadBytes(imageRef, blob);
          uploadedImageUrl = await getDownloadURL(imageRef);
        } catch (uploadError) {
          console.error('Gagal upload gambar:', uploadError);
          Alert.alert('Peringatan Foto', 'Gagal mengunggah foto sampul. Berita akan tetap disimpan tanpa foto atau Anda bisa mencoba lagi.');
        }
      }

      setSavingStage('Menyimpan artikel ke database...');

      // 2. Prepare slug
      let finalSlug = slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      if (!finalSlug && title.trim()) {
        finalSlug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      }
      if (!finalSlug) {
        finalSlug = `berita-${Date.now()}`;
      } else {
        finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
      }

      // 3. Prepare tags array
      let tagsStr = tags.trim();
      if (location.trim()) {
        const loc = location.trim();
        if (!tagsStr.toLowerCase().includes(loc.toLowerCase())) {
          tagsStr = tagsStr ? `${tagsStr}, ${loc}` : loc;
        }
      }
      const tagsArray = tagsStr
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      // 4. Prepare SEO description
      const strippedContent = content.replace(/\s+/g, ' ').trim();
      const finalSeoDesc = seoDescription.trim() || (strippedContent.substring(0, 155) + (strippedContent.length > 155 ? '...' : ''));
      const finalSeoTitle = seoTitle.trim() || title.trim();

      // 5. Build payload 100% compatible with Web Editor (ArticleEditor.jsx)
      const articlePayload = {
        title: title.trim(),
        slug: finalSlug,
        category: category || 'Nasional',
        status: targetStatus,
        coverImage: uploadedImageUrl,
        imageUrl: uploadedImageUrl,
        thumbnailUrl: uploadedImageUrl, // for maximum backward compatibility
        imageCaption: imageCaption.trim(),
        videoUrl: videoUrl.trim(),
        content: formatContentForWeb(content),
        isHeadline: isHeadline,
        isBreakingNews: isBreakingNews,
        seoTitle: finalSeoTitle,
        seoDescription: finalSeoDesc,
        tags: tagsArray,
        location: location.trim(),
        contributorName: authorDisplayName,
        authorId: user?.uid || 'unknown',
        authorName: authorDisplayName,
        author: {
          email: user?.email || '',
          name: authorDisplayName,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        publishedAt: targetStatus === 'published' ? serverTimestamp() : null,
        scheduledAt: null,
        views: 0,
        commentCount: 0,
        reactions: {},
      };

      await addDoc(collection(db, 'articles'), articlePayload);

      const isPub = targetStatus === 'published';
      Alert.alert(
        isPub ? '🎉 Berita Berhasil Diterbitkan!' : '📁 Draft Berhasil Disimpan!',
        `Artikel "${title.trim()}" telah sukses tersimpan di database Bedain News dan dapat dibuka/diedit dengan lancar melalui Dashboard Web maupun Mobile.`,
        [
          {
            text: 'Lihat Daftar Berita',
            onPress: () => router.replace('/admin/articles'),
          },
          {
            text: 'Selesai',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error saving article:', error);
      Alert.alert('Gagal Menyimpan', 'Terjadi kendala saat menyimpan artikel: ' + (error?.message || 'Silakan periksa koneksi internet Anda.'));
    } finally {
      setSaving(false);
      setSavingStage('');
    }
  };

  // Filtered categories for modal search
  const filteredCats = categories.filter((c) =>
    c.toLowerCase().includes(catSearch.toLowerCase())
  );

  // Dynamic theme colors
  const dyn = {
    container: { backgroundColor: isDarkMode ? '#090d16' : '#f1f5f9' },
    card: {
      backgroundColor: isDarkMode ? '#131b2e' : '#ffffff',
      borderColor: isDarkMode ? '#1e293b' : '#e2e8f0',
    },
    cardHeaderBorder: { borderBottomColor: isDarkMode ? '#1e293b' : '#f1f5f9' },
    textMain: { color: isDarkMode ? '#f8fafc' : '#0f172a' },
    textMuted: { color: isDarkMode ? '#94a3b8' : '#64748b' },
    inputBg: {
      backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
      borderColor: isDarkMode ? '#1e293b' : '#cbd5e1',
      color: isDarkMode ? '#f8fafc' : '#0f172a',
    },
    activeChip: {
      backgroundColor: '#1b61d1',
      borderColor: '#1b61d1',
    },
    inactiveChip: {
      backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    footerBg: {
      backgroundColor: isDarkMode ? '#131b2e' : '#ffffff',
      borderTopColor: isDarkMode ? '#1e293b' : '#e2e8f0',
    },
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, dyn.container]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Banner Sinkronisasi Web */}
        <View style={[styles.syncBanner, { backgroundColor: isDarkMode ? 'rgba(27, 97, 209, 0.12)' : '#eff6ff', borderColor: isDarkMode ? 'rgba(27, 97, 209, 0.3)' : '#bfdbfe' }]}>
          <View style={styles.syncIconBox}>
            <Ionicons name="cloud-done-outline" size={20} color="#1b61d1" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.syncTitle, { color: isDarkMode ? '#93c5fd' : '#1e3a8a' }]}>
              Kompatibel Penuh dengan Editor Web
            </Text>
            <Text style={[styles.syncText, { color: isDarkMode ? '#bfdbfe' : '#3b82f6' }]}>
              Form ini telah disesuaikan dengan struktur Dashboard Web Bedain News. Setiap data foto, caption, paragraf, dan tag siap diedit ulang di browser tanpa kendala.
            </Text>
          </View>
        </View>

        {/* 1. INFORMASI UTAMA */}
        <View style={[styles.card, dyn.card]}>
          <View style={[styles.cardHeader, dyn.cardHeaderBorder]}>
            <View style={[styles.badgeIcon, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="newspaper-outline" size={16} color="#1d4ed8" />
            </View>
            <Text style={[styles.cardTitle, dyn.textMain]}>1. Informasi Utama</Text>
          </View>

          <View style={styles.cardBody}>
            {/* Judul Berita */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, dyn.textMain]}>
                  Judul Berita <Text style={styles.requiredStar}>*</Text>
                </Text>
                <Text style={[styles.charCount, dyn.textMuted]}>{title.length} karakter</Text>
              </View>
              <TextInput
                style={[styles.input, styles.titleInput, dyn.inputBg]}
                placeholder="Tulis judul berita yang menarik, padat, dan akurat..."
                placeholderTextColor={dyn.textMuted.color}
                value={title}
                onChangeText={setTitle}
                multiline
              />
            </View>

            {/* Kategori Berita */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, dyn.textMain]}>
                  Kategori Berita <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TouchableOpacity onPress={() => setCatModalVisible(true)} style={styles.moreCatsBtn}>
                  <Text style={styles.moreCatsText}>Lihat Semua</Text>
                  <Ionicons name="chevron-forward" size={14} color="#1b61d1" />
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                {categories.slice(0, 8).map((catName) => {
                  const isSelected = category === catName;
                  return (
                    <TouchableOpacity
                      key={catName}
                      style={[
                        styles.catChip,
                        isSelected ? dyn.activeChip : dyn.inactiveChip,
                      ]}
                      onPress={() => setCategory(catName)}
                      activeOpacity={0.7}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={14} color="#fff" style={{ marginRight: 4 }} />
                      )}
                      <Text
                        style={[
                          styles.catChipText,
                          isSelected ? styles.catChipTextActive : { color: dyn.textMain.color },
                        ]}
                      >
                        {catName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Lokasi & Nama Jurnalis / Kontributor */}
            <View style={styles.twoColRow}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.fieldLabel, dyn.textMain]}>Lokasi Peliputan</Text>
                <View style={[styles.inputWithIcon, dyn.inputBg]}>
                  <Ionicons name="location-outline" size={16} color={dyn.textMuted.color} style={{ marginRight: 6 }} />
                  <TextInput
                    style={[styles.flexInput, { color: dyn.textMain.color }]}
                    placeholder="Contoh: Padang"
                    placeholderTextColor={dyn.textMuted.color}
                    value={location}
                    onChangeText={setLocation}
                  />
                </View>
              </View>

              <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.fieldLabel, dyn.textMain]}>Nama Penulis / Redaksi</Text>
                <View style={[styles.inputWithIcon, dyn.inputBg]}>
                  <Ionicons name="person-outline" size={16} color={dyn.textMuted.color} style={{ marginRight: 6 }} />
                  <TextInput
                    style={[styles.flexInput, { color: dyn.textMain.color }]}
                    placeholder="Nama Jurnalis"
                    placeholderTextColor={dyn.textMuted.color}
                    value={contributorName}
                    onChangeText={setContributorName}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 2. FOTO SAMPUL & MEDIA */}
        <View style={[styles.card, dyn.card]}>
          <View style={[styles.cardHeader, dyn.cardHeaderBorder]}>
            <View style={[styles.badgeIcon, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="image-outline" size={16} color="#d97706" />
            </View>
            <Text style={[styles.cardTitle, dyn.textMain]}>2. Foto Sampul & Media</Text>
          </View>

          <View style={styles.cardBody}>
            <Text style={[styles.fieldLabel, dyn.textMain]}>Foto Sampul Utama (Rasio 16:9)</Text>

            {imageUri ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                <View style={styles.previewOverlayActions}>
                  <TouchableOpacity style={styles.overlayBtn} onPress={pickImage} activeOpacity={0.8}>
                    <Ionicons name="camera-reverse" size={16} color="#fff" />
                    <Text style={styles.overlayBtnText}>Ganti Foto</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.overlayBtn, styles.overlayBtnDanger]}
                    onPress={() => setImageUri(null)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash" size={16} color="#fff" />
                    <Text style={styles.overlayBtnText}>Hapus</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.imageUploadBox, dyn.inputBg]}
                onPress={pickImage}
                activeOpacity={0.7}
              >
                <View style={styles.uploadIconCircle}>
                  <Ionicons name="cloud-upload-outline" size={28} color="#1b61d1" />
                </View>
                <Text style={[styles.uploadPromptText, dyn.textMain]}>Pilih Foto Sampul Berita</Text>
                <Text style={[styles.uploadHintText, dyn.textMuted]}>Format JPG/PNG, disarankan rasio lanskap 16:9</Text>
              </TouchableOpacity>
            )}

            {/* Keterangan Foto / Image Caption */}
            <View style={[styles.fieldGroup, { marginTop: 14 }]}>
              <Text style={[styles.fieldLabel, dyn.textMain]}>Keterangan Foto (Caption)</Text>
              <TextInput
                style={[styles.input, dyn.inputBg]}
                placeholder="Contoh: Suasana pelantikan pejabat di Istana Negara, Senin (19/10). / Foto: Antara"
                placeholderTextColor={dyn.textMuted.color}
                value={imageCaption}
                onChangeText={setImageCaption}
              />
              <Text style={[styles.hintSmall, dyn.textMuted]}>
                Keterangan ini akan langsung sinkron dengan kolom caption di Web Editor.
              </Text>
            </View>

            {/* Link Video YouTube (Opsional) */}
            <View style={[styles.fieldGroup, { marginTop: 8 }]}>
              <Text style={[styles.fieldLabel, dyn.textMain]}>Link Video YouTube (Opsional)</Text>
              <View style={[styles.inputWithIcon, dyn.inputBg]}>
                <Ionicons name="logo-youtube" size={18} color="#ef4444" style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.flexInput, { color: dyn.textMain.color }]}
                  placeholder="https://www.youtube.com/watch?v=..."
                  placeholderTextColor={dyn.textMuted.color}
                  value={videoUrl}
                  onChangeText={setVideoUrl}
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>
        </View>

        {/* 3. ISI BERITA (KONTEN LENGKAP) */}
        <View style={[styles.card, dyn.card]}>
          <View style={[styles.cardHeader, dyn.cardHeaderBorder]}>
            <View style={[styles.badgeIcon, { backgroundColor: '#f3e8ff' }]}>
              <Ionicons name="document-text-outline" size={16} color="#7c3aed" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, dyn.textMain]}>3. Isi Berita (Konten Lengkap)</Text>
            </View>
            <View style={styles.statsPill}>
              <Text style={styles.statsPillText}>
                {wordCount} kata • {readingTimeMinutes} min
              </Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            {/* Quick formatting toolbar */}
            <View style={styles.contentToolbar}>
              <TouchableOpacity
                style={[styles.toolBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#eff6ff' }]}
                onPress={handleAutoFormatParagraphs}
              >
                <Ionicons name="sparkles" size={14} color="#1b61d1" />
                <Text style={[styles.toolBtnText, { color: '#1b61d1' }]}>Rapikan Paragraf</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toolBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#fef2f2' }]}
                onPress={handleInsertBacaJuga}
              >
                <Ionicons name="bookmark-outline" size={14} color="#ef4444" />
                <Text style={[styles.toolBtnText, { color: '#ef4444' }]}>+ Baca Juga</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toolBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc' }]}
                onPress={() => setContent((prev) => prev + '\n\n')}
              >
                <Ionicons name="return-down-forward" size={14} color={dyn.textMuted.color} />
                <Text style={[styles.toolBtnText, { color: dyn.textMuted.color }]}>Enter Baru</Text>
              </TouchableOpacity>
            </View>

            {/* TextArea Isi Berita */}
            <TextInput
              style={[styles.textArea, dyn.inputBg]}
              placeholder="Tuliskan berita lengkap di sini... Pisahkan setiap paragraf dengan menekan tombol Enter dua kali agar rapi saat dibuka di editor web."
              placeholderTextColor={dyn.textMuted.color}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />
            <Text style={[styles.hintSmall, dyn.textMuted, { marginTop: 8 }]}>
              Tips: Paragraf akan otomatis dikonversi ke format &lt;p&gt; standar HTML agar saat dibuka di Editor Web (ReactQuill) susunannya tetap rapi dan tidak bertumpuk.
            </Text>
          </View>
        </View>

        {/* 4. PENGATURAN PUBLIKASI & TIPE BERITA */}
        <View style={[styles.card, dyn.card]}>
          <View style={[styles.cardHeader, dyn.cardHeaderBorder]}>
            <View style={[styles.badgeIcon, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="settings-outline" size={16} color="#15803d" />
            </View>
            <Text style={[styles.cardTitle, dyn.textMain]}>4. Opsi Publikasi</Text>
          </View>

          <View style={styles.cardBody}>
            {/* Status Switcher (Draft vs Published) */}
            <Text style={[styles.fieldLabel, dyn.textMain]}>Status Publikasi Awal</Text>
            <View style={styles.statusSegment}>
              <TouchableOpacity
                style={[
                  styles.statusTab,
                  status === 'draft' && styles.statusTabActiveDraft,
                ]}
                onPress={() => setStatus('draft')}
              >
                <Ionicons
                  name="folder-outline"
                  size={16}
                  color={status === 'draft' ? '#1b61d1' : dyn.textMuted.color}
                />
                <Text
                  style={[
                    styles.statusTabText,
                    status === 'draft' && styles.statusTabTextActiveDraft,
                  ]}
                >
                  Simpan Draft
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusTab,
                  status === 'published' && styles.statusTabActivePub,
                ]}
                onPress={() => setStatus('published')}
              >
                <Ionicons
                  name="globe-outline"
                  size={16}
                  color={status === 'published' ? '#166534' : dyn.textMuted.color}
                />
                <Text
                  style={[
                    styles.statusTabText,
                    status === 'published' && styles.statusTabTextActivePub,
                  ]}
                >
                  Terbitkan Langsung
                </Text>
              </TouchableOpacity>
            </View>

            {/* Switch Berita Utama (Headline) */}
            <View style={[styles.switchRow, { borderBottomColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <View style={styles.switchTitleRow}>
                  <Ionicons name="star" size={16} color="#f59e0b" style={{ marginRight: 6 }} />
                  <Text style={[styles.switchTitle, dyn.textMain]}>Jadikan Berita Utama (Headline)</Text>
                </View>
                <Text style={[styles.switchSubtitle, dyn.textMuted]}>
                  Ditampilkan di slot headline / carousel utama beranda
                </Text>
              </View>
              <Switch
                value={isHeadline}
                onValueChange={setIsHeadline}
                trackColor={{ false: '#cbd5e1', true: '#f59e0b' }}
                thumbColor={isHeadline ? '#ffffff' : '#f4f4f5'}
              />
            </View>

            {/* Switch Breaking News */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <View style={styles.switchTitleRow}>
                  <Ionicons name="flash" size={16} color="#ef4444" style={{ marginRight: 6 }} />
                  <Text style={[styles.switchTitle, dyn.textMain]}>Kabar Kilat (Breaking News)</Text>
                </View>
                <Text style={[styles.switchSubtitle, dyn.textMuted]}>
                  Muncul di ticker kabar kilat merah paling atas
                </Text>
              </View>
              <Switch
                value={isBreakingNews}
                onValueChange={setIsBreakingNews}
                trackColor={{ false: '#cbd5e1', true: '#ef4444' }}
                thumbColor={isBreakingNews ? '#ffffff' : '#f4f4f5'}
              />
            </View>
          </View>
        </View>

        {/* 5. SEO, TAG & METADATA (SINKRONISASI WEB) */}
        <View style={[styles.card, dyn.card]}>
          <View style={[styles.cardHeader, dyn.cardHeaderBorder]}>
            <View style={[styles.badgeIcon, { backgroundColor: '#e0e7ff' }]}>
              <Ionicons name="share-social-outline" size={16} color="#4338ca" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, dyn.textMain]}>5. SEO, Tag & Slug URL</Text>
            </View>
            <TouchableOpacity style={styles.autoSeoBtn} onPress={handleAutoSEO} activeOpacity={0.8}>
              <Ionicons name="flash-outline" size={14} color="#1b61d1" />
              <Text style={styles.autoSeoBtnText}>Auto-Generate</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardBody}>
            {/* Tag / Kata Kunci */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, dyn.textMain]}>Tag / Kata Kunci (Dipisahkan koma)</Text>
              <TextInput
                style={[styles.input, dyn.inputBg]}
                placeholder="Contoh: Padang, Pilkada, Politik, KPU"
                placeholderTextColor={dyn.textMuted.color}
                value={tags}
                onChangeText={setTags}
              />
            </View>

            {/* Slug URL */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, dyn.textMain]}>Custom Slug URL</Text>
              <TextInput
                style={[styles.input, dyn.inputBg]}
                placeholder="judul-berita-anda"
                placeholderTextColor={dyn.textMuted.color}
                value={slug}
                onChangeText={setSlug}
                autoCapitalize="none"
              />
              <Text style={[styles.hintSmall, dyn.textMuted]}>
                Kosongkan untuk membuat tautan ramah SEO otomatis dari judul.
              </Text>
            </View>

            {/* SEO Title & Description */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, dyn.textMain]}>SEO Meta Title</Text>
              <TextInput
                style={[styles.input, dyn.inputBg]}
                placeholder="Judul untuk pencarian Google..."
                placeholderTextColor={dyn.textMuted.color}
                value={seoTitle}
                onChangeText={setSeoTitle}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, dyn.textMain]}>SEO Meta Description</Text>
              <TextInput
                style={[styles.input, { minHeight: 70 }, dyn.inputBg]}
                placeholder="Deskripsi ringkas yang tampil di pencarian Google / Facebook..."
                placeholderTextColor={dyn.textMuted.color}
                value={seoDescription}
                onChangeText={setSeoDescription}
                multiline
              />
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* FOOTER ACTION BAR */}
      <View style={[styles.footer, dyn.footerBg]}>
        {saving && (
          <View style={styles.savingProgressRow}>
            <ActivityIndicator size="small" color="#1b61d1" style={{ marginRight: 8 }} />
            <Text style={[styles.savingProgressText, dyn.textMuted]}>{savingStage || 'Memproses...'}</Text>
          </View>
        )}

        <View style={styles.footerBtnRow}>
          {/* Tombol Simpan Draft */}
          <TouchableOpacity
            style={[styles.draftActionBtn, dyn.inputBg]}
            onPress={() => handleSaveArticle('draft')}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Ionicons name="folder-outline" size={18} color={dyn.textMain.color} />
            <Text style={[styles.draftActionText, { color: dyn.textMain.color }]}>Simpan Draft</Text>
          </TouchableOpacity>

          {/* Tombol Terbitkan / Publish */}
          <TouchableOpacity
            style={[
              styles.publishActionBtn,
              status === 'published' ? styles.publishGreen : styles.publishBlue,
            ]}
            onPress={() => handleSaveArticle(status)}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name={status === 'published' ? 'globe-outline' : 'paper-plane-outline'}
                  size={18}
                  color="#fff"
                />
                <Text style={styles.publishActionText}>
                  {status === 'published' ? 'Terbitkan Sekarang' : 'Simpan Berita'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* MODAL KATEGORI LENGKAP */}
      <Modal visible={catModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, dyn.card]}>
            <View style={[styles.modalHeader, dyn.cardHeaderBorder]}>
              <Text style={[styles.modalTitle, dyn.textMain]}>Pilih Kategori Berita</Text>
              <TouchableOpacity onPress={() => setCatModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={dyn.textMain.color} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBox, dyn.inputBg]}>
              <Ionicons name="search" size={16} color={dyn.textMuted.color} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.flexInput, { color: dyn.textMain.color }]}
                placeholder="Cari kategori..."
                placeholderTextColor={dyn.textMuted.color}
                value={catSearch}
                onChangeText={setCatSearch}
              />
            </View>

            <FlatList
              data={filteredCats}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected = category === item;
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalCatItem,
                      isSelected && { backgroundColor: isDarkMode ? '#1e293b' : '#eff6ff' },
                    ]}
                    onPress={() => {
                      setCategory(item);
                      setCatModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalCatText,
                        { color: isSelected ? '#1b61d1' : dyn.textMain.color },
                        isSelected && { fontWeight: 'bold' },
                      ]}
                    >
                      {item}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color="#1b61d1" />}
                  </TouchableOpacity>
                );
              }}
              style={{ maxHeight: 350 }}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },

  // Sync Banner
  syncBanner: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'flex-start',
    gap: 12,
  },
  syncIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(27, 97, 209, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  syncText: {
    fontSize: 12,
    lineHeight: 18,
  },

  // Cards
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  badgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardBody: {
    padding: 16,
  },

  // Fields
  fieldGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  requiredStar: {
    color: '#ef4444',
  },
  charCount: {
    fontSize: 12,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
  },
  titleInput: {
    fontWeight: '700',
    fontSize: 16,
    minHeight: 52,
    lineHeight: 22,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
  },
  flexInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  twoColRow: {
    flexDirection: 'row',
  },
  hintSmall: {
    fontSize: 11,
    marginTop: 6,
    lineHeight: 16,
  },

  // Category chips
  catScroll: {
    flexDirection: 'row',
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  catChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  catChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  moreCatsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  moreCatsText: {
    fontSize: 12,
    color: '#1b61d1',
    fontWeight: '600',
  },

  // Image upload
  imageUploadBox: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    minHeight: 160,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  uploadIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(27, 97, 209, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadPromptText: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  uploadHintText: {
    fontSize: 12,
    textAlign: 'center',
  },
  previewContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    height: 190,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewOverlayActions: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    gap: 8,
  },
  overlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  overlayBtnDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  overlayBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Content & Toolbar
  statsPill: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statsPillText: {
    fontSize: 11,
    color: '#7c3aed',
    fontWeight: '600',
  },
  contentToolbar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  toolBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  textArea: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 240,
    fontSize: 14,
    lineHeight: 22,
  },

  // Publication Settings
  statusSegment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  statusTab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 9,
    gap: 6,
  },
  statusTabActiveDraft: {
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statusTabActivePub: {
    backgroundColor: '#dcfce7',
  },
  statusTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  statusTabTextActiveDraft: {
    color: '#1b61d1',
    fontWeight: '700',
  },
  statusTabTextActivePub: {
    color: '#166534',
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  switchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchSubtitle: {
    fontSize: 12,
  },

  // SEO
  autoSeoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  autoSeoBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1b61d1',
  },

  // Footer Action Bar
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
  },
  savingProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  savingProgressText: {
    fontSize: 12,
  },
  footerBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  draftActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    gap: 6,
  },
  draftActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  publishActionBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    height: 48,
    gap: 6,
  },
  publishBlue: {
    backgroundColor: '#1b61d1',
  },
  publishGreen: {
    backgroundColor: '#16a34a',
  },
  publishActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    height: 42,
    marginBottom: 12,
  },
  modalCatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  modalCatText: {
    fontSize: 14,
  },
});
