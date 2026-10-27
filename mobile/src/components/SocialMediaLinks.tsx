import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface SocialMediaLinksProps {
  settings?: any;
  variant?: 'full' | 'article';
  containerStyle?: StyleProp<ViewStyle>;
}

export const SocialMediaLinks: React.FC<SocialMediaLinksProps> = ({
  settings,
  variant = 'full',
  containerStyle,
}) => {
  const { isDarkMode } = useTheme();

  const socialItems = [
    {
      id: 'instagram',
      name: 'Instagram',
      icon: 'logo-instagram' as const,
      color: '#E1306C',
      bgColor: isDarkMode ? 'rgba(225, 48, 108, 0.15)' : '#fdf2f8',
      url: settings?.instagramUrl?.trim() || 'https://instagram.com/bedainnews',
    },
    {
      id: 'youtube',
      name: 'YouTube',
      icon: 'logo-youtube' as const,
      color: '#FF0000',
      bgColor: isDarkMode ? 'rgba(255, 0, 0, 0.15)' : '#fef2f2',
      url: settings?.youtubeUrl?.trim() || 'https://youtube.com/@bedainnews',
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: 'logo-tiktok' as const,
      color: isDarkMode ? '#f8fafc' : '#0f172a',
      bgColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#f1f5f9',
      url: settings?.tiktokUrl?.trim() || 'https://tiktok.com/@bedainnews',
    },
    {
      id: 'twitter',
      name: 'X (Twitter)',
      icon: 'logo-twitter' as const,
      color: isDarkMode ? '#38bdf8' : '#0284c7',
      bgColor: isDarkMode ? 'rgba(56, 189, 248, 0.15)' : '#f0f9ff',
      url: settings?.twitterUrl?.trim() || 'https://twitter.com/bedainnews',
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: 'logo-whatsapp' as const,
      color: '#25D366',
      bgColor: isDarkMode ? 'rgba(37, 211, 102, 0.15)' : '#f0fdf4',
      url: settings?.whatsappChannelUrl?.trim() || (settings?.contactWhatsapp ? `https://wa.me/${settings.contactWhatsapp.replace(/\D/g, '')}` : 'https://whatsapp.com/channel/0029VaBedainNews'),
    },
  ];

  const handleOpenSocial = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(url);
      }
    } catch (e) {
      // ignore
    }
  };

  // Tampilan Versi Artikel (Ringkas, Rapi, & Elegan di Akhir Berita)
  if (variant === 'article') {
    return (
      <View
        style={[
          styles.articleContainer,
          {
            backgroundColor: isDarkMode ? '#1e2430' : '#f8fafc',
            borderColor: isDarkMode ? '#334155' : '#e2e8f0',
          },
          containerStyle,
        ]}
      >
        <View style={styles.articleHeaderRow}>
          <View style={styles.articleBadge}>
            <Ionicons name="share-social" size={13} color="#ef4444" style={{ marginRight: 4 }} />
            <Text style={styles.articleBadgeText}>IKUTI BEDAINS</Text>
          </View>
          <Text style={[styles.articleText, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>
            Dapatkan berita terkini di medsos kami:
          </Text>
        </View>

        <View style={styles.articleIconsRow}>
          {socialItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={() => handleOpenSocial(item.url)}
              style={[
                styles.articleIconBtn,
                {
                  backgroundColor: item.bgColor,
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                },
              ]}
            >
              <Ionicons name={item.icon} size={18} color={item.color} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // Tampilan Versi Profil (Lengkap, Mewah, & Kartu Komunitas)
  return (
    <View
      style={[
        styles.fullContainer,
        {
          backgroundColor: isDarkMode ? '#1e2430' : '#ffffff',
          borderColor: isDarkMode ? '#334155' : '#e2e8f0',
        },
        containerStyle,
      ]}
    >
      <View style={styles.fullHeader}>
        <View style={styles.fullTitleRow}>
          <View style={styles.fullIconWrapper}>
            <Ionicons name="sparkles" size={14} color="#ffffff" />
          </View>
          <View>
            <Text style={[styles.fullTitle, { color: isDarkMode ? '#f8fafc' : '#0f172a' }]}>
              Komunitas & Media Sosial
            </Text>
            <Text style={[styles.fullSubtitle, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>
              Terhubung langsung dengan redaksi Bedain News
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.fullGrid}>
        {socialItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.75}
            onPress={() => handleOpenSocial(item.url)}
            style={[
              styles.fullItemBtn,
              {
                backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
                borderColor: isDarkMode ? '#334155' : '#e2e8f0',
              },
            ]}
          >
            <View style={[styles.fullIconBox, { backgroundColor: item.bgColor }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <Text style={[styles.fullItemText, { color: isDarkMode ? '#e2e8f0' : '#1e293b' }]}>
              {item.name}
            </Text>
            <Ionicons
              name="open-outline"
              size={14}
              color={isDarkMode ? '#64748b' : '#94a3b8'}
              style={{ marginLeft: 'auto' }}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default SocialMediaLinks;

const styles = StyleSheet.create({
  // Style untuk versi artikel
  articleContainer: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginVertical: 12,
    flexDirection: 'column',
    gap: 10,
  },
  articleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  articleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  articleBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#ef4444',
    letterSpacing: 0.5,
  },
  articleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  articleIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  articleIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Style untuk versi profil
  fullContainer: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginTop: 18,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  fullHeader: {
    marginBottom: 14,
  },
  fullTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fullIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  fullSubtitle: {
    fontSize: 11.5,
    marginTop: 1,
  },
  fullGrid: {
    gap: 8,
  },
  fullItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  fullIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  fullItemText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
