'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { ShieldCheck, XCircle } from 'lucide-react';

import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

function VerifyContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    async function verifyId() {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const q = query(collection(db, 'users'), where('regNumber', '==', id));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          // Assuming one unique regNumber per user
          setUserData(querySnapshot.docs[0].data());
        }
      } catch (error) {
        console.error("Error verifying ID:", error);
      } finally {
        setLoading(false);
      }
    }
    
    verifyId();
  }, [id]);

  if (loading) {
    return <div style={{ padding: '50px', textAlign: 'center', color: '#fff' }}>Memeriksa Keaslian ID...</div>;
  }

  if (!id || !userData) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 20px', color: '#fff' }}>
        <XCircle size={64} color="#ff4444" style={{ margin: '0 auto 20px auto' }} />
        <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>Verifikasi Gagal</h1>
        <p style={{ color: '#aaa' }}>ID Registrasi tidak valid atau tidak terdaftar dalam sistem kami.</p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#fff' }}>
      <ShieldCheck size={64} color="#00C851" style={{ margin: '0 auto 15px auto' }} />
      <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>Verifikasi Berhasil</h1>
      <p style={{ color: '#ccc', marginBottom: '25px', lineHeight: '1.5', fontSize: '14px' }}>
        Identitas jurnalis di bawah ini adalah <strong>SAH</strong> dan terdaftar resmi di Bedain News.
      </p>
      
      {/* Profile Info */}
      <div style={{ 
        backgroundColor: 'rgba(212, 175, 55, 0.05)', 
        border: '1px solid rgba(212, 175, 55, 0.3)', 
        padding: '25px 20px', 
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '15px'
      }}>
        {/* Profile Photo */}
        <div style={{ 
          width: '100px', 
          height: '100px', 
          borderRadius: '50%', 
          overflow: 'hidden', 
          border: '3px solid #d4af37',
          backgroundColor: '#333'
        }}>
          <img 
            src={userData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'User')}&background=random`} 
            alt="Profile" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        
        {/* Details */}
        <div style={{ width: '100%', textAlign: 'left', marginTop: '10px' }}>
          <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '11px', color: '#d4af37', marginBottom: '4px', letterSpacing: '1px' }}>NAMA LENGKAP</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{userData.name || '-'}</div>
          </div>
          <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '11px', color: '#d4af37', marginBottom: '4px', letterSpacing: '1px' }}>NOMOR REGISTRASI</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'monospace' }}>{userData.regNumber || id}</div>
          </div>
          <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '11px', color: '#d4af37', marginBottom: '4px', letterSpacing: '1px' }}>JABATAN REDAKSI</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{userData.roleTitle || 'JURNALIS'}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#d4af37', marginBottom: '4px', letterSpacing: '1px' }}>WILAYAH TUGAS</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{userData.region || 'NASIONAL'}</div>
          </div>
        </div>
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
