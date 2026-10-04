import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar, useColorScheme, Alert } from 'react-native';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import * as Updates from 'expo-updates';

function RootLayoutContent() {
  const { isDarkMode, colors } = useTheme();

  useEffect(() => {
    async function onFetchUpdateAsync() {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          Alert.alert(
            'Pembaruan Tersedia',
            'Sistem menemukan versi aplikasi yang lebih baru. Aplikasi akan mengunduh dan memuat ulang sekarang untuk menerapkan versi terbaru.',
            [
              {
                text: 'OK',
                onPress: async () => {
                  try {
                    await Updates.fetchUpdateAsync();
                    await Updates.reloadAsync();
                  } catch (e) {
                    console.log('Error fetching update:', e);
                  }
                },
              },
            ],
            { cancelable: false } // Memaksa user untuk menekan OK
          );
        }
      } catch (error) {
        console.log(`Error checking for latest Expo update: ${error}`);
      }
    }

    if (!__DEV__) {
      onFetchUpdateAsync();
    }
  }, []);

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
