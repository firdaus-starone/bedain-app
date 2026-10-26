"use client";
import React, { useState } from 'react';
import { Coffee, Heart, ExternalLink, Sparkles, Check, Gift } from 'lucide-react';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { useI18n } from '../hooks/useI18n';

/**
 * Komponen DonationBox (Traktir Kopi & Dukungan Komunitas)
 * Muncul di bawah artikel berita untuk memonetisasi pembaca setia via Saweria / Trakteer.
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
    { id: '15k', amount: 'Rp 15.000', label: '1 Cangkir Kopi ☕', amountNum: 15000 },
    { id: '30k', amount: 'Rp 30.000', label: '2 Cangkir Kopi ☕☕', amountNum: 30000 },
    { id: '75k', amount: 'Rp 75.000', label: 'Sponsor Riset Berita 🚀', amountNum: 75000 },
  ];

  const getTargetUrl = (platform) => {
    if (platform === 'saweria' && saweriaUrl) return saweriaUrl;
    if (platform === 'trakteer' && trakteerUrl) return trakteerUrl;
    if (generalDonationUrl) return generalDonationUrl;
    
    // Fallback: direct ke WhatsApp Redaksi untuk donasi/dukungan transfer
    const rawWa = settings?.contactWhatsapp || '';
    let cleanWa = rawWa.replace(/\D/g, '');
    if (cleanWa.startsWith('0')) cleanWa = '62' + cleanWa.slice(1);
    const waNumber = cleanWa || '6281112345678';
    return `https://wa.me/${waNumber}?text=Halo%20Redaksi%20Bedain%20News,%20saya%20ingin%20mendukung%20operasional%20jurnalisme%20Bedain%20News`;
  };

  return (
    <div
      className={`donation-box ${className}`}
      style={{
        margin: '36px 0 24px',
        padding: '24px 26px',
        borderRadius: '18px',
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(239, 68, 68, 0.05) 50%, rgba(168, 85, 247, 0.04) 100%)',
        border: '1px solid rgba(245, 158, 11, 0.28)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.16)',
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
    >
      {/* Decorative Glow Background */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', position: 'relative', zIndex: 1 }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 16px rgba(245, 158, 11, 0.35)'
          }}
        >
          <Coffee size={24} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#f59e0b',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Heart size={12} fill="#f59e0b" /> Dukungan Pembaca
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.12)',
                padding: '2px 8px',
                borderRadius: '12px',
                border: '1px solid rgba(16, 185, 129, 0.25)'
              }}
            >
              100% Untuk Operasional Redaksi
            </span>
          </div>

          <h3
            style={{
              margin: '6px 0 4px',
              fontSize: '1.15rem',
              fontWeight: 800,
              color: 'var(--color-text-primary, #ffffff)',
              lineHeight: 1.3
            }}
          >
            {title}
          </h3>

          <p
            style={{
              margin: 0,
              fontSize: '0.88rem',
              color: 'var(--color-text-secondary, #cbd5e1)',
              lineHeight: 1.5
            }}
          >
            {desc}
          </p>
        </div>
      </div>

      {/* Preset Pilihan Nilai Apresiasi */}
      <div
        style={{
          marginTop: '18px',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          position: 'relative',
          zIndex: 1
        }}
      >
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => setSelectedPreset(preset.id)}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              border: selectedPreset === preset.id ? '1.5px solid #f59e0b' : '1px solid var(--color-border, rgba(255,255,255,0.1))',
              background: selectedPreset === preset.id ? 'rgba(245, 158, 11, 0.16)' : 'var(--color-bg-secondary, rgba(255,255,255,0.03))',
              color: selectedPreset === preset.id ? '#fbbf24' : 'var(--color-text-primary, #e2e8f0)',
              fontSize: '0.82rem',
              fontWeight: selectedPreset === preset.id ? 700 : 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{preset.label}</span>
            <span style={{ opacity: 0.7, fontSize: '0.75rem' }}>({preset.amount})</span>
          </button>
        ))}
      </div>

      {/* Tombol Aksi Nyawer / Traktir */}
      <div
        style={{
          marginTop: '18px',
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
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#1a1003',
            padding: '10px 20px',
            borderRadius: '10px',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 18px rgba(245, 158, 11, 0.45)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(245, 158, 11, 0.35)';
          }}
        >
          <Coffee size={16} />
          <span>Traktir Kopi Redaksi</span>
          <ExternalLink size={14} />
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
              padding: '10px 16px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontSize: '0.85rem',
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

        <span
          style={{
            fontSize: '0.78rem',
            color: 'var(--color-text-secondary, #94a3b8)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <Sparkles size={13} style={{ color: '#f59e0b' }} /> Pembayaran instan via QRIS, GoPay, OVO, Dana
        </span>
      </div>
    </div>
  );
};

export default DonationBox;
