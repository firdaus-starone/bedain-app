import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useSiteSettings } from '../hooks/useSiteSettings';
import SEO from '../components/SEO';
import { ArrowLeft } from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { settings } = useSiteSettings();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/admin/dashboard');
    } catch (err) {
      // Jika akun belum ada, otomatis daftarkan!
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          router.push('/admin/dashboard');
          return;
        } catch (createErr) {
          setError('Gagal mendaftar: ' + createErr.message);
        }
      } else {
        setError('Gagal login: ' + err.message);
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push('/admin/dashboard');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // user object will be caught by onAuthStateChanged
    } catch (err) {
      setError('Gagal login dengan Google: ' + err.message);
      console.error(err);
      setLoading(false);
    }
  };

  const renderLogoText = () => {
    if (settings?.siteName) {
      const cleanName = settings.siteName.replace(/\s+/g, '');
      const match = cleanName.match(/^(.*?)(house)$/i);
      if (match) {
        return <>{match[1]}<span style={{ color: 'var(--color-accent)' }}>{match[2]}</span></>;
      }
      const parts = settings.siteName.trim().split(/\s+/);
      if (parts.length > 1) {
        return <>{parts[0]}<span style={{ color: 'var(--color-accent)' }}>{parts.slice(1).join('')}</span></>;
      }
      return cleanName;
    }
    return <>BEDAIN<span>NEWS</span></>;
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--color-bg-primary)' }}>
      <SEO title="Login Admin" />
      <style>{`
        .admin-split-left {
          flex: 1.2;
          position: relative;
          display: none;
        }
        @media (min-width: 768px) {
          .admin-split-left {
            display: block;
          }
        }
        .admin-split-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 40px;
          position: relative;
        }
        .admin-login-card {
          width: 100%;
          max-width: 420px;
          animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .admin-input-modern {
          width: 100%;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid var(--color-border);
          background: var(--color-bg-secondary);
          color: var(--color-text-primary);
          font-size: 15px;
          transition: all 0.2s ease;
          outline: none;
          margin-top: 8px;
        }
        .admin-input-modern:focus {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
          background: var(--color-bg-primary);
        }
        .admin-btn-modern {
          width: 100%;
          padding: 14px 24px;
          border-radius: 12px;
          background: var(--color-accent);
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 24px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
        }
        .admin-btn-modern:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
        }
        .admin-btn-modern:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .admin-btn-google {
          width: 100%;
          padding: 14px 24px;
          border-radius: 12px;
          background: var(--color-bg-primary);
          color: var(--color-text-primary);
          font-size: 15px;
          font-weight: 600;
          border: 1px solid var(--color-border);
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
        }
        .admin-btn-google:hover:not(:disabled) {
          background: var(--color-bg-secondary);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .back-btn-container {
          position: absolute;
          top: 30px;
          left: 30px;
          z-index: 10;
        }
        @media (max-width: 768px) {
          .admin-split-right {
            padding: 20px !important;
            justify-content: flex-start;
            padding-top: 40px !important;
          }
          .back-btn-container {
            position: relative;
            top: auto;
            left: auto;
            margin-bottom: 40px;
            align-self: flex-start;
          }
          .admin-login-card {
            margin-top: 0;
          }
        }
      `}</style>
      
      {/* Left Side: Hero Image */}
      <div className="admin-split-left">
        <img 
          src="https://images.unsplash.com/photo-1495020689067-958852a7765e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" 
          alt="News Room" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.4) 100%)' }}></div>
        
        <div style={{ position: 'absolute', bottom: '60px', left: '60px', color: '#fff', maxWidth: '500px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '100px', marginBottom: '24px', fontSize: '13px', fontWeight: 600, letterSpacing: '1px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></div>
            SISTEM REDAKSI AKTIF
          </div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '16px', lineHeight: 1.2, fontFamily: 'var(--font-heading)' }}>
            Menginspirasi Indonesia Lewat Kata
          </h2>
          <p style={{ fontSize: '1.1rem', opacity: 0.85, lineHeight: 1.6 }}>
            Ruang redaksi eksklusif Bedain News. Tempat di mana akurasi, kecepatan, dan ketajaman jurnalistik berpadu untuk menyajikan berita terbaik ke seluruh pelosok Nusantara.
          </p>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="admin-split-right">
        {/* Back to Home Button */}
        <div className="back-btn-container">
          <Link href="/" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 600,
            padding: '8px 16px',
            borderRadius: '100px',
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; e.currentTarget.style.borderColor = 'var(--color-text-secondary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}>
            <ArrowLeft size={16} /> Kembali ke Beranda
          </Link>
        </div>

        <div className="admin-login-card">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ background: '#ffffff', padding: '12px 20px', borderRadius: '16px', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
              <img src="/logo.png" alt="Bedain Logo" style={{ height: '50px', objectFit: 'contain', display: 'block' }} />
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
              Selamat Datang Kembali
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>Silakan masuk ke ruang manajemen redaksi.</p>
          </div>
          
          {error && (
            <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444', color: '#ef4444', borderRadius: '0 8px 8px 0', marginBottom: '24px', fontSize: '14px', fontWeight: 500 }}>
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Email Redaksi</label>
              <input 
                type="email" 
                className="admin-input-modern"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                placeholder="redaksi@bedainnews.com"
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Kata Sandi</label>
              <input 
                type="password" 
                className="admin-input-modern"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                placeholder="••••••••"
              />
            </div>
            
            <button type="submit" className="admin-btn-modern" disabled={loading}>
              {loading ? (
                <>
                  <svg className="animate-spin" style={{ width: '20px', height: '20px', color: 'white' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Otentikasi...
                </>
              ) : 'Masuk ke Dasbor'}
            </button>
          </form>
          
          <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }}></div>
            <span style={{ padding: '0 16px', fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>ATAU</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }}></div>
          </div>

          <button onClick={handleGoogleLogin} className="admin-btn-google" disabled={loading}>
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              <path d="M1 1h22v22H1z" fill="none"/>
            </svg>
            Masuk dengan Google
          </button>
          
          <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
            &copy; {new Date().getFullYear()} Bedain News. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
