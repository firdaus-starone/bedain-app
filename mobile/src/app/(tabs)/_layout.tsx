import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, Platform, Image, Animated } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useState, useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

function SamuraiShineHomeIcon({ focused, logoUrl }: { focused: boolean; logoUrl: string | null }) {
  const shimmerAnim = useRef(new Animated.Value(-50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let isMounted = true;
    const runShine = () => {
      if (!isMounted) return;
      shimmerAnim.setValue(-50);
      Animated.sequence([
        Animated.delay(2400),
        Animated.timing(shimmerAnim, {
          toValue: 50,
          duration: 650,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && isMounted) {
          runShine();
        }
      });
    };

    runShine();
    return () => {
      isMounted = false;
    };
  }, [shimmerAnim]);

  useEffect(() => {
    if (focused) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 1100, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1100, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [focused, pulseAnim]);

  return (
    <Animated.View
      style={{
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: pulseAnim }],
        shadowColor: focused ? '#3b82f6' : '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: focused ? 0.6 : 0,
        shadowRadius: 5,
        elevation: focused ? 3 : 0,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          overflow: 'hidden',
          backgroundColor: '#0f172a',
          borderWidth: focused ? 1.5 : 1,
          borderColor: focused ? '#3b82f6' : 'rgba(148, 163, 184, 0.3)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {logoUrl ? (
          <Image
            source={{ uri: logoUrl }}
            style={{ width: 26, height: 26, borderRadius: 13, opacity: focused ? 1 : 0.6 }}
            resizeMode="cover"
          />
        ) : (
          <Image
            source={require('../../../assets/images/logo-bundar.png')}
            style={{ width: 26, height: 26, borderRadius: 13, opacity: focused ? 1 : 0.6 }}
            resizeMode="cover"
          />
        )}

        {/* Bilah Kilau Samurai (Gleam Slash Effect) */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -15,
            bottom: -15,
            width: 26,
            transform: [
              { translateX: shimmerAnim },
              { rotate: '25deg' },
            ],
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Cahaya kilau utama */}
          <View
            style={{
              width: 8,
              height: 60,
              backgroundColor: 'rgba(255, 255, 255, 0.6)',
              borderRadius: 4,
            }}
          />
          {/* Garis kilatan tajam samurai */}
          <View
            style={{
              width: 2.5,
              height: 60,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              marginLeft: 3,
              borderRadius: 1,
            }}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

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
            <SamuraiShineHomeIcon focused={focused} logoUrl={logoUrl} />
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
