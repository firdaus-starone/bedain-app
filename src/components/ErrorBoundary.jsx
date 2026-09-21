"use client";
import React from 'react';
import Link from 'next/link';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          textAlign: 'center',
          backgroundColor: 'var(--color-bg-primary, #121214)',
          color: 'var(--color-text-primary, #fff)',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <div style={{
            maxWidth: '520px',
            backgroundColor: 'var(--color-bg-secondary, #1a1a24)',
            padding: '36px 32px',
            borderRadius: '24px',
            border: '1px solid var(--color-border, rgba(255,255,255,0.1))',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              margin: '0 auto 20px',
              fontWeight: 'bold'
            }}>
              !
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '12px', color: '#fff' }}>
              Terjadi Kendala Memuat Halaman
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary, #9ca3af)', lineHeight: 1.6, marginBottom: '28px' }}>
              Maaf, terjadi sedikit kendala teknis saat memuat tampilan ini atau koneksi terputus sesaat.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                style={{
                  background: 'linear-gradient(135deg, var(--color-accent, #e63946), #ff5252)',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '30px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(230,57,70,0.3)'
                }}
              >
                Muat Ulang (Refresh)
              </button>
              <a
                href="/"
                style={{
                  background: 'var(--color-bg-tertiary, #272733)',
                  color: '#fff',
                  textDecoration: 'none',
                  padding: '12px 24px',
                  borderRadius: '30px',
                  fontWeight: 700,
                  fontSize: '14px',
                  border: '1px solid var(--color-border, rgba(255,255,255,0.15))',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
              >
                Kembali ke Beranda
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
