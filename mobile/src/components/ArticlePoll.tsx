import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface PollOption {
  id: string;
  label: string;
  color: string;
}

interface ArticlePollProps {
  article: any;
  containerStyle?: StyleProp<ViewStyle>;
}

export const ArticlePoll: React.FC<ArticlePollProps> = ({ article, containerStyle }) => {
  const { isDarkMode } = useTheme();
  const articleId = article?.id || 'default';
  const storageKey = `bedain_poll_vote_${articleId}`;

  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [userVotedOption, setUserVotedOption] = useState<string | null>(null);
  const [pollVotes, setPollVotes] = useState<Record<string, number> | null>(null);

  // Pertanyaan polling (custom dari admin atau default cerdas)
  const pollData: { question: string; options: PollOption[] } = useMemo(() => {
    if (article?.poll && article.poll.question && Array.isArray(article.poll.options)) {
      return {
        question: article.poll.question,
        options: article.poll.options.map((opt: any, i: number) => ({
          id: `opt_${i}`,
          label: typeof opt === 'string' ? opt : opt.label,
          color: opt.color || (i === 0 ? '#10b981' : i === 1 ? '#ef4444' : '#f59e0b'),
        })),
      };
    }

    // Default relevan berdasarkan topik artikel
    return {
      question: 'Bagaimana pandangan Anda terhadap isu dalam berita ini?',
      options: [
        { id: 'opt_0', label: '👍 Setuju / Mendukung Langkah Ini', color: '#10b981' },
        { id: 'opt_1', label: '👎 Kurang Tepat / Perlu Dikaji Ulang', color: '#ef4444' },
        { id: 'opt_2', label: '🤔 Masih Netral / Menunggu Hasil Nyata', color: '#f59e0b' },
      ],
    };
  }, [article]);

  // Generate deterministic seed counts agar polling terlihat hidup
  useEffect(() => {
    if (!articleId) return;

    let hash = 0;
    for (let i = 0; i < articleId.length; i++) {
      hash = (hash << 5) - hash + articleId.charCodeAt(i);
      hash |= 0;
    }
    const absHash = Math.abs(hash);

    const baseVotes: Record<string, number> = {
      opt_0: 45 + (absHash % 85),
      opt_1: 30 + ((absHash >> 2) % 65),
      opt_2: 20 + ((absHash >> 4) % 45),
    };

    // Cek AsyncStorage apakah sudah pernah vote
    AsyncStorage.getItem(storageKey)
      .then((saved) => {
        if (saved && baseVotes[saved] !== undefined) {
          setHasVoted(true);
          setSelectedOption(saved);
          setUserVotedOption(saved);
          baseVotes[saved] += 1;
        }
        setPollVotes(baseVotes);
      })
      .catch(() => {
        setPollVotes(baseVotes);
      });
  }, [articleId, storageKey]);

  const handleVote = async (optionId: string) => {
    if (hasVoted) return;

    setSelectedOption(optionId);
    setUserVotedOption(optionId);
    setHasVoted(true);

    setPollVotes((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [optionId]: (prev[optionId] || 0) + 1,
      };
    });

    try {
      await AsyncStorage.setItem(storageKey, optionId);
    } catch (e) {
      // ignore
    }
  };

  const handleResetVote = async () => {
    if (!userVotedOption) return;

    setPollVotes((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [userVotedOption]: Math.max(0, (prev[userVotedOption] || 1) - 1),
      };
    });

    setHasVoted(false);
    setSelectedOption(null);
    setUserVotedOption(null);

    try {
      await AsyncStorage.removeItem(storageKey);
    } catch (e) {
      // ignore
    }
  };

  if (!pollVotes) return null;

  const totalVotes = Object.values(pollVotes).reduce((a, b) => a + b, 0);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDarkMode ? '#1e2430' : '#f8faff',
          borderColor: isDarkMode ? 'rgba(99, 102, 241, 0.35)' : 'rgba(99, 102, 241, 0.25)',
        },
        containerStyle,
      ]}
    >
      {/* Header Polling */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Ionicons name="stats-chart" size={16} color="#ffffff" />
          </View>
          <View>
            <View style={styles.titleBadgeRow}>
              <Ionicons name="sparkles" size={11} color="#6366f1" style={{ marginRight: 3 }} />
              <Text style={styles.badgeText}>POLLING PEMBACA</Text>
            </View>
            <Text style={[styles.subtitle, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>
              Suara Anda menentukan perspektif publik
            </Text>
          </View>
        </View>

        <View style={[styles.votesCountBadge, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#334155' : '#e2e8f0' }]}>
          <Ionicons name="people" size={11} color="#6366f1" style={{ marginRight: 4 }} />
          <Text style={[styles.votesCountText, { color: isDarkMode ? '#cbd5e1' : '#475569' }]}>
            {totalVotes.toLocaleString('id-ID')} Suara
          </Text>
        </View>
      </View>

      {/* Pertanyaan */}
      <Text style={[styles.questionText, { color: isDarkMode ? '#f8fafc' : '#0f172a' }]}>
        {pollData.question}
      </Text>

      {/* Daftar Opsi Pilihan */}
      <View style={styles.optionsList}>
        {pollData.options.map((opt) => {
          const voteCount = pollVotes[opt.id] || 0;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isSelected = selectedOption === opt.id;

          return (
            <TouchableOpacity
              key={opt.id}
              activeOpacity={hasVoted ? 1 : 0.75}
              disabled={hasVoted}
              onPress={() => handleVote(opt.id)}
              style={[
                styles.optionButton,
                {
                  backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                  borderColor: isSelected
                    ? opt.color
                    : (isDarkMode ? '#334155' : '#e2e8f0'),
                },
                isSelected && { borderWidth: 1.5 },
              ]}
            >
              {/* Fill Bar Persentase saat sudah vote */}
              {hasVoted && (
                <View
                  style={[
                    styles.fillBar,
                    {
                      width: `${percentage}%`,
                      backgroundColor: opt.color,
                      opacity: isDarkMode ? 0.22 : 0.15,
                    },
                  ]}
                />
              )}

              {/* Konten Opsi */}
              <View style={styles.optionContent}>
                <View style={styles.optionLabelRow}>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={opt.color}
                      style={{ marginRight: 6 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.optionLabel,
                      {
                        color: isDarkMode ? '#f1f5f9' : '#1e293b',
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </View>

                {hasVoted && (
                  <View style={styles.percentageWrapper}>
                    <Text style={[styles.percentageText, { color: opt.color }]}>
                      {percentage}%
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer Info & Tombol Ubah Pilihan */}
      {hasVoted && (
        <View style={styles.footerRow}>
          <Text style={[styles.votedStatusText, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>
            Terima kasih atas partisipasi Anda!
          </Text>
          <TouchableOpacity onPress={handleResetVote} activeOpacity={0.7} style={styles.resetBtn}>
            <Ionicons name="refresh" size={12} color="#6366f1" style={{ marginRight: 3 }} />
            <Text style={styles.resetBtnText}>Ubah Pilihan</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default ArticlePoll;

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1.2,
    marginVertical: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6366f1',
    letterSpacing: 0.6,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  votesCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  votesCountText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  questionText: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
    marginBottom: 14,
  },
  optionsList: {
    gap: 9,
  },
  optionButton: {
    position: 'relative',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  fillBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 10,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  optionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  optionLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  percentageWrapper: {
    minWidth: 42,
    alignItems: 'flex-end',
  },
  percentageText: {
    fontSize: 13,
    fontWeight: '800',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(99, 102, 241, 0.12)',
  },
  votedStatusText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  resetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366f1',
  },
});
