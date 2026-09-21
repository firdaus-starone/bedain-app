"use client";
import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ExternalLink, Sparkles } from 'lucide-react';
import { useSiteSettings } from '../hooks/useSiteSettings';

const bannersCache = new Map();
const bannersPromiseMap = new Map();

const AdBanner = ({ slot = 'article' }) => {
  const { settings } = useSiteSettings();
  const [banner, setBanner] = useState(() => bannersCache.has(slot) ? bannersCache.get(slot) : null);
  const [loading, setLoading] = useState(() => !bannersCache.has(slot));

  useEffect(() => {
    let isMounted = true;

    if (bannersCache.has(slot)) {
      setBanner(bannersCache.get(slot));
      setLoading(false);
      return;
    }

    if (bannersPromiseMap.has(slot)) {
      bannersPromiseMap.get(slot).then((bData) => {
        if (isMounted) {
          setBanner(bData);
          setLoading(false);
        }
      });
      return;
    }

    const promise = (async () => {
      try {
        const q = query(
          collection(db, 'banners'),
          where('slot', '==', slot),
          where('status', '==', 'active'),
          limit(1)
        );
        const snap = await getDocs(q);
        const bData = !snap.empty ? { id: snap.docs[0].id, ...snap.docs[0].data() } : null;
        bannersCache.set(slot, bData);
        return bData;
      } catch (err) {
        console.error('Error loading sponsor banner:', err);
        return null;
      }
    })();

    bannersPromiseMap.set(slot, promise);
    promise.then((bData) => {
      if (isMounted) {
        setBanner(bData);
        setLoading(false);
      }
      bannersPromiseMap.delete(slot);
    });

    return () => {
      isMounted = false;
    };
  }, [slot]);

  if (loading) return null;

  // Custom active sponsor banner
  if (banner) {
    // === SLOT HEADER: Leaderboard elegan dalam container ===
    if (slot === 'header') {
      return (
        <div className="container sponsor-banner sponsor-slot-header" style={{ marginBottom: 0 }}>
          <a
            href={banner.targetUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="sponsor-banner-link"
            style={{ display: 'block', textDecoration: 'none', position: 'relative', overflow: 'hidden', color: '#ffffff' }}
          >
            {/* Gambar banner parallax */}
            {banner.imageUrl && (
              <div
                style={{
                  width: '100%',
                  height: '140px',
                  backgroundImage: `url(${banner.imageUrl})`,
                  backgroundAttachment: 'fixed',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'block'
                }}
              />
            )}
            {/* Overlay kiri: nama sponsor */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)',
              padding: '8px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <div className="sponsor-banner-text-title" style={{ color: '#fff', fontWeight: 800, fontSize: '13px', lineHeight: 1.2 }}>{banner.title}</div>
                {banner.subtitle && <div className="sponsor-banner-text-subtitle" style={{ color: 'rgba(255,255,255,0.75)', fontSize: '11px', marginTop: '2px' }}>{banner.subtitle}</div>}
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', fontSize: '10px', fontWeight: 700,
                padding: '3px 8px', borderRadius: '20px', letterSpacing: '0.5px',
                display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap'
              }}>
                IKLAN <ExternalLink size={9} />
              </div>
            </div>
          </a>
        </div>
      );
    }

    // === SLOT ARTICLE & SIDEBAR: tampilan kartu seperti semula ===
    return (
      <div
        className={`sponsor-banner sponsor-slot-${slot}`}
        style={{
          margin: slot === 'article' ? '28px 0' : '16px 0',
          borderRadius: '14px',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.08)',
          background: '#15151f'
        }}
      >
        <a
          href={banner.targetUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="sponsor-banner-link"
          style={{ display: 'block', textDecoration: 'none', position: 'relative', color: '#ffffff' }}
        >
          {banner.imageUrl ? (
            <>
              <img
                src={banner.imageUrl}
                alt={banner.title || 'Sponsor Bedain News'}
                style={{ width: '100%', maxHeight: slot === 'sidebar' ? '200px' : '180px', objectFit: 'cover', display: 'block' }}
              />
              {/* Nama & keterangan di bawah gambar */}
              <div style={{ padding: slot === 'sidebar' ? '10px 14px' : '10px 16px', background: '#15151f' }}>
                <div className="sponsor-banner-text-title" style={{ fontWeight: 700, fontSize: slot === 'sidebar' ? '13px' : '14px', color: '#ffffff', lineHeight: 1.3 }}>
                  {banner.title}
                </div>
                {banner.subtitle && (
                  <div className="sponsor-banner-text-subtitle" style={{ fontSize: '11px', color: '#aaaaaa', marginTop: '3px' }}>
                    {banner.subtitle}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ padding: '28px 20px', background: 'linear-gradient(135deg, #1f1f2e 0%, #15151f 100%)', color: '#fff', textAlign: 'center' }}>
              <h4 className="sponsor-banner-text-title" style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 800 }}>{banner.title || 'Sponsor Bedain News'}</h4>
              {banner.subtitle && <p className="sponsor-banner-text-subtitle" style={{ margin: 0, fontSize: '0.85rem', color: '#aaa' }}>{banner.subtitle}</p>}
            </div>
          )}
          <div style={{
            position: 'absolute', top: '8px', right: '8px',
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
            color: '#fff', fontSize: '10px', fontWeight: 700,
            padding: '3px 8px', borderRadius: '6px', letterSpacing: '0.5px',
            display: 'flex', alignItems: 'center', gap: '4px'
          }}>
            SPONSOR <ExternalLink size={10} />
          </div>
        </a>
      </div>
    );
  }


  // Slot header kosong → sembunyikan (jangan tampilkan placeholder besar)
  if (slot === 'header') return null;

  // Elegant default invitation banner for article & sidebar slots
  const rawWa = settings?.contactWhatsapp || '';
  let cleanWa = rawWa.replace(/\D/g, '');
  if (cleanWa.startsWith('0')) {
    cleanWa = '62' + cleanWa.slice(1);
  }
  const waNumber = cleanWa || '6281234567890';

  return (
    <div
      className={`sponsor-banner-placeholder sponsor-slot-${slot}`}
      style={{
        margin: slot === 'article' ? '28px 0' : '16px 0',
        padding: slot === 'sidebar' ? '22px 16px' : '20px 24px',
        borderRadius: '14px',
        background: 'linear-gradient(135deg, rgba(230,57,70,0.08) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px dashed rgba(230,57,70,0.3)',
        display: 'flex',
        flexDirection: slot === 'sidebar' ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
        textAlign: slot === 'sidebar' ? 'center' : 'left'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '42px', height: '42px', borderRadius: '10px',
          background: 'rgba(230,57,70,0.15)', color: 'var(--color-accent, #e63946)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Sparkles size={20} />
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-accent, #e63946)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Slot Sponsor Terbuka ({slot.toUpperCase()})
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary, #fff)', marginTop: '2px' }}>
            Pasang Iklan Sponsor Usaha Anda Di Sini
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary, #aaa)', marginTop: '2px' }}>
            Jangkau ribuan pembaca setia Bedain News setiap hari.
          </div>
        </div>
      </div>

      <a
        href={`https://wa.me/${waNumber}?text=Halo%20Redaksi%20Bedain%20News,%20saya%20tertarik%20memasang%20iklan%20sponsor`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          background: 'var(--color-accent, #e63946)', color: '#fff',
          padding: '9px 16px', borderRadius: '8px', textDecoration: 'none',
          fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap',
          boxShadow: '0 4px 14px rgba(230,57,70,0.3)', transition: 'transform 0.2s'
        }}
      >
        Hubungi Redaksi
      </a>
    </div>
  );
};

export default AdBanner;
