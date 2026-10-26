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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface DonationBoxProps {
  settings?: any;
  containerStyle?: StyleProp<ViewStyle>;
}

export const DonationBox: React.FC<DonationBoxProps> = ({ settings, containerStyle }) => {
  const { colors, isDarkMode } = useTheme();
  const [selectedPreset, setSelectedPreset] = useState<'15k' | '30k' | '75k'>('15k');

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
    { id: '15k' as const, amount: 'Rp 15.000', label: '1 Cangkir ☕' },
    { id: '30k' as const, amount: 'Rp 30.000', label: '2 Cangkir ☕☕' },
    { id: '75k' as const, amount: 'Rp 75.000', label: 'Sponsor Riset 🚀' },
  ];

  const getTargetUrl = (platform: 'saweria' | 'trakteer') => {
    if (platform === 'saweria' && saweriaUrl) return saweriaUrl;
    if (platform === 'trakteer' && trakteerUrl) return trakteerUrl;
    if (generalDonationUrl) return generalDonationUrl;

    // Fallback: direct ke WhatsApp Redaksi untuk donasi/dukungan transfer
    const rawWa = settings?.contactWhatsapp || '';
    let cleanWa = rawWa.replace(/\D/g, '');
    if (cleanWa.startsWith('0')) cleanWa = '62' + cleanWa.slice(1);
    const waNumber = cleanWa || '6281112345678';
    return `https://wa.me/${waNumber}?text=${encodeURIComponent('Halo Redaksi Bedain News, saya ingin mendukung operasional jurnalisme Bedain News.')}`;
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
      Alert.alert('Gagal Membuka Tautan', 'Tidak dapat membuka halaman dukungan saat ini.');
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
          <Ionicons name="cafe" size={24} color="#ffffff" />
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
              ]}
            >
              <Text
                style={[
                  styles.presetChipLabel,
                  { color: isSelected ? '#f59e0b' : (isDarkMode ? '#e2e8f0' : '#334155') },
                ]}
              >
                {preset.label}
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

      {/* Tombol Aksi */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={() => handleOpenDonation(saweriaUrl ? 'saweria' : 'trakteer')}
        >
          <Ionicons name="cafe" size={17} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.primaryButtonText}>Traktir Kopi Redaksi</Text>
          <Ionicons name="open-outline" size={14} color="#ffffff" style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        {saweriaUrl && trakteerUrl && (
          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.85}
            onPress={() => handleOpenDonation('trakteer')}
          >
            <Text style={styles.secondaryButtonText}>Dukung via Trakteer</Text>
            <Ionicons name="open-outline" size={13} color="#ef4444" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        )}
      </View>

      {/* Info Metode Pembayaran */}
      <View style={styles.footerNoteRow}>
        <Ionicons name="sparkles" size={13} color="#f59e0b" style={{ marginRight: 4 }} />
        <Text style={[styles.footerNoteText, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>
          Pembayaran instan via QRIS, GoPay, OVO, Dana & Transfer Bank
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  tagBadgeText: {
    color: '#d97706',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  greenBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 0.5,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  greenBadgeText: {
    color: '#10b981',
    fontSize: 9.5,
    fontWeight: '700',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    marginTop: 2,
  },
  description: {
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 10,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  presetChipAmount: {
    fontSize: 9.5,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d97706',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 2,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  secondaryButtonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
  footerNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(245, 158, 11, 0.2)',
  },
  footerNoteText: {
    fontSize: 10.5,
    fontWeight: '500',
    flex: 1,
  },
});
