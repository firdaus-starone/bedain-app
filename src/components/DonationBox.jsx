"use client";
import React, { useState } from 'react';
import { Coffee, Heart, ExternalLink, Sparkles, Check, Copy, Share2, Flame } from 'lucide-react';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { useI18n } from '../hooks/useI18n';

/**
 * Komponen DonationBox (Traktir Kopi & Dukungan Komunitas)
 * Versi estetik modern dengan interaksi preset nominal, efek glassmorphism,
 * serta animasi halus untuk memonetisasi pembaca setia.
 */
const DonationBox = ({ className = '', style = {} }) => {
  const { settings } = useSiteSettings();
  const { t } = useI18n();
  const [selectedPreset, setSelectedPreset] = useState('15k');
  const [copied, setCopied] = useState(false);

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
      id: '15k',
      amount: 'Rp 15.000',
      label: '1 Kopi',
      emoji: '☕',
      amountNum: 15000,
      note: 'Dukungan segar untuk 1 laporan independen'
    },
    {
      id: '30k',
      amount: 'Rp 30.000',
      label: '2 Kopi',
      emoji: '☕☕',
      amountNum: 30000,
      note: 'Bahan bakar tim riset berita investigasi harian'
    },
    {
      id: '75k',
      amount: 'Rp 75.000',
      label: 'Sponsor Riset',
      emoji: '🚀',
      amountNum: 75000,
      note: 'Mitra utama penopang kebebasan ruang redaksi'
    },
  ];

  const currentPresetObj = presets.find((p) => p.id === selectedPreset) || presets[0];

  const getTargetUrl = (platform) => {
    if (platform === 'saweria' && saweriaUrl) return saweriaUrl;
    if (platform === 'trakteer' && trakteerUrl) return trakteerUrl;
    if (generalDonationUrl) return generalDonationUrl;

    // Fallback: direct ke WhatsApp Redaksi untuk donasi/dukungan transfer
    const rawWa = settings?.contactWhatsapp || '';
    let cleanWa = rawWa.replace(/\D/g, '');
    if (cleanWa.startsWith('0')) cleanWa = '62' + cleanWa.slice(1);
    const waNumber = cleanWa || '6281112345678';
    return `https://wa.me/${waNumber}?text=Halo%20Redaksi%20Bedain%20News,%20saya%20ingin%20traktir%20kopi%20dukungan%20sebesar%20${encodeURIComponent(currentPresetObj.amount)}`;
  };

  const handleCopyLink = () => {
    const link = saweriaUrl || trakteerUrl || window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }).catch(() => {});
    }
  };

  return (
    <div
      className={`donation-box-premium ${className}`}
      style={{
        margin: '36px 0 24px',
        padding: '28px 26px',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.09) 0%, rgba(239, 68, 68, 0.05) 50%, rgba(168, 85, 247, 0.04) 100%)',
        border: '1px solid rgba(245, 158, 11, 0.28)',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(245, 158, 11, 0.06)',
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        ...style
      }}
    >
      <style>{`
        @keyframes coffeeFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-4px) rotate(-3deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.08); }
        }
        .donation-box-premium:hover {
          border-color: rgba(245, 158, 11, 0.45) !important;
          box-shadow: 0 16px 42px rgba(0, 0, 0, 0.16), 0 0 24px rgba(245, 158, 11, 0.15) !important;
        }
        .preset-chip-btn {
          position: relative;
          cursor: pointer;
          border-radius: 12px;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          user-select: none;
        }
        .preset-chip-btn:hover {
          transform: translateY(-2px);
        }
        .action-traktir-main {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .action-traktir-main:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(245, 158, 11, 0.5) !important;
        }
        @media (max-width: 640px) {
          .donation-box-premium {
            padding: 20px 18px !important;
          }
          .donation-header-flex {
            flex-direction: column !important;
            gap: 12px !important;
          }
          .donation-presets-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* Decorative Radial Lights */}
      <div
        style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.22) 0%, transparent 70%)',
          pointerEvents: 'none',
          animation: 'pulseGlow 6s ease-in-out infinite'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-60px',
          left: '-40px',
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(239, 68, 68, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />

      {/* Header Bagian Atas */}
      <div className="donation-header-flex" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', position: 'relative', zIndex: 1 }}>
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 6px 20px rgba(245, 158, 11, 0.4)',
            animation: 'coffeeFloat 4s ease-in-out infinite'
          }}
        >
          <Coffee size={26} strokeWidth={2.4} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#f59e0b',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Heart size={12} fill="#f59e0b" /> Dukungan Pembaca
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.14)',
                padding: '2px 8px',
                borderRadius: '999px',
                border: '1px solid rgba(16, 185, 129, 0.28)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Sparkles size={11} /> 100% Untuk Riset Redaksi
            </span>
          </div>

          <h3
            style={{
              margin: '0 0 6px',
              fontSize: '1.2rem',
              fontWeight: 800,
              color: 'var(--color-text-primary, #ffffff)',
              lineHeight: 1.35,
              fontFamily: 'var(--font-heading)'
            }}
          >
            {title}
          </h3>

          <p
            style={{
              margin: 0,
              fontSize: '0.9rem',
              color: 'var(--color-text-secondary, #cbd5e1)',
              lineHeight: 1.55
            }}
          >
            {desc}
          </p>
        </div>
      </div>

      {/* Preset Pilihan Nominal Interaktif */}
      <div style={{ marginTop: '20px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-text-secondary, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Pilih Paket Apresiasi:
          </span>
          <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>
            {currentPresetObj.note}
          </span>
        </div>

        <div
          className="donation-presets-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '10px'
          }}
        >
          {presets.map((preset) => {
            const isSelected = selectedPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSelectedPreset(preset.id)}
                className={`preset-chip-btn ${isSelected ? 'active' : ''}`}
                style={{
                  border: isSelected ? '1.5px solid #f59e0b' : '1px solid var(--color-border, rgba(255,255,255,0.1))',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(245, 158, 11, 0.08) 100%)'
                    : 'var(--color-bg-secondary, rgba(255,255,255,0.03))',
                  color: isSelected ? '#fbbf24' : 'var(--color-text-primary, #e2e8f0)',
                  boxShadow: isSelected ? '0 4px 16px rgba(245, 158, 11, 0.25)' : 'none',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.15rem' }}>{preset.emoji}</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: isSelected ? 800 : 600, lineHeight: 1.2 }}>
                      {preset.label}
                    </div>
                    <div style={{ fontSize: '0.75rem', opacity: isSelected ? 1 : 0.7, color: isSelected ? '#f59e0b' : 'inherit' }}>
                      {preset.amount}
                    </div>
                  </div>
                </div>

                {isSelected ? (
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#f59e0b',
                      color: '#000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Check size={13} strokeWidth={3} />
                  </div>
                ) : (
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: '1.5px solid var(--color-border, rgba(255,255,255,0.15))',
                      flexShrink: 0
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tombol Aksi Nyawer / Traktir */}
      <div
        style={{
          marginTop: '22px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* Tombol Utama: Saweria atau Trakteer */}
        <a
          href={getTargetUrl(saweriaUrl ? 'saweria' : 'trakteer')}
          target="_blank"
          rel="noopener noreferrer"
          className="action-traktir-main"
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#1a1003',
            padding: '12px 22px',
            borderRadius: '12px',
            textDecoration: 'none',
            fontSize: '0.92rem',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(245, 158, 11, 0.4)',
            cursor: 'pointer'
          }}
        >
          <Coffee size={17} strokeWidth={2.4} />
          <span>Traktir {currentPresetObj.amount} Sekarang</span>
          <ExternalLink size={15} />
        </a>

        {/* Jika ada Trakteer dan Saweria sekaligus, sediakan opsi kedua */}
        {saweriaUrl && trakteerUrl && (
          <a
            href={trakteerUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '11px 18px',
              borderRadius: '12px',
              textDecoration: 'none',
              fontSize: '0.86rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <span>Dukung via Trakteer</span>
            <ExternalLink size={13} />
          </a>
        )}

        {/* Tombol Salin Link Dukungan */}
        <button
          type="button"
          onClick={handleCopyLink}
          title="Salin Tautan Dukungan"
          style={{
            background: 'var(--color-bg-secondary, rgba(255,255,255,0.05))',
            border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
            color: copied ? '#10b981' : 'var(--color-text-secondary, #cbd5e1)',
            padding: '11px 14px',
            borderRadius: '12px',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? 'Tersalin!' : 'Salin Info'}</span>
        </button>

        <span
          style={{
            fontSize: '0.8rem',
            color: 'var(--color-text-secondary, #94a3b8)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            marginLeft: 'auto'
          }}
        >
          <Sparkles size={14} style={{ color: '#f59e0b' }} /> QRIS • GoPay • OVO • Dana • ShopeePay
        </span>
      </div>
    </div>
  );
};

export default DonationBox;
