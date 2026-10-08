import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useTheme } from '../context/ThemeContext';

WebBrowser.maybeCompleteAuthSession();

GoogleSignin.configure({
  webClientId: '649905383675-hkik1akqmv10g3shuikdagfrt90si53e.apps.googleusercontent.com', // Web Client ID
});

export default function LoginScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email dan kata sandi tidak boleh kosong.');
      return;
    }
    
    if (!isLogin && !name) {
      Alert.alert('Error', 'Nama harus diisi untuk mendaftar.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: name
        });
        
        // Simpan data pembaca baru ke Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: email.toLowerCase(),
          name: name.trim(),
          role: 'reader',
          createdAt: new Date().toISOString()
        });
      }
      router.back();
    } catch (error: any) {
      console.error(error);
      Alert.alert('Gagal', error.message || 'Terjadi kesalahan saat otentikasi.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.idToken || userInfo.data?.idToken; // handle both v10 and v11+ of the library
      
      if (!idToken) {
        throw new Error("No ID Token found");
      }
      
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      
      const userRef = doc(db, 'users', userCredential.user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: userCredential.user.email,
          name: userCredential.user.displayName || 'Pembaca',
          role: 'reader',
          createdAt: new Date().toISOString()
        });
      }
      router.back();
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled the login flow
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // operation (e.g. sign in) is in progress already
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Gagal', 'Layanan Google Play tidak tersedia.');
      } else {
        console.error(error);
        Alert.alert('Gagal', 'Terjadi kesalahan saat masuk dengan Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const dyn = {
    container: { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' },
    text: { color: isDarkMode ? '#f8fafc' : '#0f172a' },
    subText: { color: isDarkMode ? '#94a3b8' : '#64748b' },
    input: { 
      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
      color: isDarkMode ? '#f8fafc' : '#0f172a',
      borderColor: isDarkMode ? '#334155' : '#e2e8f0'
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, dyn.container]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={28} color={dyn.text.color} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, dyn.text]}>{isLogin ? 'Selamat Datang' : 'Buat Akun Baru'}</Text>
          <Text style={[styles.subtitle, dyn.subText]}>
            {isLogin ? 'Masuk untuk menyimpan artikel dan memberi komentar.' : 'Daftar untuk menikmati semua fitur aplikasi.'}
          </Text>
        </View>

        {!isLogin && (
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, dyn.input]}
              placeholder="Nama Lengkap"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>
        )}

        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, dyn.input]}
            placeholder="Alamat Email"
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, dyn.input]}
            placeholder="Kata Sandi"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.actionBtnText}>{isLogin ? 'Masuk' : 'Daftar'}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={[styles.divider, { backgroundColor: dyn.borderColor }]} />
          <Text style={[styles.dividerText, dyn.subText]}>Atau</Text>
          <View style={[styles.divider, { backgroundColor: dyn.borderColor }]} />
        </View>

        <TouchableOpacity 
          style={styles.googleBtn} 
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          <Ionicons name="logo-google" size={24} color="#ea4335" style={styles.googleIcon} />
          <Text style={styles.googleBtnText}>Lanjutkan dengan Google</Text>
        </TouchableOpacity>

        <View style={styles.switchContainer}>
          <Text style={[styles.switchText, dyn.subText]}>
            {isLogin ? 'Belum punya akun? ' : 'Sudah punya akun? '}
          </Text>
          <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
            <Text style={styles.switchActionText}>{isLogin ? 'Daftar Sekarang' : 'Masuk'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingBottom: 80,
  },
  titleContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  input: {
    flex: 1,
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 48,
    paddingRight: 16,
    fontSize: 16,
  },
  actionBtn: {
    backgroundColor: '#1b61d1',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#1b61d1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  googleBtn: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  googleIcon: {
    marginRight: 12,
  },
  googleBtnText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  switchText: {
    fontSize: 14,
  },
  switchActionText: {
    fontSize: 14,
    color: '#1b61d1',
    fontWeight: 'bold',
  }
});
