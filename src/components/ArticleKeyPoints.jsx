"use client";
import React, { useState, useMemo } from 'react';
import { Zap, ChevronDown, ChevronUp, CheckCircle2, Sparkles } from 'lucide-react';

/**
 * Komponen ArticleKeyPoints (⚡ Poin Penting / 3 Detik Paham)
 * Menyajikan 3 intisari berita terpenting dalam hitungan detik.
 */
const ArticleKeyPoints = ({ article, className = '', style = {} }) => {
  const [isOpen, setIsOpen] = useState(true);

  // Ekstrak poin-poin utama dari artikel
  const points = useMemo(() => {
    if (!article) return [];

    // 1. Jika ada keyPoints manual (array atau string pemisah baris/bullet)
    if (Array.isArray(article.keyPoints) && article.keyPoints.length > 0) {
      return article.keyPoints.filter(Boolean);
    }
    if (typeof article.keyPoints === 'string' && article.keyPoints.trim()) {
      return article.keyPoints
        .split(/\n|•|-|\*/)
        .map((s) => s.trim())
        .filter((s) => s.length > 10);
    }

    // 2. Jika ada tldr manual
    if (Array.isArray(article.tldr) && article.tldr.length > 0) {
      return article.tldr.filter(Boolean);
    }
    if (typeof article.tldr === 'string' && article.tldr.trim()) {
      return article.tldr
        .split(/\n|•|-|\*/)
        .map((s) => s.trim())
        .filter((s) => s.length > 10);
    }

    // 3. Fallback cerdas: Ekstrak dari excerpt/lead atau paragraf awal
    const rawSource = article.excerpt || article.lead || '';
    const cleanText = rawSource
      .replace(/<[^>]*>?/gm, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .trim();

    if (cleanText) {
      // Pecah berdasarkan tanda titik atau titik koma
      const sentences = cleanText
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 15);

      if (sentences.length >= 2) {
        return sentences.slice(0, 3);
      }
      if (sentences.length === 1) {
        return [sentences[0]];
      }
    }

    // 4. Jika artikel ada content HTML, coba ambil 2-3 kalimat pertama
    if (article.content) {
      const plainContent = article.content
        .replace(/<[^>]*>?/gm, '')
        .replace(/\s+/g, ' ')
        .trim();
      const contentSentences = plainContent
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 25);
      if (contentSentences.length > 0) {
        return contentSentences.slice(0, 3);
      }
    }

    return [];
  }, [article]);

  if (!points || points.length === 0) {
    return null;
  }

  return (
    <div
      className={`article-keypoints-box ${className}`}
      style={{
        margin: '22px 0 28px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(245, 158, 11, 0.04) 50%, var(--color-bg-secondary) 100%)',
        border: '1.5px solid rgba(239, 68, 68, 0.22)',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
        transition: 'all 0.3s ease',
        ...style
      }}
    >
      <style>{`
        .keypoints-toggle-btn:hover {
          background: rgba(239, 68, 68, 0.08) !important;
        }
        .keypoint-item-bullet {
          transition: transform 0.2s ease;
        }
        .keypoint-item-bullet:hover {
          transform: translateX(3px);
        }
      `}</style>

      {/* Header Bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="keypoints-toggle-btn"
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          borderBottom: isOpen ? '1px solid rgba(239, 68, 68, 0.12)' : 'none',
          transition: 'background 0.2s ease'
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
                  background: 'rgba(245, 158, 11, 0.12)',
                  padding: '1px 6px',
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
            justifyContent: 'center',
            borderRadius: '8px'
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
              className="keypoint-item-bullet"
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
                  fontSize: '0.94rem',
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
              color: 'var(--color-text-secondary)'
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} style={{ color: '#f59e0b' }} /> Dirangkum otomatis untuk baca kilat
            </span>
            <span style={{ fontStyle: 'italic' }}>
              Gulir ke bawah untuk investigasi lengkap
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleKeyPoints;
