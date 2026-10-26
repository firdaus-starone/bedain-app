"use client";
import React, { useState, useMemo } from 'react';
import { Zap, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

/**
 * Pembersih string mendalam untuk teks editorial berita
 */
const sanitizeNewsText = (str) => {
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
const stripDateline = (text) => {
  if (!text) return '';
  let res = text.trim();
  res = res.replace(/^(?:[A-Za-z0-9.\s,]+)?(?:BEDAINNEWS(?:\.COM)?|JAKARTA|INDRAMAYU|BANDUNG|SURABAYA|SEMARANG|MEDAN|ANTARA|KOMPAS|DETIK|CNN)(?:\.COM)?(?:\s*[-–—]+\s*)+/i, '');
  res = res.replace(/^[A-Za-z0-9.\s,]{2,25}\s*[-–—]+\s*/, '');
  return res.trim();
};

/**
 * Merapikan kalimat agar tidak kepanjangan dan berakhir rapi
 */
const trimToSentence = (text, maxLen = 160) => {
  if (!text) return '';
  let s = text.trim();
  // Hilangkan tanda kutip pembuka di awal jika ada
  s = s.replace(/^[“"']+|[”"']+$/g, '').trim();

  if (s.length <= maxLen) {
    return s.endsWith('.') || s.endsWith('!') || s.endsWith('?') ? s : s + '.';
  }
  let cut = s.slice(0, maxLen);
  let lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > 45) {
    cut = cut.slice(0, lastSpace);
  }
  return cut.trim().replace(/[,;:-]$/, '') + '...';
};

/**
 * Komponen ArticleKeyPoints (⚡ Poin Penting / 3 Detik Paham)
 */
const ArticleKeyPoints = ({ article, className = '', style = {} }) => {
  const [isOpen, setIsOpen] = useState(true);

  const points = useMemo(() => {
    if (!article) return [];

    // 1. Cek jika ada custom keyPoints dari CMS
    if (Array.isArray(article.keyPoints) && article.keyPoints.length > 0) {
      return article.keyPoints.map(sanitizeNewsText).filter((s) => s.length > 10);
    }
    if (typeof article.keyPoints === 'string' && article.keyPoints.trim()) {
      return article.keyPoints
        .split(/\n|•|-|\*/)
        .map(sanitizeNewsText)
        .filter((s) => s.length > 10);
    }

    // 2. Cek jika ada custom tldr dari CMS
    if (Array.isArray(article.tldr) && article.tldr.length > 0) {
      return article.tldr.map(sanitizeNewsText).filter((s) => s.length > 10);
    }
    if (typeof article.tldr === 'string' && article.tldr.trim()) {
      return article.tldr
        .split(/\n|•|-|\*/)
        .map(sanitizeNewsText)
        .filter((s) => s.length > 10);
    }

    // 3. Ekstraksi otomatis cerdas dari paragraf artikel
    const content = article.content || '';
    const rawParagraphs = content
      .split(/<\/p>|<br\s*\/?>/i)
      .map(sanitizeNewsText)
      .map(stripDateline)
      .filter((p) => p.length > 30);

    const extracted = [];
    const leadText = sanitizeNewsText(article.seoDescription || article.excerpt || '');

    // Jelajahi paragraf-paragraf inti artikel
    for (const para of rawParagraphs) {
      // Pecah paragraf menjadi kalimat-kalimat
      const sents = para
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 25);

      for (const sent of sents) {
        // Jangan duplikat dengan lead/seo description yang sudah ada di atasnya
        const isDuplicateLead = leadText && (leadText.includes(sent.slice(0, 30)) || sent.includes(leadText.slice(0, 30)));
        const isAlreadyAdded = extracted.some((item) => item.includes(sent.slice(0, 25)));

        if (!isDuplicateLead && !isAlreadyAdded) {
          extracted.push(trimToSentence(sent));
        }

        if (extracted.length >= 3) break;
      }

      if (extracted.length >= 3) break;
    }

    // Jika artikel sangat pendek atau hanya menghasilkan 1-2 kalimat dari body
    if (extracted.length === 0 && leadText) {
      const leadSents = leadText
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 20);
      if (leadSents.length > 0) {
        return leadSents.slice(0, 3).map((s) => trimToSentence(s));
      }
    }

    return extracted.slice(0, 3);
  }, [article]);

  if (!points || points.length === 0) {
    return null;
  }

  return (
    <div
      className={`article-keypoints-box ${className}`}
      style={{
        margin: '18px 0 24px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.06) 0%, rgba(245, 158, 11, 0.04) 50%, var(--color-bg-secondary) 100%)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.3s ease',
        ...style
      }}
    >
      {/* Header Bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          borderBottom: isOpen ? '1px solid rgba(239, 68, 68, 0.12)' : 'none',
          background: 'rgba(239, 68, 68, 0.03)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)'
            }}
          >
            <Zap size={18} fill="#ffffff" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--color-accent, #ef4444)',
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase'
                }}
              >
                ⚡ 3 DETIK PAHAM
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#f59e0b',
                  background: 'rgba(245, 158, 11, 0.14)',
                  padding: '1px 7px',
                  borderRadius: '6px'
                }}
              >
                Intisari Berita
              </span>
            </div>
            <h4
              style={{
                margin: '2px 0 0',
                fontSize: '0.96rem',
                fontWeight: 800,
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-heading)'
              }}
            >
              Poin Kunci Yang Perlu Anda Tahu
            </h4>
          </div>
        </div>

        <button
          type="button"
          aria-label={isOpen ? 'Tutup Poin Kunci' : 'Buka Poin Kunci'}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {/* Konten Poin-poin */}
      {isOpen && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {points.map((point, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}
            >
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: 'var(--color-accent, #ef4444)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 800,
                  flexShrink: 0,
                  marginTop: '2px'
                }}
              >
                {index + 1}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.93rem',
                  lineHeight: 1.55,
                  color: 'var(--color-text-primary)',
                  fontWeight: 500
                }}
              >
                {point}
              </p>
            </div>
          ))}

          <div
            style={{
              marginTop: '4px',
              paddingTop: '10px',
              borderTop: '1px dashed var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: 'var(--color-text-secondary)',
              flexWrap: 'wrap',
              gap: '6px'
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} style={{ color: '#f59e0b' }} /> Dirangkum otomatis untuk baca kilat
            </span>
            <span style={{ fontStyle: 'italic', opacity: 0.8 }}>
              Gulir ke bawah untuk naskah lengkap
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleKeyPoints;
