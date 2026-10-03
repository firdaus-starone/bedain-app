import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, Platform, Image } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function Layout() {
  const { isDarkMode, colors } = useTheme();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const docRef = doc(db, 'settings', 'site');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.logoUrl) setLogoUrl(data.logoUrl);
        }
      } catch (e) {
        console.error("Gagal menarik logo:", e);
      }
    };
    fetchLogo();
  }, []);

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true, 
        tabBarActiveTintColor: isDarkMode ? '#60a5fa' : '#1b61d1',
        tabBarInactiveTintColor: isDarkMode ? '#64748b' : '#64748b',
        tabBarStyle: {
          backgroundColor: colors.card,
          minHeight: Platform.OS === 'ios' ? 85 : 65, 
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDarkMode ? 0 : 0.1,
          shadowRadius: 4,
        }
      }}
    >
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Kategori',
          tabBarLabel: ({ color }) => <Text style={{ fontSize: 10, fontWeight: '600', color: color, marginBottom: Platform.OS === 'android' ? 6 : 0 }}>Kategori</Text>,
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "compass" : "compass-outline"} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="submit"
        options={{
          title: 'Kirim',
          tabBarLabel: ({ color }) => <Text style={{ fontSize: 10, fontWeight: '600', color: color, marginBottom: Platform.OS === 'android' ? 6 : 0 }}>Kirim</Text>,
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "pencil" : "pencil-outline"} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarLabel: ({ color }) => <Text style={{ fontSize: 10, fontWeight: '600', color: color, marginBottom: Platform.OS === 'android' ? 6 : 0 }}>Beranda</Text>,
          tabBarIcon: ({ focused }) => (
            logoUrl ? (
              <Image 
                source={{ uri: logoUrl }} 
                style={{ width: 26, height: 26, borderRadius: 13, opacity: focused ? 1 : 0.5 }} 
                resizeMode="cover"
              />
            ) : (
              <Image 
                source={require('../../../assets/images/logo-bundar.png')} 
                style={{ width: 26, height: 26, borderRadius: 13, opacity: focused ? 1 : 0.5 }} 
                resizeMode="cover"
              />
            )
          ),
        }}
      />
      <Tabs.Screen
        name="hot"
        options={{
          title: 'Hangat',
          tabBarLabel: ({ color }) => <Text style={{ fontSize: 10, fontWeight: '600', color: color, marginBottom: Platform.OS === 'android' ? 6 : 0 }}>Hangat</Text>,
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "trending-up" : "trending-up-outline"} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="video"
        options={{
          title: 'Video',
          tabBarLabel: ({ color }) => <Text style={{ fontSize: 10, fontWeight: '600', color: color, marginBottom: Platform.OS === 'android' ? 6 : 0 }}>Video</Text>,
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "play-circle" : "play-circle-outline"} size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="category/[slug]"
        options={{
          href: null,
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="region/[name]"
        options={{
          href: null,
          headerShown: false
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({});
