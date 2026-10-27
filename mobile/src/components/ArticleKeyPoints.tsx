import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

/**
 * Pembersih string mendalam untuk teks editorial berita
 */
const sanitizeNewsText = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\[[A-Za-z0-9\s/_-]+\]/g, '') // Bersihkan tag seperti [B]
    .replace(/\(Red[a-z0-9\s/_-]*\)/gi, '') // Bersihkan tag (Redaksi)
    .replace(/([.?!])([A-Z])/g, '$1 $2') // Beri spasi jika titik nempel huruf kapital
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Menghapus kota / dateline media pembuka seperti:
 * "INDRAMAYU - BEDAINNEWS.COM – " atau "JAKARTA, BEDAINNEWS.COM – "
 */
const stripDateline = (text: string): string => {
  if (!text) return '';
  let res = text.trim();
  res = res.replace(/^(?:[A-Za-z0-9.\s,]+)?(?:BEDAINNEWS(?:\.COM)?|JAKARTA|INDRAMAYU|BANDUNG|SURABAYA|SEMARANG|MEDAN|ANTARA|KOMPAS|DETIK|CNN)(?:\.COM)?(?:\s*[-–—]+\s*)+/i, '');
  res = res.replace(/^[A-Za-z0-9.\s,]{2,25}\s*[-–—]+\s*/, '');
  return res.trim();
};

/**
 * Merapikan kalimat agar tidak kepanjangan dan berakhir rapi
 */
const trimToSentence = (text: string, maxLen = 160): string => {
  if (!text) return '';
  let s = text.trim();
  s = s.replace(/^[“"']+|[”"']+$/g, '').trim();

  if (s.length <= maxLen) {
    return s.endsWith('.') || s.endsWith('!') || s.endsWith('?') ? s : s + '.';
  }
  let cut = s.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > 45) {
    cut = cut.slice(0, lastSpace);
  }
  return cut.trim().replace(/[,;:-]$/, '') + '...';
};

interface ArticleKeyPointsProps {
  article: any;
  containerStyle?: StyleProp<ViewStyle>;
}

export const ArticleKeyPoints: React.FC<ArticleKeyPointsProps> = ({ article, containerStyle }) => {
  const { isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(true);

  const points = useMemo(() => {
    if (!article) return [];

    // 1. Cek jika ada custom keyPoints dari CMS
    if (Array.isArray(article.keyPoints) && article.keyPoints.length > 0) {
      return article.keyPoints.map(sanitizeNewsText).filter((s: string) => s.length > 10);
    }
    if (typeof article.keyPoints === 'string' && article.keyPoints.trim()) {
      return article.keyPoints
        .split(/\n|•|-|\*/)
        .map(sanitizeNewsText)
        .filter((s: string) => s.length > 10);
    }

    // 2. Cek jika ada custom tldr dari CMS
    if (Array.isArray(article.tldr) && article.tldr.length > 0) {
      return article.tldr.map(sanitizeNewsText).filter((s: string) => s.length > 10);
    }
    if (typeof article.tldr === 'string' && article.tldr.trim()) {
      return article.tldr
        .split(/\n|•|-|\*/)
        .map(sanitizeNewsText)
        .filter((s: string) => s.length > 10);
    }

    // 3. Ekstraksi otomatis cerdas dari paragraf artikel
    const content = article.content || '';
    const rawParagraphs = content
      .split(/<\/p>|<br\s*\/?>/i)
      .map(sanitizeNewsText)
      .map(stripDateline)
      .filter((p: string) => p.length > 30);

    const extracted: string[] = [];
    const leadText = sanitizeNewsText(article.seoDescription || article.excerpt || article.summary || '');

    // Jelajahi paragraf-paragraf inti artikel
    for (const para of rawParagraphs) {
      const sents = para
        .split(/(?<=[.?!])\s+/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 25);

      for (const sent of sents) {
        const isDuplicateLead = leadText && (leadText.includes(sent.slice(0, 30)) || sent.includes(leadText.slice(0, 30)));
        const isAlreadyAdded = extracted.some((item) => item.includes(sent.slice(0, 25)));

        if (!isDuplicateLead && !isAlreadyAdded) {
          extracted.push(trimToSentence(sent));
        }

        if (extracted.length >= 3) break;
      }

      if (extracted.length >= 3) break;
    }

    // Fallback jika body terlalu pendek
    if (extracted.length === 0 && leadText) {
      const leadSents = leadText
        .split(/(?<=[.?!])\s+/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 20);
      if (leadSents.length > 0) {
        return leadSents.slice(0, 3).map((s: string) => trimToSentence(s));
      }
    }

    return extracted.slice(0, 3);
  }, [article]);

  if (!points || points.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDarkMode ? '#1e2430' : '#fff7ed',
          borderColor: isDarkMode ? 'rgba(249, 115, 22, 0.35)' : 'rgba(249, 115, 22, 0.3)',
        },
        containerStyle,
      ]}
    >
      {/* Header Interaktif (Bisa di-tap untuk Expand / Collapse) */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setIsOpen(!isOpen)}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Ionicons name="flash" size={15} color="#ffffff" />
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: isDarkMode ? '#f8fafc' : '#0f172a' }]}>
                3 Detik Paham
              </Text>
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={10} color="#ea580c" style={{ marginRight: 2 }} />
                <Text style={styles.aiBadgeText}>POIN UTAMA</Text>
              </View>
            </View>
            <Text style={[styles.subtitle, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>
              Ringkasan inti berita terpenting
            </Text>
          </View>
        </View>

        <View style={[styles.chevronBtn, { backgroundColor: isDarkMode ? '#334155' : '#fed7aa' }]}>
          <Ionicons
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={isDarkMode ? '#cbd5e1' : '#c2410c'}
          />
        </View>
      </TouchableOpacity>

      {/* Konten Poin Penting */}
      {isOpen && (
        <View style={styles.pointsList}>
          {points.map((point: string, idx: number) => (
            <View key={idx} style={styles.pointItem}>
              <View style={[styles.numberBadge, { backgroundColor: isDarkMode ? 'rgba(249, 115, 22, 0.2)' : '#ffedd5' }]}>
                <Text style={styles.numberBadgeText}>{idx + 1}</Text>
              </View>
              <Text
                style={[
                  styles.pointText,
                  { color: isDarkMode ? '#e2e8f0' : '#1e293b' },
                ]}
              >
                {point}
              </Text>
            </View>
          ))}

          {/* Micro Footer */}
          <View style={[styles.footerRow, { borderTopColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(249, 115, 22, 0.15)' }]}>
            <Ionicons name="sparkles-outline" size={12} color="#f97316" style={{ marginRight: 4 }} />
            <Text style={[styles.footerText, { color: isDarkMode ? '#94a3b8' : '#78716c' }]}>
              Disarikan cerdas untuk membaca lebih cepat & efisien
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default ArticleKeyPoints;

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1.2,
    marginVertical: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffedd5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ea580c',
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  chevronBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  pointsList: {
    marginTop: 12,
    gap: 10,
  },
  pointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  numberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  numberBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
  },
  pointText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },
  footerText: {
    fontSize: 10.5,
    fontStyle: 'italic',
  },
});
