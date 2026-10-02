import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, Platform, Image } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function Layout() {
  const { isDarkMode, colors } = useTheme();

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
          tabBarLabel: () => null, 
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.centerButtonContainer}>
              <View style={[styles.centerButton, { backgroundColor: colors.card, borderColor: isDarkMode ? '#1e293b' : '#f8f9fa' }, focused && { borderColor: isDarkMode ? '#3b82f6' : '#e0e7ff' }]}>
                <Image 
                  source={require('../../../assets/images/logo-bundar.png')} 
                  style={{ width: '100%', height: '100%', borderRadius: 28 }} 
                  resizeMode="cover"
                />
              </View>
              <Text style={{ 
                fontSize: 10, 
                fontWeight: '700', 
                color: focused ? (isDarkMode ? '#60a5fa' : '#1b61d1') : '#64748b',
                marginTop: 4 
              }}>
                Beranda
              </Text>
            </View>
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
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerButtonContainer: {
    position: 'absolute',
    top: -24, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1b61d1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  }
});
