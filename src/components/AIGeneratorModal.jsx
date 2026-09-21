"use client";
import React, { useState } from 'react';
import { X, Sparkles, Image as ImageIcon, Download, CheckCircle2 } from 'lucide-react';
import { uploadAndCompressImage } from '../lib/uploadImage';

const AIGeneratorModal = ({ isOpen, onClose, onApplyImage }) => {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleGenerate = () => {
    if (!prompt.trim()) {
      setError('Masukkan deskripsi gambar terlebih dahulu.');
      return;
    }
    setError('');
    setLoading(true);
    setImageUrl('');

    // Pollinations AI uses a simple GET request for generation.
    // We add a random seed to avoid caching, and specify model=flux for native 16:9 without stretching.
    const seed = Math.floor(Math.random() * 1000000);
    const encodedPrompt = encodeURIComponent(prompt.trim() + " photorealistic, highly detailed, professional lighting, modern style, clean composition, high quality, 8k");
    const aiUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
    
    // We preload the image to know when it's done generating
    const img = new Image();
    img.onload = () => {
      setImageUrl(aiUrl);
      setLoading(false);
    };
    img.onerror = () => {
      setError('Gagal membuat gambar. Coba ganti deskripsinya atau coba lagi nanti.');
      setLoading(false);
    };
    img.src = aiUrl;
  };

  const handleApply = async () => {
    if (!imageUrl) return;
    setUploading(true);
    setError('');
    try {
      // 1. Fetch the image from the URL as a Blob
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Gagal mengambil gambar dari server AI');
      const blob = await response.blob();
      
      // 2. Create a File object from the Blob
      const file = new File([blob], `ai-generated-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
      
      // 3. Upload to Firebase Storage using our existing utility
      const downloadUrl = await uploadAndCompressImage(file);
      
      // 4. Pass back to parent
      if (onApplyImage) {
        onApplyImage(downloadUrl);
      }
      
      // 5. Reset and close
      setPrompt('');
      setImageUrl('');
      onClose();
    } catch (err) {
      console.error(err);
      setError('Gagal mengupload gambar ke server. Silakan coba lagi.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(4px)',
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--admin-bg)',
        width: '100%',
        maxWidth: '700px',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--admin-card-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--admin-card-bg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--color-accent), #ff8a65)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white'
            }}>
              <Sparkles size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--admin-text-primary)' }}>AI Image Generator</h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--admin-text-secondary)' }}>Buat ilustrasi eksklusif untuk berita Anda</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none',
            color: 'var(--admin-text-secondary)', cursor: 'pointer',
            padding: '8px', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s'
          }} onMouseOver={e => e.currentTarget.style.background = 'var(--admin-hover-bg)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto' }}>
          {error && (
            <div style={{ padding: '12px', background: 'rgba(230,57,70,0.1)', color: 'var(--color-accent)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: 500 }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--admin-text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
              Deskripsi Gambar (Prompt)
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="Misal: Ilustrasi 3D gedung DPR, gaya kartun karikatur, suasana menegangkan..."
                style={{
                  flex: 1, padding: '14px 16px', borderRadius: '10px',
                  background: 'var(--admin-card-bg)', border: '1px solid var(--admin-card-border)',
                  color: 'var(--admin-text-primary)', outline: 'none', fontSize: '14px',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                }}
              />
              <button
                onClick={handleGenerate}
                disabled={loading || uploading}
                style={{
                  padding: '0 24px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, var(--color-accent, #ef4444), #f97316)', color: 'white',
                  border: 'none', fontSize: '14px', fontWeight: 600,
                  cursor: (loading || uploading) ? 'not-allowed' : 'pointer',
                  opacity: (loading || uploading) ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', gap: '8px',
                  transition: 'background 0.2s',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                }}
              >
                {loading ? (
                  <>Membangkitkan...</>
                ) : (
                  <><Sparkles size={16} /> Generate</>
                )}
              </button>
            </div>
            <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: 'var(--admin-text-secondary)' }}>
              Tips: Gunakan bahasa Inggris untuk hasil yang lebih akurat dan detail, atau deskripsikan secara spesifik (warna, gaya, suasana).
            </p>
          </div>

          <div style={{
            width: '100%',
            aspectRatio: '16/9',
            background: 'var(--admin-card-bg)',
            borderRadius: '12px',
            border: '2px dashed var(--admin-card-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {loading ? (
              <div style={{ textAlign: 'center', color: 'var(--admin-text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(37,99,235,0.2))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#3b82f6',
                  animation: 'pulse 1.5s infinite'
                }}>
                  <Sparkles size={20} className="spin-animation" />
                </div>
                <span>AI sedang melukis bayangan Anda... Tunggu sebentar.</span>
              </div>
            ) : imageUrl ? (
              <img src={imageUrl} alt="AI Generated" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--admin-text-secondary)', opacity: 0.5 }}>
                <ImageIcon size={48} style={{ marginBottom: '12px' }} />
                <p style={{ margin: 0 }}>Belum ada gambar yang dibuat.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px 24px',
          borderTop: '1px solid var(--admin-card-border)',
          background: 'var(--admin-card-bg)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            disabled={uploading}
            style={{
              padding: '10px 20px', borderRadius: '8px',
              background: 'transparent', color: 'var(--admin-text-secondary)',
              border: '1px solid var(--admin-card-border)', fontSize: '14px',
              fontWeight: 600, cursor: 'pointer'
            }}
          >
            Batal
          </button>
          <button
            onClick={handleApply}
            disabled={!imageUrl || uploading || loading}
            style={{
              padding: '10px 24px', borderRadius: '8px',
              background: (!imageUrl || uploading || loading) ? 'var(--admin-card-border)' : 'linear-gradient(135deg, var(--color-accent), #ff8a65)',
              color: (!imageUrl || uploading || loading) ? 'var(--admin-text-secondary)' : 'white',
              border: 'none', fontSize: '14px', fontWeight: 600,
              cursor: (!imageUrl || uploading || loading) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              transition: 'all 0.2s',
              boxShadow: (!imageUrl || uploading || loading) ? 'none' : '0 4px 12px rgba(230,57,70,0.3)'
            }}
          >
            {uploading ? (
              <>Menyimpan ke Server...</>
            ) : (
              <><CheckCircle2 size={16} /> Gunakan Gambar Ini</>
            )}
          </button>
        </div>
      </div>
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(0.95); opacity: 0.5; }
            50% { transform: scale(1.05); opacity: 1; }
            100% { transform: scale(0.95); opacity: 0.5; }
          }
          .spin-animation {
            animation: spin 3s linear infinite;
          }
          @keyframes spin {
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default AIGeneratorModal;
