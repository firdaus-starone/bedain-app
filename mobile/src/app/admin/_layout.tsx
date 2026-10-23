import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

export { ErrorBoundary } from 'expo-router';

export default function AdminLayout() {
  const { isDarkMode } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: isDarkMode ? '#1e293b' : '#1b61d1',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Dashboard Admin',
          headerTitleAlign: 'center',
        }} 
      />
      <Stack.Screen 
        name="write" 
        options={{ 
          title: 'Tulis Berita Baru',
          headerTitleAlign: 'center',
        }} 
      />
      <Stack.Screen 
        name="articles" 
        options={{ 
          title: 'Kelola Berita',
          headerTitleAlign: 'center',
        }} 
      />
      <Stack.Screen 
        name="comments" 
        options={{ 
          title: 'Moderasi Komentar',
          headerTitleAlign: 'center',
        }} 
      />
      <Stack.Screen 
        name="users" 
        options={{ 
          title: 'Kelola Pengguna',
          headerTitleAlign: 'center',
        }} 
      />
    </Stack>
  );
}
