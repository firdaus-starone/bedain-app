import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  StyleProp,
  ViewStyle,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface DonationBoxProps {
  settings?: any;
  containerStyle?: StyleProp<ViewStyle>;
}

export const DonationBox: React.FC<DonationBoxProps> = ({ settings, containerStyle }) => {
  const { isDarkMode } = useTheme();
  const [selectedPreset, setSelectedPreset] = useState<'15k' | '30k' | '75k'>('15k');
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  // Jika dinonaktifkan di admin, jangan render
  if (settings?.donationEnabled === false) {
    return null;
  }

  const saweriaUrl = settings?.saweriaUrl?.trim() || '';
  const trakteerUrl = settings?.trakteerUrl?.trim() || '';
  const generalDonationUrl = saweriaUrl || trakteerUrl;

  const title = settings?.donationTitle || 'Dukung Jurnalisme Independen Bedain News';
  const desc = settings?.donationDesc || 'Bantu tim redaksi kami tetap menyajikan berita berimbang, tajam, dan bebas pengaruh dengan mentraktir secangkir kopi.';

  const presets = [
    {
      id: '15k' as const,
      amount: 'Rp 15.000',
      label: '1 Kopi',
      emoji: '☕',
      note: 'Dukungan segar untuk 1 laporan independen',
      badge: null,
    },
    {
      id: '30k' as const,
      amount: 'Rp 30.000',
      label: '2 Kopi',
      emoji: '☕☕',
      note: 'Bahan bakar tim riset investigasi harian',
      badge: 'POPULER 🔥',
    },
    {
      id: '75k' as const,
      amount: 'Rp 75.000',
      label: 'Sponsor Riset',
      emoji: '🚀',
      note: 'Mitra utama penopang independensi ruang redaksi',
      badge: 'SPONSOR',
    },
  ];

  const currentPresetObj = presets.find((p) => p.id === selectedPreset) || presets[0];

  const getTargetUrl = (platform: 'saweria' | 'trakteer') => {
    if (platform === 'saweria' && saweriaUrl) return saweriaUrl;
    if (platform === 'trakteer' && trakteerUrl) return trakteerUrl;
    if (generalDonationUrl) return generalDonationUrl;

    // Fallback: direct ke WhatsApp Redaksi dengan nominal terpilih
    const rawWa = settings?.contactWhatsapp || '';
    let cleanWa = rawWa.replace(/\D/g, '');
    if (cleanWa.startsWith('0')) cleanWa = '62' + cleanWa.slice(1);
    const waNumber = cleanWa || '6281112345678';
    return `https://wa.me/${waNumber}?text=${encodeURIComponent(`Halo Redaksi Bedain News, saya ingin traktir kopi dukungan sebesar ${currentPresetObj.amount}.`)}`;
  };

  const handleOpenDonation = async (platform: 'saweria' | 'trakteer') => {
    const targetUrl = getTargetUrl(platform);
    try {
      const canOpen = await Linking.canOpenURL(targetUrl);
      if (canOpen) {
        await Linking.openURL(targetUrl);
      } else {
        await Linking.openURL(targetUrl);
      }
    } catch (e) {
      Alert.alert('Gagal Membuka Tautan', 'Tidak dapat membuka tautan dukungan saat ini.');
    }
  };

  const handleShareLink = async () => {
    const url = saweriaUrl || trakteerUrl || 'https://bedainnews.com';
    try {
      await Share.share({
        message: `Dukung jurnalisme independen dan berimbang Bedain News: ${url}`,
        url: url,
        title: 'Traktir Kopi Bedain News',
      });
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 2500);
    } catch (error) {
      // ignore
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDarkMode ? '#1e2430' : '#fffbeb',
          borderColor: isDarkMode ? '#b45309' : '#fcd34d',
        },
        containerStyle,
      ]}
    >
      {/* Header Baris: Ikon Kopi & Badge */}
      <View style={styles.headerRow}>
        <View style={styles.iconWrapper}>
          <Ionicons name="cafe" size={22} color="#ffffff" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.badgeRow}>
            <View style={styles.tagBadge}>
              <Ionicons name="heart" size={11} color="#f59e0b" style={{ marginRight: 4 }} />
              <Text style={styles.tagBadgeText}>DUKUNGAN PEMBACA</Text>
            </View>
            <View style={styles.greenBadge}>
              <Text style={styles.greenBadgeText}>100% Untuk Redaksi</Text>
            </View>
          </View>
          <Text style={[styles.title, { color: isDarkMode ? '#f8fafc' : '#1e293b' }]}>
            {title}
          </Text>
        </View>
      </View>

      {/* Deskripsi */}
      <Text style={[styles.description, { color: isDarkMode ? '#cbd5e1' : '#475569' }]}>
        {desc}
      </Text>

      {/* Preset Pilihan Nominal */}
      <View style={styles.presetsRow}>
        {presets.map((preset) => {
          const isSelected = selectedPreset === preset.id;
          return (
            <TouchableOpacity
              key={preset.id}
              activeOpacity={0.8}
              onPress={() => setSelectedPreset(preset.id)}
              style={[
                styles.presetChip,
                {
                  backgroundColor: isSelected
                    ? (isDarkMode ? 'rgba(245, 158, 11, 0.22)' : 'rgba(245, 158, 11, 0.15)')
                    : (isDarkMode ? '#0f172a' : '#ffffff'),
                  borderColor: isSelected
                    ? '#f59e0b'
                    : (isDarkMode ? '#334155' : '#e2e8f0'),
                },
                isSelected && { borderWidth: 1.5 },
              ]}
            >
              {preset.badge && (
                <View style={[styles.popularBadge, preset.id === '30k' ? styles.popularBadgeRed : styles.popularBadgeAmber]}>
                  <Text style={styles.popularBadgeText}>{preset.badge}</Text>
                </View>
              )}
              <Text
                style={[
                  styles.presetChipLabel,
                  { color: isSelected ? '#f59e0b' : (isDarkMode ? '#e2e8f0' : '#334155') },
                ]}
              >
                {preset.label} {preset.emoji}
              </Text>
              <Text
                style={[
                  styles.presetChipAmount,
                  { color: isSelected ? '#d97706' : (isDarkMode ? '#94a3b8' : '#64748b') },
                ]}
              >
                {preset.amount}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Keterangan Dampak Nominal Terpilih */}
      <View style={[styles.noteBox, { backgroundColor: isDarkMode ? '#0f172a' : '#fef3c7' }]}>
        <Ionicons name="sparkles" size={13} color="#f59e0b" style={{ marginRight: 6 }} />
        <Text style={[styles.noteText, { color: isDarkMode ? '#fde68a' : '#92400e' }]}>
          {currentPresetObj.note}
        </Text>
      </View>

      {/* Tombol Aksi */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={() => handleOpenDonation(saweriaUrl ? 'saweria' : 'trakteer')}
        >
          <Ionicons name="cafe" size={17} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.primaryButtonText}>
            Traktir {currentPresetObj.amount}
          </Text>
          <Ionicons name="open-outline" size={14} color="#ffffff" style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        {saweriaUrl && trakteerUrl ? (
          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.85}
            onPress={() => handleOpenDonation('trakteer')}
          >
            <Text style={styles.secondaryButtonText}>Dukung via Trakteer</Text>
            <Ionicons name="open-outline" size={13} color="#ef4444" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.85}
            onPress={handleShareLink}
          >
            <Ionicons
              name={copiedFeedback ? 'checkmark-circle' : 'share-social-outline'}
              size={14}
              color="#ef4444"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.secondaryButtonText}>
              {copiedFeedback ? 'Tersalin!' : 'Bagikan'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Info Metode Pembayaran */}
      <View style={styles.footerNoteRow}>
        <Ionicons name="shield-checkmark" size={13} color="#f59e0b" style={{ marginRight: 4 }} />
        <Text style={[styles.footerNoteText, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>
          Mendukung QRIS, GoPay, OVO, Dana & Transfer Bank
        </Text>
      </View>
    </View>
  );
};

export default DonationBox;

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    marginVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#d97706',
    letterSpacing: 0.5,
  },
  greenBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  greenBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#059669',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 10,
    marginBottom: 12,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  presetChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -7,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  popularBadgeRed: {
    backgroundColor: '#ef4444',
  },
  popularBadgeAmber: {
    backgroundColor: '#8b5cf6',
  },
  popularBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  presetChipLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
    textAlign: 'center',
  },
  presetChipAmount: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 14,
  },
  noteText: {
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  secondaryButtonText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 12,
  },
  footerNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  footerNoteText: {
    fontSize: 10.5,
  },
});
