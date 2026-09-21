"use client";
import React, { useEffect } from 'react';
import { Sparkles, MessageCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useSiteSettings } from '../hooks/useSiteSettings';

/**
 * Komponen AdUnit & Sponsorship/Community Conversion Box
 * - Mendukung render nyata Google AdSense bila client & slot dikonfigurasi.
 * - Menampilkan kartu Sponsor / Bergabung Komunitas WhatsApp bila AdSense belum diisi.
 */
const AdUnit = ({ format = 'rectangle', client, slot, style = {}, className = '', variant = 'auto' }) => {
  const { settings } = useSiteSettings();
  const adClient = client || settings?.adsenseClientId;
  const adSlot = slot || settings?.adsenseSlotId;

  useEffect(() => {
    if (adClient && adSlot && typeof window !== 'undefined') {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error('AdSense push error:', e);
      }
    }
  }, [adClient, adSlot]);

  // Jika AdSense terpasang
  if (adClient && adSlot) {
    return (
      <div className={`ad-container ${format} ${className}`} style={{ margin: '24px auto', textAlign: 'center', ...style }}>
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={adClient}
          data-ad-slot={adSlot}
          data-ad-format={format === 'in-article' ? 'fluid' : 'auto'}
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // Jika tidak ada AdSense, jangan tampilkan kotak abu-abu jelek.
  // Tampilkan kartu penawaran bisnis / langganan komunitas berkelas!
  const rawWa = settings?.contactWhatsapp || '';
  let cleanWa = rawWa.replace(/\D/g, '');
  if (cleanWa.startsWith('0')) cleanWa = '62' + cleanWa.slice(1);
  const waNumber = cleanWa || '6281234567890';

  if (format === 'leaderboard') {
    return null; // Leaderboard kosong lebih baik disembunyikan agar header bersih
  }

  return (
    <div
      className={`ad-conversion-box ${className}`}
      style={{
        margin: '32px 0',
        padding: '22px 24px',
        borderRadius: '16px',
        background: variant === 'community' 
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)'
          : 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)',
        border: `1px solid ${variant === 'community' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '18px',
        flexWrap: 'wrap',
        ...style
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '240px' }}>
        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: '14px',
          background: variant === 'community' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          color: variant === 'community' ? '#10b981' : 'var(--color-accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {variant === 'community' ? <MessageCircle size={26} /> : <Sparkles size={26} />}
        </div>
        <div>
          <span style={{
            fontSize: '11px',
            fontWeight: 800,
            color: variant === 'community' ? '#10b981' : 'var(--color-accent)',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            display: 'block',
            marginBottom: '4px'
          }}>
            {variant === 'community' ? '📲 KOMUNITAS RESMI BEDAIN NEWS' : '🚀 SLOT MITRA & SPONSOR'}
          </span>
          <h4 style={{
            margin: '0 0 4px 0',
            fontSize: '1.05rem',
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-heading)',
            lineHeight: 1.3
          }}>
            {variant === 'community'
              ? 'Dapatkan Peringatan Berita Terkini Langsung di WhatsApp Anda!'
              : 'Perluas Jangkauan Bisnis & Brand Anda Bersama Kami'}
          </h4>
          <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
            {variant === 'community'
              ? 'Bergabung bersama ribuan pembaca lainnya untuk mendapatkan update berita pilihan.'
              : 'Tempatkan iklan usaha, banner, atau advertorial Anda di hadapan pembaca setia Bedain News.'}
          </p>
        </div>
      </div>

      <a
        href={variant === 'community' 
          ? `https://wa.me/${waNumber}?text=Halo%20Redaksi,%20saya%20ingin%20bergabung%20dengan%20grup%20WhatsApp%20berita%20Bedain%20News`
          : `https://wa.me/${waNumber}?text=Halo%20Redaksi%20Bedain%20News,%20saya%20tertarik%20pasang%20iklan/sponsor%20di%20portal%20berita`
        }
        target="_blank"
        rel="noopener noreferrer"
        style={{
          background: variant === 'community' ? '#10b981' : 'var(--color-accent)',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '10px',
          textDecoration: 'none',
          fontSize: '0.88rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: variant === 'community' ? '0 4px 14px rgba(16, 185, 129, 0.3)' : '0 4px 14px rgba(239, 68, 68, 0.3)',
          transition: 'transform 0.2s',
          whiteSpace: 'nowrap'
        }}
      >
        <span>{variant === 'community' ? 'Gabung WhatsApp' : 'Hubungi Redaksi'}</span>
        <ArrowRight size={16} />
      </a>
    </div>
  );
};

export default AdUnit;
