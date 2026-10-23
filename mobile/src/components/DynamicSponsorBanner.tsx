import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Linking,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export interface SponsorBannerData {
  id?: string;
  imageUrl?: string;
  targetUrl?: string;
  title?: string;
  subtitle?: string;
  slot?: string;
  [key: string]: any;
}

interface DynamicSponsorBannerProps {
  banner: SponsorBannerData;
  badgeText?: string;
  showBadge?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  defaultAspectRatio?: number;
}

export const DynamicSponsorBanner: React.FC<DynamicSponsorBannerProps> = ({
  banner,
  badgeText = 'SPONSOR',
  showBadge = false,
  containerStyle,
  defaultAspectRatio = 16 / 9,
}) => {
  const { colors, isDarkMode } = useTheme();
  const [aspectRatio, setAspectRatio] = useState<number>(defaultAspectRatio);

  const hasLink = Boolean(
    banner?.targetUrl &&
    banner.targetUrl.trim() !== '' &&
    banner.targetUrl !== '#'
  );

  useEffect(() => {
    if (!banner?.imageUrl) return;

    let isMounted = true;
    Image.getSize(
      banner.imageUrl,
      (w, h) => {
        if (isMounted && w > 0 && h > 0) {
          setAspectRatio(w / h);
        }
      },
      () => {
        // Fallback silently if network measure fails
      }
    );

    return () => {
      isMounted = false;
    };
  }, [banner?.imageUrl]);

  const handlePress = () => {
    if (hasLink && banner.targetUrl) {
      Linking.openURL(banner.targetUrl).catch((err) => {
        console.warn('Error opening sponsor link:', err);
      });
    }
  };

  if (!banner?.imageUrl) return null;

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowOpacity: isDarkMode ? 0.35 : 0.08,
        },
        containerStyle,
      ]}
    >
      <TouchableOpacity
        activeOpacity={hasLink ? 0.88 : 1}
        onPress={handlePress}
        disabled={!hasLink}
        style={styles.touchable}
      >
        {/* Container Gambar Murni (Clean & Profesional) */}
        <View
          style={[
            styles.imageContainer,
            { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' },
          ]}
        >
          <Image
            source={{ uri: banner.imageUrl }}
            style={{
              width: '100%',
              aspectRatio: aspectRatio,
            }}
            resizeMode="contain"
            onLoad={(e) => {
              const { width, height } = e.nativeEvent.source;
              if (width > 0 && height > 0) {
                const ratio = width / height;
                if (Math.abs(ratio - aspectRatio) > 0.01) {
                  setAspectRatio(ratio);
                }
              }
            }}
          />

          {/* Badge Sponsor (Opsional / dinonaktifkan secara default agar bersih) */}
          {showBadge && (
            <View
              style={[
                styles.badge,
                { backgroundColor: colors.primary || '#1b61d1' },
              ]}
            >
              <Text style={styles.badgeText}>{badgeText}</Text>
              {hasLink && (
                <Ionicons
                  name="open-outline"
                  size={10}
                  color="#ffffff"
                  style={{ marginLeft: 3 }}
                />
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  touchable: {
    width: '100%',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 10,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default DynamicSponsorBanner;
