import { useEffect, useState, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar, useColorScheme, Alert, Modal, View, Text, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import * as Updates from 'expo-updates';

function RootLayoutContent() {
  const { isDarkMode, colors } = useTheme();
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showUpdateModal) {
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true })
      ]).start();
    }
  }, [showUpdateModal]);

  useEffect(() => {
    async function onFetchUpdateAsync() {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          setShowUpdateModal(true);
        }
      } catch (error) {
        console.log(`Error checking for latest Expo update: ${error}`);
      }
    }

    if (!__DEV__) {
      onFetchUpdateAsync();
    }
  }, []);

  const handleUpdate = async () => {
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
        <Stack.Screen name="article/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="profile" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="categories" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
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
              <Ionicons name="rocket" size={40} color="#3b82f6" />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#0f172a', marginBottom: 12, textAlign: 'center' }}>
              Pembaruan Tersedia
            </Text>
            <Text style={{ fontSize: 15, color: isDarkMode ? '#94a3b8' : '#64748b', textAlign: 'center', marginBottom: 28, lineHeight: 22 }}>
              Versi terbaru aplikasi telah siap. Perbarui sekarang untuk mendapatkan fitur terbaru dan pengalaman yang lebih cepat & stabil!
            </Text>
            <TouchableOpacity 
              activeOpacity={0.8}
              disabled={isUpdating}
              onPress={handleUpdate}
              style={{
                width: '100%',
                backgroundColor: '#3b82f6',
                borderRadius: 16,
                paddingVertical: 16,
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
                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>Perbarui Sekarang</Text>
              )}
            </TouchableOpacity>
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
        <RootLayoutContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
