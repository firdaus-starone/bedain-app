'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { ShieldCheck, XCircle } from 'lucide-react';

function VerifyContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  if (!id) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 20px', color: '#fff' }}>
        <XCircle size={64} color="#ff4444" style={{ margin: '0 auto 20px auto' }} />
        <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>Verifikasi Gagal</h1>
        <p style={{ color: '#aaa' }}>ID Registrasi tidak valid atau tidak ditemukan.</p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '50px 20px', color: '#fff' }}>
      <ShieldCheck size={64} color="#00C851" style={{ margin: '0 auto 20px auto' }} />
      <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>Verifikasi Berhasil</h1>
      <p style={{ color: '#ccc', marginBottom: '30px', lineHeight: '1.5' }}>
        ID Card dengan Nomor Registrasi berikut adalah <strong>SAH</strong> dan jurnalis tersebut terdaftar resmi di Bedain News.
      </p>
      
      <div style={{ 
        backgroundColor: 'rgba(212, 175, 55, 0.1)', 
        border: '1px solid #d4af37', 
        padding: '20px', 
        borderRadius: '12px',
        display: 'inline-block',
        minWidth: '250px'
      }}>
        <div style={{ fontSize: '12px', color: '#d4af37', marginBottom: '8px', letterSpacing: '1px' }}>NOMOR REGISTRASI</div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', letterSpacing: '1px' }}>{id}</div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <h2 style={{ color: '#d4af37', margin: '0', fontSize: '28px', fontWeight: '900', letterSpacing: '-1px' }}>bedain<span style={{ color: '#fff' }}>news</span></h2>
        <div style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>PORTAL BERITA TERPERCAYA</div>
      </div>
      <div style={{ backgroundColor: '#111', border: '1px solid #222', borderRadius: '20px', maxWidth: '400px', width: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
        <Suspense fallback={<div style={{ padding: '50px', textAlign: 'center', color: '#fff' }}>Memeriksa Keaslian ID...</div>}>
          <VerifyContent />
        </Suspense>
      </div>
      <div style={{ marginTop: '40px' }}>
        <Link href="/" style={{ color: '#666', textDecoration: 'none', fontSize: '14px', transition: 'color 0.2s' }}>
          &larr; Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
