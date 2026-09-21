"use client";
import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MessageSquare, Send, User, Clock, X } from 'lucide-react';

const CommentSection = ({ articleSlug, articleTitle }) => {
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', content: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [lastSubmit, setLastSubmit] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const fetchComments = async () => {
      setLoadingComments(true);
      try {
        const q = query(
          collection(db, 'comments'),
          where('articleSlug', '==', articleSlug),
          where('status', '==', 'approved'),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error fetching comments:', err);
      } finally {
        setLoadingComments(false);
      }
    };
    if (articleSlug) fetchComments();
  }, [articleSlug]);

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim() || !form.content.trim()) {
      setError('Nama dan isi komentar wajib diisi.');
      return;
    }
    if (form.content.trim().length < 5) {
      setError('Komentar terlalu pendek.');
      return;
    }

    // Anti-spam: 30 second cooldown
    if (lastSubmit && Date.now() - lastSubmit < 30000) {
      setError('Harap tunggu 30 detik sebelum mengirim komentar lagi.');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'comments'), {
        articleSlug,
        articleTitle: articleTitle || '',
        authorName: form.name.trim(),
        authorEmail: form.email.trim(),
        content: form.content.trim(),
        status: 'pending',
        reported: false,
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
      setLastSubmit(Date.now());
      setForm({ name: '', email: '', content: '' });
    } catch (err) {
      console.error('Error submitting comment:', err);
      setError('Gagal mengirim komentar. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Header Banner & Trigger Card */}
      <div className="comment-popup-trigger-card">
        <div className="trigger-left">
          <div className="trigger-icon">
            <MessageSquare size={24} />
            {comments.length > 0 && <span className="trigger-badge">{comments.length}</span>}
          </div>
          <div className="trigger-text">
            <h4>Komentar & Diskusi Pembaca</h4>
            <p>
              {comments.length > 0
                ? `${comments.length} komentar pada artikel ini. Silakan berikan tanggapan atau opini Anda!`
                : 'Belum ada komentar. Jadilah yang pertama memberikan tanggapan!'}
            </p>
          </div>
        </div>
        <button className="trigger-btn" onClick={() => setIsOpen(true)}>
          <Send size={16} />
          <span>Tulis Komentar</span>
        </button>
      </div>

      {/* Approved Comments List Directly Outside the Popup */}
      <div className="comment-list" style={{ marginTop: '20px' }}>
        {loadingComments ? (
          <div className="comment-loading" style={{ padding: '24px 0' }}>
            <div className="spinner" style={{ width: 24, height: 24 }} />
            <span>Memuat komentar...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="comment-empty" style={{ padding: '32px 0', background: 'var(--color-bg-primary)', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <MessageSquare size={40} strokeWidth={1} />
            <p>Belum ada komentar. Klik tombol "Tulis Komentar" di atas untuk berdiskusi!</p>
          </div>
        ) : (
          comments.map(c => (
            <div key={c.id} className="comment-item" style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '18px 22px', marginBottom: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <div className="comment-avatar">
                <User size={18} />
              </div>
              <div className="comment-body">
                <div className="comment-meta">
                  <strong className="comment-author">{c.authorName}</strong>
                  <span className="comment-date">
                    <Clock size={12} />
                    {formatDate(c.createdAt)}
                  </span>
                </div>
                <p className="comment-content" style={{ marginTop: '6px', lineHeight: '1.5' }}>{c.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Popup Drawer for Writing a Comment */}
      {isOpen && (
        <div className="comment-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="comment-modal-box" onClick={(e) => e.stopPropagation()}>
            {/* Modal Sticky Header */}
            <div className="comment-modal-header">
              <div className="modal-header-title">
                <MessageSquare size={20} />
                <h3>Tulis Komentar Pembaca</h3>
              </div>
              <button className="comment-modal-close" onClick={() => setIsOpen(false)} title="Tutup">
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="comment-modal-body">
              <div className="comment-section" style={{ width: '100%' }}>
                {/* Comment Form */}
                <div className="comment-form-wrapper">
                  {submitted ? (
                    <div className="comment-success">
                      <div className="comment-success-icon">✅</div>
                      <h4>Komentar Diterima!</h4>
                      <p>Komentar Anda sedang menunggu moderasi. Terima kasih telah berpartisipasi.</p>
                      <button onClick={() => setSubmitted(false)} className="comment-send-again-btn">
                        Tulis Komentar Lagi
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="comment-form">
                      <h4 className="comment-form-title">Tulis Komentar</h4>
                      <div className="comment-form-row">
                        <div className="comment-input-group">
                          <label>Nama <span style={{ color: '#e63946' }}>*</span></label>
                          <input
                            type="text"
                            placeholder="Nama Anda"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            maxLength={60}
                            className="comment-input"
                            id="comment-name"
                          />
                        </div>
                        <div className="comment-input-group">
                          <label>Email <span style={{ color: '#888', fontSize: '12px' }}>(opsional)</span></label>
                          <input
                            type="email"
                            placeholder="email@anda.com"
                            value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                            className="comment-input"
                            id="comment-email"
                          />
                        </div>
                      </div>
                      <div className="comment-input-group">
                        <label>Komentar <span style={{ color: '#e63946' }}>*</span></label>
                        <textarea
                          placeholder="Tulis komentar Anda di sini..."
                          value={form.content}
                          onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                          rows={4}
                          maxLength={1000}
                          className="comment-textarea"
                          id="comment-content"
                        />
                        <div className="comment-char-count">{form.content.length}/1000</div>
                      </div>
                      {error && <div className="comment-error">{error}</div>}
                      <button type="submit" disabled={submitting} className="comment-submit-btn" id="comment-submit-btn">
                        <Send size={16} />
                        {submitting ? 'Mengirim...' : 'Kirim Komentar'}
                      </button>
                      <p className="comment-moderation-note">
                        💡 Komentar akan ditampilkan setelah disetujui oleh tim redaksi.
                      </p>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CommentSection;
