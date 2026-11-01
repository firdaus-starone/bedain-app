"use client";
import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MessageSquare, Send, User, Clock, X, Reply } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../hooks/useI18n';

const CommentSection = ({ articleSlug, articleTitle }) => {
  const { currentUser, userRole } = useAuth();
  const { lang } = useI18n();
  const isStaff = currentUser && ['superadmin', 'editor', 'reporter'].includes(userRole);

  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  
  const [form, setForm] = useState({ name: '', email: '', content: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyForm, setReplyForm] = useState({ name: '', email: '', content: '' });
  const [submittingReply, setSubmittingReply] = useState(false);
  
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
        const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort so that oldest is first or keep it desc. For replies, oldest first is usually better.
        // We'll sort them in render for parents (newest first) and children (oldest first).
        setComments(fetched);
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
    const locale = lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : 'id-ID';
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim() || !form.content.trim()) {
      setError(lang === 'zh' ? '称呼和评论内容为必填项。' : lang === 'en' ? 'Name and comment content are required.' : 'Nama dan isi komentar wajib diisi.');
      return;
    }
    if (form.content.trim().length < 5) {
      setError(lang === 'zh' ? '评论内容过短。' : lang === 'en' ? 'Comment is too short.' : 'Komentar terlalu pendek.');
      return;
    }

    if (lastSubmit && Date.now() - lastSubmit < 30000) {
      setError(lang === 'zh' ? '请等待30秒后再发送新评论。' : lang === 'en' ? 'Please wait 30 seconds before submitting another comment.' : 'Harap tunggu 30 detik sebelum mengirim komentar lagi.');
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
        status: isStaff ? 'approved' : 'pending',
        reported: false,
        createdAt: serverTimestamp(),
        parentId: null
      });
      setSubmitted(true);
      setLastSubmit(Date.now());
      setForm({ name: '', email: '', content: '' });
      if (isStaff) {
        // Refresh komentar agar yang baru masuk langsung muncul
        const q = query(collection(db, 'comments'), where('articleSlug', '==', articleSlug), where('status', '==', 'approved'), orderBy('createdAt', 'desc'));
        getDocs(q).then(snap => setComments(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
      }
    } catch (err) {
      console.error('Error submitting comment:', err);
      setError(lang === 'zh' ? '提交评论失败，请重试。' : lang === 'en' ? 'Failed to submit comment. Please try again.' : 'Gagal mengirim komentar. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplySubmit = async (e, parentId) => {
    e.preventDefault();
    if (!replyForm.name.trim() || !replyForm.content.trim()) {
      alert(lang === 'zh' ? '称呼和评论内容为必填项。' : lang === 'en' ? 'Name and comment content are required.' : 'Nama dan isi komentar wajib diisi.');
      return;
    }
    
    if (lastSubmit && Date.now() - lastSubmit < 30000) {
      alert(lang === 'zh' ? '请等待30秒后再发送回复。' : lang === 'en' ? 'Please wait 30 seconds before submitting another reply.' : 'Harap tunggu 30 detik sebelum mengirim balasan.');
      return;
    }

    setSubmittingReply(true);
    try {
      await addDoc(collection(db, 'comments'), {
        articleSlug,
        articleTitle: articleTitle || '',
        authorName: replyForm.name.trim(),
        authorEmail: replyForm.email.trim(),
        content: replyForm.content.trim(),
        status: isStaff ? 'approved' : 'pending',
        reported: false,
        createdAt: serverTimestamp(),
        parentId: parentId
      });
      alert(isStaff 
        ? (lang === 'zh' ? '回复已成功发布！' : lang === 'en' ? 'Reply published successfully!' : 'Balasan berhasil dipublikasikan!') 
        : (lang === 'zh' ? '您的回复正在等待审核。' : lang === 'en' ? 'Your reply is awaiting moderation.' : 'Balasan Anda sedang menunggu moderasi.'));
      setReplyingTo(null);
      setLastSubmit(Date.now());
      setReplyForm({ name: '', email: '', content: '' });
      if (isStaff) {
        const q = query(collection(db, 'comments'), where('articleSlug', '==', articleSlug), where('status', '==', 'approved'), orderBy('createdAt', 'desc'));
        getDocs(q).then(snap => setComments(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
      }
    } catch (err) {
      console.error('Error submitting reply:', err);
      alert(lang === 'zh' ? '发送回复失败，请重试。' : lang === 'en' ? 'Failed to submit reply. Please try again.' : 'Gagal mengirim balasan. Coba lagi.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const parentComments = comments.filter(c => !c.parentId);

  return (
    <>
      <div className="comment-popup-trigger-card">
        <div className="trigger-left">
          <div className="trigger-icon">
            <MessageSquare size={24} />
            {comments.length > 0 && <span className="trigger-badge">{comments.length}</span>}
          </div>
          <div className="trigger-text">
            <h4>{lang === 'zh' ? '读者评论与探讨' : lang === 'en' ? 'Reader Comments & Discussions' : 'Komentar & Diskusi Pembaca'}</h4>
            <p>
              {comments.length > 0
                ? (lang === 'zh' ? `本篇文章共有 ${comments.length} 条讨论。欢迎发表您的观点！` : lang === 'en' ? `${comments.length} discussions on this article. Share your perspective!` : `${comments.length} diskusi pada artikel ini. Silakan berikan tanggapan atau opini Anda!`)
                : (lang === 'zh' ? '暂无评论。快来抢先留下第一条观点吧！' : lang === 'en' ? 'No comments yet. Be the first to share your thoughts!' : 'Belum ada komentar. Jadilah yang pertama memberikan tanggapan!')}
            </p>
          </div>
        </div>
        <button className="trigger-btn" onClick={() => setIsOpen(true)}>
          <Send size={16} />
          <span>{lang === 'zh' ? '撰写评论' : lang === 'en' ? 'Write a Comment' : 'Tulis Komentar'}</span>
        </button>
      </div>

      <div className="comment-list" style={{ marginTop: '20px' }}>
        {loadingComments ? (
          <div className="comment-loading" style={{ padding: '24px 0' }}>
            <div className="spinner" style={{ width: 24, height: 24 }} />
            <span>{lang === 'zh' ? '正在加载评论...' : lang === 'en' ? 'Loading comments...' : 'Memuat komentar...'}</span>
          </div>
        ) : parentComments.length === 0 ? (
          <div className="comment-empty" style={{ padding: '32px 0', background: 'var(--color-bg-primary)', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <MessageSquare size={40} strokeWidth={1} />
            <p>
              {lang === 'zh' ? '暂无评论。点击上方“撰写评论”参与讨论！' : lang === 'en' ? 'No comments yet. Click "Write a Comment" above to start discussion!' : 'Belum ada komentar. Klik tombol "Tulis Komentar" di atas untuk berdiskusi!'}
            </p>
          </div>
        ) : (
          parentComments.map(c => {
            // Get replies and sort them oldest to newest
            const replies = comments
              .filter(reply => reply.parentId === c.id)
              .sort((a, b) => {
                const ta = a.createdAt?.seconds || 0;
                const tb = b.createdAt?.seconds || 0;
                return ta - tb;
              });

            return (
              <div key={c.id} className="comment-thread" style={{ marginBottom: '24px' }}>
                <div className="comment-item" style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '18px 22px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="comment-avatar">
                      <User size={18} />
                    </div>
                    <div className="comment-body" style={{ flex: 1 }}>
                      <div className="comment-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong className="comment-author">{c.authorName}</strong>
                          <span className="comment-date" style={{ marginLeft: '10px', fontSize: '12px', color: '#888' }}>
                            <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }} />
                            {formatDate(c.createdAt)}
                          </span>
                        </div>
                      </div>
                      <p className="comment-content" style={{ marginTop: '6px', lineHeight: '1.5' }}>{c.content}</p>
                      
                      <div style={{ marginTop: '12px' }}>
                        <button 
                          onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                          style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', padding: 0, fontWeight: '600' }}>
                          <Reply size={14} /> {replyingTo === c.id ? (lang === 'zh' ? '取消回复' : lang === 'en' ? 'Cancel' : 'Batal Balas') : (lang === 'zh' ? '回复' : lang === 'en' ? 'Reply' : 'Balas')}
                        </button>
                      </div>

                      {replyingTo === c.id && (
                        <form onSubmit={(e) => handleReplySubmit(e, c.id)} style={{ marginTop: '15px', background: 'var(--color-bg-secondary, rgba(0,0,0,0.02))', padding: '15px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                          <h5 style={{ marginTop: 0, marginBottom: '10px', fontSize: '13px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                            {lang === 'zh' ? `回复 ${c.authorName} 的评论` : lang === 'en' ? `Reply to ${c.authorName}` : `Balas komentar ${c.authorName}`}
                          </h5>
                          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                            <input required type="text" placeholder={lang === 'zh' ? '您的称呼' : lang === 'en' ? 'Your Name' : 'Nama Anda'} value={replyForm.name} onChange={e => setReplyForm({...replyForm, name: e.target.value})} style={{ flex: '1 1 150px', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '14px', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }} />
                            <input type="email" placeholder={lang === 'zh' ? '电子邮箱 (选填)' : lang === 'en' ? 'Email (optional)' : 'Email (opsional)'} value={replyForm.email} onChange={e => setReplyForm({...replyForm, email: e.target.value})} style={{ flex: '1 1 150px', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '14px', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }} />
                          </div>
                          <textarea required placeholder={lang === 'zh' ? '输入您的回复内容...' : lang === 'en' ? 'Write a reply...' : 'Tulis balasan...'} rows={2} value={replyForm.content} onChange={e => setReplyForm({...replyForm, content: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '14px', marginBottom: '10px', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}></textarea>
                          <button type="submit" disabled={submittingReply} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                            <Send size={14} /> {submittingReply ? (lang === 'zh' ? '发送中...' : lang === 'en' ? 'Sending...' : 'Mengirim...') : (lang === 'zh' ? '发送回复' : lang === 'en' ? 'Send Reply' : 'Kirim Balasan')}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>

                {replies.length > 0 && (
                  <div className="comment-replies" style={{ marginLeft: '40px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '2px solid var(--color-border)', paddingLeft: '16px' }}>
                    {replies.map(reply => (
                      <div key={reply.id} className="comment-reply-item" style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '14px 18px', display: 'flex', gap: '12px' }}>
                        <div className="comment-avatar" style={{ transform: 'scale(0.85)', transformOrigin: 'top center' }}>
                          <User size={18} />
                        </div>
                        <div className="comment-body" style={{ flex: 1 }}>
                          <div className="comment-meta" style={{ display: 'flex', alignItems: 'center' }}>
                            <strong className="comment-author" style={{ fontSize: '14px' }}>{reply.authorName}</strong>
                            <span className="comment-date" style={{ marginLeft: '10px', fontSize: '12px', color: '#888' }}>
                              <Clock size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                              {formatDate(reply.createdAt)}
                            </span>
                          </div>
                          <p className="comment-content" style={{ marginTop: '6px', lineHeight: '1.4', fontSize: '14.5px' }}>{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {isOpen && (
        <div className="comment-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="comment-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="comment-modal-header">
              <div className="modal-header-title">
                <MessageSquare size={20} />
                <h3>{lang === 'zh' ? '撰写新评论' : lang === 'en' ? 'Write a New Comment' : 'Tulis Komentar Baru'}</h3>
              </div>
              <button className="comment-modal-close" onClick={() => setIsOpen(false)} title={lang === 'zh' ? '关闭' : lang === 'en' ? 'Close' : 'Tutup'}>
                <X size={20} />
              </button>
            </div>

            <div className="comment-modal-body">
              <div className="comment-section" style={{ width: '100%' }}>
                <div className="comment-form-wrapper">
                  {submitted ? (
                    <div className="comment-success">
                      <div className="comment-success-icon">✅</div>
                      <h4>{lang === 'zh' ? '评论已提交！' : lang === 'en' ? 'Comment Submitted!' : 'Komentar Diterima!'}</h4>
                      <p>
                        {isStaff
                          ? (lang === 'zh' ? '您的评论已成功发布。' : lang === 'en' ? 'Your comment has been published.' : 'Komentar Anda telah berhasil dipublikasikan.')
                          : (lang === 'zh' ? '您的评论正在等待审核，感谢您的参与！' : lang === 'en' ? 'Your comment is awaiting moderation. Thank you for participating!' : 'Komentar Anda sedang menunggu moderasi. Terima kasih telah berpartisipasi.')
                        }
                      </p>
                      <button onClick={() => { setSubmitted(false); if (isStaff) setIsOpen(false); }} className="comment-send-again-btn">
                        {isStaff ? (lang === 'zh' ? '关闭' : lang === 'en' ? 'Close' : 'Tutup') : (lang === 'zh' ? '再写一条' : lang === 'en' ? 'Write Another' : 'Tulis Komentar Lagi')}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="comment-form">
                      <div className="comment-form-row">
                        <div className="comment-input-group">
                          <label>{lang === 'zh' ? '称呼' : lang === 'en' ? 'Name' : 'Nama'} <span style={{ color: '#e63946' }}>*</span></label>
                          <input
                            type="text"
                            placeholder={lang === 'zh' ? '您的称呼' : lang === 'en' ? 'Your Name' : 'Nama Anda'}
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            maxLength={60}
                            className="comment-input"
                          />
                        </div>
                        <div className="comment-input-group">
                          <label>{lang === 'zh' ? '电子邮箱' : lang === 'en' ? 'Email' : 'Email'} <span style={{ color: '#888', fontSize: '12px' }}>({lang === 'zh' ? '选填' : lang === 'en' ? 'optional' : 'opsional'})</span></label>
                          <input
                            type="email"
                            placeholder="email@anda.com"
                            value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                            className="comment-input"
                          />
                        </div>
                      </div>
                      <div className="comment-input-group">
                        <label>{lang === 'zh' ? '评论内容' : lang === 'en' ? 'Comment' : 'Komentar'} <span style={{ color: '#e63946' }}>*</span></label>
                        <textarea
                          placeholder={lang === 'zh' ? '在此输入您的评论...' : lang === 'en' ? 'Write your comment here...' : 'Tulis komentar Anda di sini...'}
                          value={form.content}
                          onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                          rows={4}
                          maxLength={1000}
                          className="comment-textarea"
                        />
                        <div className="comment-char-count">{form.content.length}/1000</div>
                      </div>
                      {error && <div className="comment-error">{error}</div>}
                      <button type="submit" disabled={submitting} className="comment-submit-btn">
                        <Send size={16} />
                        {submitting ? (lang === 'zh' ? '提交中...' : lang === 'en' ? 'Submitting...' : 'Mengirim...') : (lang === 'zh' ? '提交评论' : lang === 'en' ? 'Post Comment' : 'Kirim Komentar')}
                      </button>
                      {!isStaff && (
                        <p className="comment-moderation-note">
                          {lang === 'zh' ? '💡 评论经编辑团队审核后将予以公开显示。' : lang === 'en' ? '💡 Comments will be displayed after approval by the editorial team.' : '💡 Komentar akan ditampilkan setelah disetujui oleh tim redaksi.'}
                        </p>
                      )}
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
