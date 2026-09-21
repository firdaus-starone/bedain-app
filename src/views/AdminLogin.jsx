import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useSiteSettings } from '../hooks/useSiteSettings';
import SEO from '../components/SEO';
 // Reusing global styles, but we will add specific admin styles

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
      setError('Gagal login: Periksa kembali email dan password Anda.');
      console.error(err);
    } finally {
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
    <div className="admin-login-container">
      <SEO title="Login Admin" />
      <div className="admin-login-box">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '14px' }}>
          <img src="/logo.png" alt="Bedain Logo" style={{ height: '100px', objectFit: 'contain', marginBottom: '15px' }} />
          <h1 className="admin-login-title" style={{ textTransform: 'uppercase', whiteSpace: 'nowrap', fontWeight: 800 }}>
            BEDAIN<span style={{ color: 'var(--color-accent)' }}>NEWS</span>
          </h1>
        </div>
        <p className="admin-login-subtitle">Sistem Manajemen Redaksi</p>
        
        {error && <div className="admin-error-message">{error}</div>}
        
        <form onSubmit={handleLogin} className="admin-login-form">
          <div className="form-group">
            <label>Email Redaksi</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="redaksi@bedainnews.com"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="Masukkan password"
            />
          </div>
          <button type="submit" className="admin-btn-primary" disabled={loading}>
            {loading ? 'Memproses...' : 'Masuk ke Ruang Redaksi'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
