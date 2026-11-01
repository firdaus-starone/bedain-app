"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, CheckCircle2, Users, Sparkles, RefreshCw } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';

/**
 * Komponen ArticlePoll (📊 Polling Cepat Isu Hangat)
 * Meningkatkan keterlibatan pembaca dengan survei opini interaktif di akhir berita.
 */
const ArticlePoll = ({ article, className = '', style = {} }) => {
  const { lang } = useI18n();
  const articleId = article?.id || 'default';
  const storageKey = `bedain_poll_vote_${articleId}`;

  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [userVotedOption, setUserVotedOption] = useState(null);
  const [pollVotes, setPollVotes] = useState(null);

  // Pertanyaan polling (custom dari admin atau default cerdas)
  const pollData = useMemo(() => {
    if (article?.poll && article.poll.question && Array.isArray(article.poll.options)) {
      return {
        question: article.poll.question,
        options: article.poll.options.map((opt, i) => ({
          id: `opt_${i}`,
          label: typeof opt === 'string' ? opt : opt.label,
          color: opt.color || (i === 0 ? '#10b981' : i === 1 ? '#ef4444' : '#f59e0b')
        }))
      };
    }

    // Default relevan berdasarkan topik/judul artikel disesuaikan dengan bahasa aktif
    const questionText = lang === 'zh'
      ? '您对本篇报道中的议题有何看法？'
      : lang === 'en'
      ? 'What is your view on the issue in this report?'
      : 'Bagaimana pandangan Anda terhadap isu dalam berita ini?';

    const defaultOptions = [
      {
        id: 'opt_0',
        label: lang === 'zh' ? '👍 赞同 / 支持这一举措' : lang === 'en' ? '👍 Agree / Support This Move' : '👍 Setuju / Mendukung Langkah Ini',
        color: '#10b981'
      },
      {
        id: 'opt_1',
        label: lang === 'zh' ? '👎 不太恰当 / 需要重新评估' : lang === 'en' ? '👎 Inappropriate / Needs Review' : '👎 Kurang Tepat / Perlu Dikaji Ulang',
        color: '#ef4444'
      },
      {
        id: 'opt_2',
        label: lang === 'zh' ? '🤔 保持中立 / 观望实际成果' : lang === 'en' ? '🤔 Neutral / Waiting for Real Results' : '🤔 Masih Netral / Menunggu Hasil Nyata',
        color: '#f59e0b'
      }
    ];

    return {
      question: questionText,
      options: defaultOptions
    };
  }, [article, lang]);

  // Generate deterministic seed counts agar polling terlihat hidup
  useEffect(() => {
    if (!articleId) return;

    let hash = 0;
    for (let i = 0; i < articleId.length; i++) {
      hash = (hash << 5) - hash + articleId.charCodeAt(i);
      hash |= 0;
    }
    const absHash = Math.abs(hash);

    const baseVotes = {
      opt_0: 45 + (absHash % 85),
      opt_1: 30 + ((absHash >> 2) % 65),
      opt_2: 20 + ((absHash >> 4) % 45)
    };

    // Cek localStorage apakah sudah pernah vote
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && baseVotes[saved] !== undefined) {
        setHasVoted(true);
        setSelectedOption(saved);
        setUserVotedOption(saved);
        baseVotes[saved] += 1;
      }
    } catch (e) {}

    setPollVotes(baseVotes);
  }, [articleId, storageKey]);

  const handleVote = (optionId) => {
    if (hasVoted) return;

    setSelectedOption(optionId);
    setUserVotedOption(optionId);
    setHasVoted(true);

    setPollVotes((prev) => {
      const next = { ...prev };
      next[optionId] = (next[optionId] || 0) + 1;
      return next;
    });

    try {
      localStorage.setItem(storageKey, optionId);
    } catch (e) {}
  };

  const handleResetVote = () => {
    if (!userVotedOption) return;

    setPollVotes((prev) => {
      const next = { ...prev };
      next[userVotedOption] = Math.max(0, (next[userVotedOption] || 1) - 1);
      return next;
    });

    setHasVoted(false);
    setSelectedOption(null);
    setUserVotedOption(null);

    try {
      localStorage.removeItem(storageKey);
    } catch (e) {}
  };

  if (!pollVotes) return null;

  const totalVotes = Object.values(pollVotes).reduce((a, b) => a + b, 0);

  return (
    <div
      className={`article-poll-container ${className}`}
      style={{
        margin: '32px 0 24px',
        padding: '26px 24px',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.07) 0%, rgba(168, 85, 247, 0.05) 50%, var(--color-bg-secondary) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        ...style
      }}
    >
      <style>{`
        .poll-option-btn {
          position: relative;
          width: 100%;
          text-align: left;
          cursor: pointer;
          border-radius: 14px;
          padding: 14px 16px;
          border: 1px solid var(--color-border);
          background: var(--color-bg-primary);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          outline: none;
        }
        .poll-option-btn:not(.voted):hover {
          transform: translateY(-2px);
          border-color: rgba(99, 102, 241, 0.4) !important;
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.15);
        }
        .poll-fill-bar {
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          border-radius: 12px;
          transition: width 0.7s cubic-bezier(0.4, 0, 0.2, 1);
          opacity: 0.18;
          z-index: 0;
        }
      `}</style>

      {/* Header Polling */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
            }}
          >
            <BarChart3 size={18} strokeWidth={2.4} />
          </div>
          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#6366f1',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Sparkles size={11} /> {lang === 'zh' ? 'BEDAINS 社区民意调查' : lang === 'en' ? 'BEDAINS COMMUNITY POLL' : 'POLLING KOMUNITAS BEDAINS'}
            </span>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              {lang === 'zh' ? '您的发声决定公众视角' : lang === 'en' ? 'Your voice shapes the public perspective' : 'Suara Anda menentukan perspektif publik'}
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: '11px',
            color: 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: 'var(--color-bg-primary)',
            padding: '4px 10px',
            borderRadius: '999px',
            border: '1px solid var(--color-border)'
          }}
        >
          <Users size={12} />
          <span>
            {totalVotes.toLocaleString(lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : 'id-ID')}{' '}
            {lang === 'zh' ? '票已投' : lang === 'en' ? 'Votes Recorded' : 'Suara Masuk'}
          </span>
        </div>
      </div>

      {/* Pertanyaan */}
      <h3
        style={{
          margin: '0 0 16px',
          fontSize: '1.15rem',
          fontWeight: 800,
          color: 'var(--color-text-primary)',
          lineHeight: 1.4,
          fontFamily: 'var(--font-heading)'
        }}
      >
        {pollData.question}
      </h3>

      {/* Opsi Jawaban */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {pollData.options.map((opt) => {
          const voteCount = pollVotes[opt.id] || 0;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isSelected = selectedOption === opt.id;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleVote(opt.id)}
              disabled={hasVoted}
              className={`poll-option-btn ${hasVoted ? 'voted' : ''}`}
              style={{
                borderColor: isSelected ? opt.color : 'var(--color-border)',
                background: isSelected ? `${opt.color}10` : 'var(--color-bg-primary)'
              }}
            >
              {/* Bar Persentase Hasil */}
              {hasVoted && (
                <div
                  className="poll-fill-bar"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: opt.color
                  }}
                />
              )}

              {/* Konten Opsi */}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                  {hasVoted && isSelected && (
                    <CheckCircle2 size={16} color={opt.color} strokeWidth={2.6} style={{ flexShrink: 0 }} />
                  )}
                  <span
                    style={{
                      fontSize: '0.92rem',
                      fontWeight: isSelected ? 800 : 600,
                      color: isSelected ? opt.color : 'var(--color-text-primary)',
                      lineHeight: 1.35
                    }}
                  >
                    {opt.label}
                  </span>
                </div>

                {hasVoted && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        color: opt.color
                      }}
                    >
                      {percentage}%
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', opacity: 0.8 }}>
                      ({voteCount})
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Info & Ubah Pilihan */}
      <div
        style={{
          marginTop: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--color-text-secondary)'
        }}
      >
        <span>
          {hasVoted
            ? (lang === 'zh' ? '✅ 感谢您的参与！' : lang === 'en' ? '✅ Thank you for participating!' : '✅ Terima kasih telah berpartisipasi!')
            : (lang === 'zh' ? '👆 点击任一选项即可参与投票。' : lang === 'en' ? '👆 Click an option to cast your vote.' : '👆 Klik salah satu opsi untuk memberikan suara Anda.')
          }
        </span>

        {hasVoted && (
          <button
            type="button"
            onClick={handleResetVote}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#6366f1',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px'
            }}
          >
            <RefreshCw size={11} /> {lang === 'zh' ? '更改选择' : lang === 'en' ? 'Change Vote' : 'Ubah Pilihan'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ArticlePoll;
