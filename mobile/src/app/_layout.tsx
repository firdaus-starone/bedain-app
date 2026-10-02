import { Stack } from 'expo-router';
import { StatusBar, useColorScheme } from 'react-native';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

function RootLayoutContent() {
  const { isDarkMode, colors } = useTheme();
  return (
    <>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={colors.card}
      />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="article/[id]" 
          options={{ 
            headerShown: false,
            // Animasi transisi yang mengizinkan Android merespons back button/gestur sistem
            animation: 'slide_from_right',
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            presentation: 'card'
          }} 
        />
        <Stack.Screen 
          name="profile" 
          options={{ 
            headerShown: false,
            presentation: 'modal'
          }} 
        />
        <Stack.Screen 
          name="categories" 
          options={{ 
            headerShown: false,
            presentation: 'modal'
          }} 
        />
        <Stack.Screen 
          name="page/[slug]" 
          options={{ 
            headerShown: false,
            animation: 'slide_from_right',
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            presentation: 'card'
          }} 
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
  );
}
