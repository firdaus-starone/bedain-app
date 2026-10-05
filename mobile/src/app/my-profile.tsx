import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform, StatusBar, KeyboardAvoidingView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function MyProfileScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    if (!displayName.trim()) {
      Alert.alert('Gagal', 'Nama tidak boleh kosong.');
      return;
    }
    
    setSaving(true);
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: displayName.trim()
        });
        Alert.alert('Berhasil', 'Profil Anda berhasil diperbarui!');
        router.back();
      }
    } catch (error: any) {
      console.error('Update profile error:', error);
      Alert.alert('Gagal', 'Terjadi kesalahan saat memperbarui profil: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const dyn = {
    container: { backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' },
    header: { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderBottomColor: isDarkMode ? '#334155' : '#f1f5f9' },
    headerTitle: { color: isDarkMode ? '#f8fafc' : '#0f172a' },
    backBtn: { backgroundColor: isDarkMode ? '#334155' : '#f1f5f9' },
    iconColor: isDarkMode ? '#f8fafc' : '#0f172a',
    card: { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderColor: isDarkMode ? '#334155' : '#e2e8f0' },
    label: { color: isDarkMode ? '#94a3b8' : '#64748b' },
    input: { color: isDarkMode ? '#f8fafc' : '#0f172a', backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc', borderColor: isDarkMode ? '#334155' : '#e2e8f0' },
    emailText: { color: isDarkMode ? '#94a3b8' : '#64748b' }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, dyn.container]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={dyn.header.backgroundColor} />
      
      {/* Header */}
      <View style={[styles.header, dyn.header]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, dyn.backBtn]}>
            <Ionicons name="arrow-back" size={24} color={dyn.iconColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, dyn.headerTitle]}>Profil Saya</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {!user ? (
          <View style={[styles.card, dyn.card, styles.shadowCard, { alignItems: 'center', paddingVertical: 50, paddingHorizontal: 24, marginTop: 20 }]}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed" size={40} color="#1b61d1" />
            </View>
            <Text style={[styles.headerTitle, dyn.headerTitle, { fontSize: 22, marginBottom: 12 }]}>Belum Login</Text>
            <Text style={[styles.label, dyn.label, { textAlign: 'center', marginBottom: 30, lineHeight: 22, fontSize: 14 }]}>
              Silakan login terlebih dahulu untuk mengakses dan mengubah informasi profil Anda.
            </Text>
            <TouchableOpacity style={styles.saveBtn} onPress={() => router.push('/login')}>
              <Text style={styles.saveBtnText}>Masuk atau Daftar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.card, dyn.card, styles.shadowCard, { marginTop: 20 }]}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={40} color="#ffffff" />
              </View>
              <Text style={styles.avatarLabel}>Foto Profil (Dari Google)</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, dyn.label]}>Alamat Email</Text>
              <Text style={[styles.emailText, dyn.emailText]}>{user.email}</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, dyn.label]}>Nama Tampilan</Text>
              <TextInput
                style={[styles.input, dyn.input]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Masukkan nama Anda"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <TouchableOpacity 
              style={[styles.saveBtn, saving && { opacity: 0.7 }]} 
              onPress={handleSave} 
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 16 : (StatusBar.currentHeight || 24) + 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
  },
  shadowCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 15,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: '#1b61d1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    width: '100%',
    shadowColor: '#1b61d1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  }
});
