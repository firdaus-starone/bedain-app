import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../../lib/firebase';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';

export default function AdminWriteArticle() {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal membuka galeri foto');
    }
  };

  const handleSaveDraft = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Data Tidak Lengkap", "Judul dan isi berita tidak boleh kosong.");
      return;
    }

    setSaving(true);
    try {
      // Create basic article
      const user = auth.currentUser;
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
        
      const slugWithTimestamp = `${slug}-${Date.now()}`;

      let uploadedImageUrl = '';
      if (imageUri) {
        try {
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const imageRef = ref(storage, `articles/${Date.now()}_thumb.jpg`);
          await uploadBytes(imageRef, blob);
          uploadedImageUrl = await getDownloadURL(imageRef);
        } catch (e) {
          console.error("Gagal upload gambar", e);
        }
      }

      await addDoc(collection(db, 'articles'), {
        title: title.trim(),
        content: content.trim(),
        slug: slugWithTimestamp,
        authorId: user?.uid || 'unknown',
        authorName: user?.displayName || 'Tim Redaksi',
        thumbnailUrl: uploadedImageUrl,
        status: 'draft',
        createdAt: serverTimestamp(),
        publishedAt: null,
        views: 0,
        reactions: {},
        category: 'Umum'
      });

      Alert.alert("Berhasil!", "Berita berhasil disimpan sebagai draft. Anda bisa mengedit atau menambahkan gambar lewat Dashboard Web nanti.", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error("Error saving draft:", error);
      Alert.alert("Error", "Gagal menyimpan draft berita.");
    } finally {
      setSaving(false);
    }
  };

  const dyn = {
    container: { backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' },
    card: { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderColor: isDarkMode ? '#334155' : '#e2e8f0' },
    textMain: { color: isDarkMode ? '#f8fafc' : '#0f172a' },
    textMuted: { color: isDarkMode ? '#94a3b8' : '#64748b' },
    input: { 
      backgroundColor: isDarkMode ? '#334155' : '#f1f5f9',
      color: isDarkMode ? '#f8fafc' : '#0f172a'
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, dyn.container]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={[styles.infoBox, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff' }]}>
          <Ionicons name="information-circle" size={24} color="#3b82f6" style={{ marginRight: 12 }} />
          <Text style={[styles.infoText, { color: isDarkMode ? '#bfdbfe' : '#1e3a8a' }]}>
            Ini adalah editor cepat native. Berita yang dikirim dari sini akan otomatis berstatus DRAFT. Tambahkan gambar dan format paragraf (Rich Text) lewat versi Web nanti.
          </Text>
        </View>

        <Text style={[styles.label, dyn.textMain]}>Judul Berita</Text>
        <TextInput
          style={[styles.input, dyn.input, { fontWeight: 'bold', fontSize: 16 }]}
          placeholder="Tulis judul yang menarik..."
          placeholderTextColor={dyn.textMuted.color}
          value={title}
          onChangeText={setTitle}
          multiline
        />

        <Text style={[styles.label, dyn.textMain, { marginTop: 16 }]}>Foto Sampul (Opsional)</Text>
        <TouchableOpacity style={[styles.imagePickerBtn, dyn.input]} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera-outline" size={32} color={dyn.textMuted.color} />
              <Text style={[styles.imagePlaceholderText, dyn.textMuted]}>Tap untuk memilih foto dari galeri</Text>
            </View>
          )}
        </TouchableOpacity>
        {imageUri && (
          <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImageUri(null)}>
            <Text style={styles.removeImageText}>Hapus Foto</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.label, dyn.textMain, { marginTop: 16 }]}>Isi Berita</Text>
        <TextInput
          style={[styles.textArea, dyn.input]}
          placeholder="Tuliskan isi berita di sini..."
          placeholderTextColor={dyn.textMuted.color}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />

      </ScrollView>

      <View style={[styles.footer, dyn.card]}>
        <TouchableOpacity 
          style={styles.saveBtn} 
          onPress={handleSaveDraft}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Simpan sebagai Draft</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    padding: 16,
    borderRadius: 12,
    minHeight: 56,
  },
  textArea: {
    padding: 16,
    borderRadius: 12,
    minHeight: 250,
    fontSize: 15,
    lineHeight: 24,
  },
  imagePickerBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 13,
  },
  previewImage: {
    width: '100%',
    height: 180,
  },
  removeImageBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  removeImageText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  saveBtn: {
    backgroundColor: '#1b61d1',
    flexDirection: 'row',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
