import React, { useState, useEffect } from 'react';

import { signOut } from 'firebase/auth';
import {
  collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, setDoc
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import {
  Tag, Trash2, Edit2, Plus, Check, X, ChevronUp, ChevronDown, Hash, Globe, ToggleLeft, ToggleRight, Layers, LayoutTemplate
} from 'lucide-react';


const CATEGORY_COLORS = [
  '#e63946', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

const Navigate = ({to}) => { React.useEffect(() => { if (typeof window !== 'undefined') window.location.href = to; }, [to]); return null; };

const AdminCategories = () => {
  const { currentUser, userRole, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '', color: CATEGORY_COLORS[0], homeLayout: 'none' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchCategories(); }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const toSlug = (str) =>
    str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
      const snap = await getDocs(q);
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {
      try {
        const snap = await getDocs(collection(db, 'categories'));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCategories(data.sort((a, b) => (a.order ?? 99) - (b.order ?? 99)));
      } catch (err) { console.error(err); }
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setForm({ name: '', slug: '', color: CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length], homeLayout: 'none' });
    setEditingCat(null);
    setShowAddModal(true);
  };

  const openEdit = (cat) => {
    setForm({ name: cat.name, slug: cat.slug, color: cat.color || CATEGORY_COLORS[0], homeLayout: cat.homeLayout || 'none' });
    setEditingCat(cat);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const slug = form.slug.trim() || toSlug(form.name);
    try {
      if (editingCat) {
        await updateDoc(doc(db, 'categories', editingCat.id), {
          name: form.name.trim(), slug, color: form.color, homeLayout: form.homeLayout || 'none'
        });
        showToast('Kategori berhasil diperbarui!');
      } else {
        await addDoc(collection(db, 'categories'), {
          name: form.name.trim(), slug, color: form.color, homeLayout: form.homeLayout || 'none',
          order: categories.length, active: true,
        });
        showToast('Kategori berhasil ditambahkan!');
      }
      setShowAddModal(false);
      await fetchCategories();
    } catch {
      showToast('Gagal menyimpan kategori', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (cat) => {
    try {
      await updateDoc(doc(db, 'categories', cat.id), { active: !cat.active });
      setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, active: !c.active } : c));
      showToast(cat.active ? 'Kategori dinonaktifkan' : 'Kategori diaktifkan');
    } catch { showToast('Gagal mengubah status', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus kategori ini? Aksi ini tidak bisa dibatalkan.')) return;
    try {
      await deleteDoc(doc(db, 'categories', id));
      setCategories(prev => prev.filter(c => c.id !== id));
      showToast('Kategori dihapus');
    } catch { showToast('Gagal menghapus kategori', 'error'); }
  };

  const handleMove = async (index, dir) => {
    const newIdx = index + dir;
    if (newIdx < 0 || newIdx >= categories.length) return;
    const updated = [...categories];
    [updated[index], updated[newIdx]] = [updated[newIdx], updated[index]];
    setCategories(updated);
    await Promise.all(updated.map((cat, i) => updateDoc(doc(db, 'categories', cat.id), { order: i })));
  };

  const handleImportPionir = async () => {
    if (!window.confirm("Import kategori dari Pionir House?")) return;
    setSaving(true);
    try {
      const res = await fetch("https://firestore.googleapis.com/v1/projects/pionerhouse-app/databases/(default)/documents/categories");
      const data = await res.json();
      if (data.documents) {
        let imported = 0;
        for (const d of data.documents) {
          const fields = d.fields;
          const slug = fields.slug?.stringValue;
          if (!slug) continue;
          
          const catData = {
            name: fields.name?.stringValue || slug,
            slug: slug,
            color: fields.color?.stringValue || '#3b82f6',
            order: fields.order?.integerValue ? parseInt(fields.order.integerValue) : 99,
            active: fields.active?.booleanValue !== false,
            homeLayout: fields.homeLayout?.stringValue || 'none'
          };
          
          const origId = d.name.split('/').pop();
          const docRef = doc(db, 'categories', origId);
          await setDoc(docRef, catData, { merge: true });
          imported++;
        }
        showToast(`Berhasil mengimpor ${imported} kategori dari Pionir!`);
        fetchCategories();
      }
    } catch(e) {
      console.error(e);
      showToast('Gagal import: ' + e.message, 'error');
    }
    setSaving(false);
  };

  if (authLoading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--admin-bg)', color:'var(--admin-text-primary)' }}><div className="spinner"/></div>;
  if (!['superadmin', 'admin'].includes(userRole)) return <Navigate to="/admin/dashboard" replace />;

  const filtered = categories.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.slug?.toLowerCase().includes(search.toLowerCase())
  );
  const activeCount = categories.filter(c => c.active !== false).length;

  return (
    <div className="admin-layout">

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', top:'20px', right:'20px', zIndex:9999,
          background: toast.type === 'error' ? '#e63946' : '#10b981',
          color:'#fff', padding:'12px 20px', borderRadius:'10px',
          fontWeight:700, boxShadow:'0 8px 24px rgba(0,0,0,0.4)',
          display:'flex', alignItems:'center', gap:'8px', fontSize:'14px'
        }}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
        </div>
      )}

      
      <main className="admin-main" style={{ padding: '32px 40px', background: 'var(--admin-bg)', minHeight: '100vh' }}>
        {/* Page Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'32px', flexWrap:'wrap', gap:'16px' }}>
          <div>
            <h1 style={{ color:'var(--admin-text-primary)', fontSize:'1.7rem', fontWeight:800, display:'flex', alignItems:'center', gap:'10px', margin:0 }}>
              <Layers size={24} color="#e63946" /> Kelola Kategori
            </h1>
            <p style={{ color:'var(--admin-text-secondary)', fontSize:'14px', margin:'6px 0 0' }}>
              Atur kategori berita yang tampil di menu utama website
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleImportPionir}
              style={{
                background:'var(--admin-surface-2)',
                color:'var(--admin-text-secondary)', border:'1px dashed var(--admin-border)', padding:'12px 22px',
                borderRadius:'12px', cursor:'pointer', fontWeight:600, fontSize:'14px',
                display:'flex', alignItems:'center', gap:'8px',
                transition:'background 0.2s, color 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background='var(--admin-hover-bg)'; e.currentTarget.style.color='var(--admin-text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background='var(--admin-surface-2)'; e.currentTarget.style.color='var(--admin-text-secondary)'; }}
              title="Salin kategori dari Pionir House"
            >
              📥 Import dari Pionir
            </button>
            <button
              onClick={openAdd}
              style={{
                background:'linear-gradient(135deg, #e63946, #c1121f)',
                color:'#fff', border:'none', padding:'12px 22px',
                borderRadius:'12px', cursor:'pointer', fontWeight:700, fontSize:'14px',
                display:'flex', alignItems:'center', gap:'8px',
                boxShadow:'0 4px 16px rgba(230,57,70,0.35)',
                transition:'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(230,57,70,0.45)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 16px rgba(230,57,70,0.35)'; }}
            >
              <Plus size={18} /> Tambah Kategori
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:'14px', marginBottom:'28px' }}>
          {[
            { label:'Total Kategori', value: categories.length, icon:'🗂️', color:'var(--admin-text-secondary)' },
            { label:'Aktif', value: activeCount, icon:'✅', color:'#10b981' },
            { label:'Nonaktif', value: categories.length - activeCount, icon:'⏸️', color:'#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{ background:'var(--admin-card-bg)', border:'1px solid var(--admin-card-border)', borderRadius:'14px', padding:'18px 20px' }}>
              <div style={{ fontSize:'1.6rem', marginBottom:'4px' }}>{s.icon}</div>
              <div style={{ color: s.color, fontSize:'1.8rem', fontWeight:800, lineHeight:1 }}>{s.value}</div>
              <div style={{ color:'var(--admin-text-secondary)', fontSize:'12px', marginTop:'4px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search + Grid */}
        <div style={{ background:'var(--admin-card-bg)', border:'1px solid var(--admin-card-border)', borderRadius:'18px', overflow:'hidden' }}>
          {/* Toolbar */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px', borderBottom:'1px solid var(--admin-card-border)', flexWrap:'wrap', gap:'12px' }}>
            <span style={{ color:'var(--admin-text-primary)', fontWeight:700, fontSize:'15px' }}>
              Daftar Kategori <span style={{ color:'var(--admin-text-secondary)', fontWeight:400, fontSize:'13px' }}>({filtered.length} kategori)</span>
            </span>
            <input
              type="text"
              placeholder="🔍  Cari kategori..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                background:'var(--admin-bg)', border:'1px solid var(--admin-border)',
                borderRadius:'10px', padding:'8px 16px', color:'var(--admin-text-primary)', fontSize:'13px',
                outline:'none', width:'220px'
              }}
            />
          </div>

          {/* Category Cards Grid */}
          {loading ? (
            <div style={{ textAlign:'center', padding:'60px', color:'var(--admin-text-secondary)' }}>
              <div className="spinner" style={{ margin:'0 auto 16px' }} />
              Memuat kategori...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px', color:'var(--admin-text-secondary)' }}>
              <Tag size={48} strokeWidth={1} style={{ marginBottom:'12px', color:'var(--admin-text-secondary)', opacity: 0.5 }} />
              <p>Tidak ada kategori ditemukan.</p>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'16px', padding:'24px' }}>
              {filtered.map((cat, index) => {
                const color = cat.color || CATEGORY_COLORS[index % CATEGORY_COLORS.length];
                const isActive = cat.active !== false;
                return (
                  <div
                    key={cat.id}
                    style={{
                      background:'var(--admin-bg)',
                      border:`1px solid ${isActive ? color + '40' : 'var(--admin-card-border)'}`,
                      borderRadius:'16px', overflow:'hidden',
                      transition:'transform 0.2s, box-shadow 0.2s',
                      opacity: isActive ? 1 : 0.6,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow=`0 8px 24px ${color}22`; }}
                    onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; }}
                  >
                    {/* Card Top Bar */}
                    <div style={{ height:'6px', background: isActive ? `linear-gradient(90deg, ${color}, ${color}88)` : '#333' }} />

                    <div style={{ padding:'18px' }}>
                      {/* Category Icon + Name */}
                      <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'14px' }}>
                        <div style={{
                          width:'44px', height:'44px', borderRadius:'12px',
                          background:`${color}20`, border:`1px solid ${color}40`,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          flexShrink:0
                        }}>
                          <Tag size={20} color={color} />
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <h3 style={{ color:'var(--admin-text-primary)', fontWeight:700, fontSize:'15px', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                            {cat.name}
                          </h3>
                          <div style={{ display:'flex', alignItems:'center', gap:'5px', marginTop:'4px' }}>
                            <Hash size={11} color="var(--admin-text-secondary)" />
                            <code style={{ color:'var(--admin-text-secondary)', fontSize:'11px', fontFamily:'monospace' }}>{cat.slug}</code>
                          </div>
                          {cat.homeLayout && cat.homeLayout !== 'none' && (
                            <div style={{ display:'flex', alignItems:'center', gap:'5px', marginTop:'6px', background:'rgba(59,130,246,0.1)', color:'#3b82f6', padding:'2px 6px', borderRadius:'4px', fontSize:'10px', fontWeight:'700', width:'fit-content' }}>
                              <LayoutTemplate size={10} /> Beranda: {cat.homeLayout === 'zigzag' ? 'Zigzag (1+4)' : 'Grid (5)'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status + Order Row */}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
                        <button
                          onClick={() => handleToggleActive(cat)}
                          style={{
                            display:'flex', alignItems:'center', gap:'6px',
                            background: isActive ? 'rgba(16,185,129,0.12)' : 'var(--admin-hover-bg)',
                            border: isActive ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--admin-border)',
                            color: isActive ? '#10b981' : 'var(--admin-text-secondary)',
                            padding:'5px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:700, cursor:'pointer',
                            transition:'all 0.2s'
                          }}
                        >
                          {isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                          {isActive ? 'Aktif' : 'Nonaktif'}
                        </button>

                        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                          <span style={{ color:'var(--admin-text-secondary)', fontSize:'12px' }}>Urutan #{index + 1}</span>
                          <div style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
                            <button
                              onClick={() => handleMove(index, -1)}
                              disabled={index === 0}
                              style={{ background:'var(--admin-hover-bg)', border:'1px solid var(--admin-border)', borderRadius:'5px', color: index === 0 ? 'var(--admin-border)' : 'var(--admin-text-secondary)', cursor: index === 0 ? 'default' : 'pointer', padding:'2px 5px', lineHeight:1 }}
                            ><ChevronUp size={12} /></button>
                            <button
                              onClick={() => handleMove(index, 1)}
                              disabled={index === categories.length - 1}
                              style={{ background:'var(--admin-hover-bg)', border:'1px solid var(--admin-border)', borderRadius:'5px', color: index === categories.length - 1 ? 'var(--admin-border)' : 'var(--admin-text-secondary)', cursor: index === categories.length - 1 ? 'default' : 'pointer', padding:'2px 5px', lineHeight:1 }}
                            ><ChevronDown size={12} /></button>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display:'flex', gap:'8px' }}>
                        <button
                          onClick={() => openEdit(cat)}
                          style={{ flex:1, background:'var(--admin-hover-bg)', border:'1px solid var(--admin-border)', color:'var(--admin-text-secondary)', padding:'9px', borderRadius:'10px', cursor:'pointer', fontSize:'13px', fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', transition:'all 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.background='var(--admin-border)'; e.currentTarget.style.color='var(--admin-text-primary)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background='var(--admin-hover-bg)'; e.currentTarget.style.color='var(--admin-text-secondary)'; }}
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
                          style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', padding:'9px 14px', borderRadius:'10px', cursor:'pointer', transition:'all 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,0.2)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background='rgba(239,68,68,0.1)'; }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add New Card Button */}
              <button
                onClick={openAdd}
                style={{
                  background:'transparent', border:'2px dashed var(--admin-border)',
                  borderRadius:'16px', cursor:'pointer', padding:'32px',
                  display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                  gap:'10px', color:'var(--admin-text-secondary)', transition:'all 0.2s', minHeight:'180px'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(230,57,70,0.4)'; e.currentTarget.style.color='#e63946'; e.currentTarget.style.background='rgba(230,57,70,0.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--admin-border)'; e.currentTarget.style.color='var(--admin-text-secondary)'; e.currentTarget.style.background='transparent'; }}
              >
                <div style={{ width:'48px', height:'48px', borderRadius:'50%', background:'var(--admin-hover-bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Plus size={22} />
                </div>
                <span style={{ fontSize:'13px', fontWeight:600 }}>Tambah Kategori Baru</span>
              </button>
            </div>
          )}

          {/* Tips Footer */}
          <div style={{ padding:'16px 24px', borderTop:'1px solid var(--admin-card-border)', color:'var(--admin-text-secondary)', fontSize:'12px', lineHeight:1.8 }}>
            💡 <strong style={{ color:'var(--admin-text-primary)' }}>Tips:</strong> Klik toggle <strong>Aktif/Nonaktif</strong> untuk menyembunyikan kategori dari menu. Gunakan tombol <strong>▲ ▼</strong> untuk mengatur urutan.
          </div>
        </div>
      </main>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div
          style={{ position:'fixed', inset:0, background:'var(--admin-modal-overlay)', backdropFilter:'blur(6px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}
          onClick={e => e.target === e.currentTarget && setShowAddModal(false)}
        >
          <div style={{ background:'var(--admin-card-bg)', border:'1px solid var(--admin-card-border)', borderRadius:'20px', padding:'32px', width:'100%', maxWidth:'460px', boxShadow:'0 24px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px' }}>
              <h2 style={{ color:'var(--admin-text-primary)', fontSize:'1.2rem', fontWeight:800, margin:0 }}>
                {editingCat ? '✏️ Edit Kategori' : '➕ Tambah Kategori'}
              </h2>
              <button onClick={() => setShowAddModal(false)} style={{ background:'var(--admin-hover-bg)', border:'none', color:'var(--admin-text-secondary)', width:'32px', height:'32px', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <X size={16} />
              </button>
            </div>

            {/* Preview */}
            <div style={{ background:'var(--admin-bg)', border:`1px solid ${form.color}40`, borderRadius:'14px', padding:'16px', marginBottom:'24px', display:'flex', alignItems:'center', gap:'12px' }}>
              <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:`${form.color}20`, border:`1px solid ${form.color}40`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Tag size={20} color={form.color} />
              </div>
              <div>
                <div style={{ color:'var(--admin-text-primary)', fontWeight:700, fontSize:'15px' }}>{form.name || 'Nama Kategori'}</div>
                <div style={{ color:'var(--admin-text-secondary)', fontSize:'12px', fontFamily:'monospace' }}>/{form.slug || toSlug(form.name) || 'slug-kategori'}</div>
              </div>
              <div style={{ marginLeft:'auto', width:'12px', height:'12px', borderRadius:'50%', background: form.color }} />
            </div>

            {/* Form Fields */}
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              <div>
                <label style={{ color:'var(--admin-text-secondary)', fontSize:'12px', fontWeight:600, display:'block', marginBottom:'6px' }}>NAMA KATEGORI *</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="cth: Teknologi"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: toSlug(e.target.value) }))}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  style={{ width:'100%', background:'var(--admin-bg)', border:'1px solid var(--admin-border)', borderRadius:'10px', padding:'11px 14px', color:'var(--admin-text-primary)', fontSize:'14px', outline:'none', boxSizing:'border-box' }}
                />
              </div>
              <div>
                <label style={{ color:'var(--admin-text-secondary)', fontSize:'12px', fontWeight:600, display:'block', marginBottom:'6px' }}>SLUG URL</label>
                <div style={{ display:'flex', alignItems:'center', background:'var(--admin-bg)', border:'1px solid var(--admin-border)', borderRadius:'10px', overflow:'hidden' }}>
                  <span style={{ padding:'11px 12px', color:'var(--admin-text-secondary)', fontSize:'13px', borderRight:'1px solid var(--admin-border)', flexShrink:0 }}>/kategori/</span>
                  <input
                    type="text"
                    placeholder="teknologi"
                    value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                    style={{ flex:1, background:'transparent', border:'none', padding:'11px 14px', color:'var(--admin-text-primary)', fontSize:'14px', outline:'none' }}
                  />
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label style={{ color:'var(--admin-text-secondary)', fontSize:'12px', fontWeight:600, display:'block', marginBottom:'10px' }}>WARNA LABEL</label>
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                  {CATEGORY_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setForm(f => ({ ...f, color }))}
                      style={{
                        width:'32px', height:'32px', borderRadius:'50%', background: color, border: form.color === color ? '3px solid #fff' : '3px solid transparent',
                        cursor:'pointer', transition:'transform 0.2s', boxShadow: form.color === color ? `0 0 0 2px ${color}` : 'none'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform='scale(1.2)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; }}
                    />
                  ))}
                </div>
              </div>

              {/* Home Layout */}
              <div>
                <label style={{ color:'var(--admin-text-secondary)', fontSize:'12px', fontWeight:600, display:'block', marginBottom:'6px' }}>LAYOUT BERANDA</label>
                <select
                  value={form.homeLayout || 'none'}
                  onChange={e => setForm(f => ({ ...f, homeLayout: e.target.value }))}
                  style={{ width:'100%', background:'var(--admin-bg)', border:'1px solid var(--admin-border)', borderRadius:'10px', padding:'11px 14px', color:'var(--admin-text-primary)', fontSize:'14px', outline:'none', cursor:'pointer' }}
                >
                  <option value="none" style={{ background:'var(--admin-card-bg)', color:'var(--admin-text-primary)' }}>❌ Sembunyikan dari Beranda</option>
                  <option value="zigzag" style={{ background:'var(--admin-card-bg)', color:'var(--admin-text-primary)' }}>📐 Model Zigzag (1 Besar + 4 Kecil)</option>
                  <option value="mixed-top-3" style={{ background:'var(--admin-card-bg)', color:'var(--admin-text-primary)' }}>📰 Model List (3 Kecil Atas + 1 Besar Bawah)</option>
                  <option value="grid" style={{ background:'var(--admin-card-bg)', color:'var(--admin-text-primary)' }}>🔲 Model Grid (4 Berjejer)</option>
                </select>
                <p style={{ margin:'6px 0 0', fontSize:'11px', color:'var(--admin-text-secondary)' }}>Pilih bagaimana berita dari kategori ini ditampilkan di halaman Home.</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display:'flex', gap:'10px', marginTop:'24px' }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ flex:1, background:'var(--admin-hover-bg)', border:'1px solid var(--admin-border)', color:'var(--admin-text-secondary)', padding:'12px', borderRadius:'10px', cursor:'pointer', fontWeight:600, fontSize:'14px' }}
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                style={{ flex:2, background:`linear-gradient(135deg, #e63946, #c1121f)`, border:'none', color:'#fff', padding:'12px', borderRadius:'10px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight:700, fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', opacity: saving || !form.name.trim() ? 0.6 : 1 }}
              >
                <Check size={16} /> {saving ? 'Menyimpan...' : editingCat ? 'Perbarui Kategori' : 'Simpan Kategori'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategories;
