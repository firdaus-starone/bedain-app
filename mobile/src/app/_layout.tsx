import React, { useEffect, useState, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar, useColorScheme, Alert, Modal, View, Text, TouchableOpacity, ActivityIndicator, Animated, AppState, AppStateStatus, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  Montserrat_900Black,
} from '@expo-google-fonts/montserrat';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { LanguageProvider } from '../context/LanguageContext';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

SplashScreen.preventAutoHideAsync().catch(() => {});

export { ErrorBoundary } from 'expo-router';

// Helper perbandingan versi semver sederhana (misal '1.0.8' vs '1.0.7')
const isNewerVersion = (latest: string, current: string): boolean => {
  if (!latest || !current) return false;
  const lParts = latest.split('.').map(n => parseInt(n, 10) || 0);
  const cParts = current.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(lParts.length, cParts.length); i++) {
    const l = lParts[i] || 0;
    const c = cParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
};

function RootLayoutContent() {
  const { isDarkMode, colors } = useTheme();

  const [fontsLoaded] = useFonts({
    'Montserrat-Regular': Montserrat_400Regular,
    'Montserrat-Medium': Montserrat_500Medium,
    'Montserrat-SemiBold': Montserrat_600SemiBold,
    'Montserrat-Bold': Montserrat_700Bold,
    'Montserrat-ExtraBold': Montserrat_800ExtraBold,
    'Montserrat-Black': Montserrat_900Black,
    'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
    'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
    'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
    'PlusJakartaSans-ExtraBold': PlusJakartaSans_800ExtraBold,
    'Montserrat': Montserrat_400Regular,
    'Plus Jakarta Sans': PlusJakartaSans_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateType, setUpdateType] = useState<'ota' | 'store'>('ota');
  const [storeUpdateInfo, setStoreUpdateInfo] = useState<{ version: string; url: string; notes?: string }>({
    version: '',
    url: 'https://play.google.com/store/apps/details?id=com.bedain.newsapp',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const lastCheckTime = useRef(0);

  useEffect(() => {
    if (showUpdateModal) {
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true })
      ]).start();
    }
  }, [showUpdateModal]);

  const checkForAllUpdates = async () => {
    // Hindari double-check dalam jeda waktu 15 detik
    const now = Date.now();
    if (now - lastCheckTime.current < 15000) return;
    lastCheckTime.current = now;

    // 1. Cek Update Native Binary (Google Play Store) dari Firestore
    try {
      const snap = await getDoc(doc(db, 'settings', 'site'));
      if (snap.exists()) {
        const data = snap.data();
        const latestVer = data?.latestAppVersion || data?.mobileAppVersion || '';
        const currentVer = Constants.expoConfig?.version || '1.0.0';
        const targetUrl = data?.nativeAppUrl || 'https://play.google.com/store/apps/details?id=com.bedain.newsapp';

        if (latestVer && isNewerVersion(latestVer, currentVer)) {
          setUpdateType('store');
          setStoreUpdateInfo({
            version: latestVer,
            url: targetUrl,
            notes: data?.appUpdateNotes || undefined,
          });
          setShowUpdateModal(true);
          return; // Jika ada rilis store baru, prioritaskan store
        }
      }
    } catch (e) {
      // ignore firestore error
    }

    // 2. Cek Update OTA via EAS Updates
    if (!__DEV__ && Updates.isEnabled) {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          setUpdateType('ota');
          setShowUpdateModal(true);
        }
      } catch (error) {
        console.log(`Error checking for latest Expo update: ${error}`);
      }
    }
  };

  useEffect(() => {
    checkForAllUpdates();

    // Jalankan pemeriksaan kembali saat user membuka aplikasi dari background
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkForAllUpdates();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleUpdate = async () => {
    if (updateType === 'store') {
      try {
        const targetUrl = storeUpdateInfo.url || 'https://play.google.com/store/apps/details?id=com.bedain.newsapp';
        await Linking.openURL(targetUrl);
      } catch (err) {
        Alert.alert('Gagal Membuka Play Store', 'Silakan buka aplikasi Google Play Store untuk memperbarui Bedain News.');
      }
      return;
    }

    // Update OTA
    setIsUpdating(true);
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (e) {
      console.log('Error fetching update:', e);
      setIsUpdating(false);
      setShowUpdateModal(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={isDarkMode ? colors.card : "#ffffff"}
      />
      <Stack 
        screenOptions={{ 
          headerShown: false, 
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          fullScreenGestureEnabled: true
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="article/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="watch/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="profile" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="my-profile" options={{ presentation: 'card' }} />
        <Stack.Screen name="notifications" options={{ presentation: 'card' }} />
        <Stack.Screen name="page/[slug]" options={{ presentation: 'card' }} />
        <Stack.Screen name="search" options={{ presentation: 'card' }} />
        <Stack.Screen name="bookmarks" options={{ presentation: 'card' }} />
        <Stack.Screen name="login" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>

      <Modal transparent visible={showUpdateModal} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Animated.View style={{ 
            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', 
            borderRadius: 24, 
            padding: 24, 
            width: '100%', 
            maxWidth: 400,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 10,
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim
          }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <Ionicons 
                name={updateType === 'store' ? "cloud-download" : "rocket"} 
                size={40} 
                color="#3b82f6" 
              />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#0f172a', marginBottom: 12, textAlign: 'center' }}>
              {updateType === 'store' ? 'Versi Baru di Play Store' : 'Pembaruan Tersedia'}
            </Text>
            <Text style={{ fontSize: 14.5, color: isDarkMode ? '#94a3b8' : '#64748b', textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
              {updateType === 'store' 
                ? (storeUpdateInfo.notes || `Bedain News versi ${storeUpdateInfo.version || 'terbaru'} telah tersedia di Google Play Store. Perbarui sekarang untuk fitur & performa terbaik!`)
                : 'Fitur dan pembaruan sistem terbaru telah siap. Muat ulang sekarang untuk menikmati pengalaman terbaru!'}
            </Text>
            <TouchableOpacity 
              activeOpacity={0.8}
              disabled={isUpdating}
              onPress={handleUpdate}
              style={{
                width: '100%',
                backgroundColor: '#3b82f6',
                borderRadius: 16,
                paddingVertical: 15,
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#3b82f6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4
              }}
            >
              {isUpdating ? (
                <>
                  <ActivityIndicator color="#ffffff" size="small" style={{ marginRight: 10 }} />
                  <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>Mengunduh...</Text>
                </>
              ) : (
                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>
                  {updateType === 'store' ? 'Buka Google Play Store' : 'Perbarui Sekarang'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Tombol Nanti Saja */}
            {!isUpdating && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowUpdateModal(false)}
                style={{ marginTop: 14, paddingVertical: 8, paddingHorizontal: 16 }}
              >
                <Text style={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 14, fontWeight: '600' }}>
                  Nanti Saja
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <RootLayoutContent />
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
