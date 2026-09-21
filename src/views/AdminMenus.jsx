import React, { useState, useEffect } from 'react';

import { doc, getDoc, setDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { 
  Plus, Check, X, GripVertical, Trash2, Edit2, AlertCircle, Save
} from 'lucide-react';


const DEFAULT_MENUS = {
  header: [],
  footer: [
    { id: 'col1', title: 'Kategori', links: [] },
    { id: 'col2', title: 'Layanan', links: [] },
    { id: 'col3', title: 'Informasi', links: [] },
    { id: 'col4', title: 'Jaringan Media', links: [] }
  ]
};

const Navigate = ({to}) => { React.useEffect(() => { if (typeof window !== 'undefined') window.location.href = to; }, [to]); return null; };

const AdminMenus = () => {
  const { userRole, loading: authLoading } = useAuth();
  const [menus, setMenus] = useState(DEFAULT_MENUS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('header'); // 'header' | 'footer'

  // Edit State
  const [editingItem, setEditingItem] = useState(null); // { loc: 'header'|'footer_col1', id, label, url }
  const [newItem, setNewItem] = useState({ label: '', url: '' });

  useEffect(() => {
    fetchMenus();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchMenus = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'settings', 'menus');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setMenus({
          header: data.header || [],
          footer: data.footer && data.footer.length > 0 ? data.footer : DEFAULT_MENUS.footer
        });
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat data menu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'menus'), menus);
      showToast('Konfigurasi menu berhasil disimpan!');
    } catch (e) {
      showToast('Gagal menyimpan menu', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleImportCategories = async () => {
    if (!window.confirm('Import semua kategori aktif ke Menu Header? Ini akan mengganti isi menu header saat ini.')) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
      const snap = await getDocs(q);
      const newHeaderLinks = [];
      snap.docs.forEach(d => {
        const cat = d.data();
        if (cat.active !== false) {
          newHeaderLinks.push({
            id: generateId(),
            label: cat.name,
            url: `/#kategori-${cat.slug}`
          });
        }
      });
      setMenus(prev => ({ ...prev, header: newHeaderLinks }));
      showToast('Berhasil mengimpor kategori. Jangan lupa klik Simpan Perubahan.');
    } catch (e) {
      console.error(e);
      // Fallback if no index
      try {
        const snap = await getDocs(collection(db, 'categories'));
        const newHeaderLinks = snap.docs
          .map(d => d.data())
          .sort((a,b) => (a.order ?? 99) - (b.order ?? 99))
          .filter(cat => cat.active !== false)
          .map(cat => ({ id: generateId(), label: cat.name, url: `/#kategori-${cat.slug}` }));
        setMenus(prev => ({ ...prev, header: newHeaderLinks }));
        showToast('Berhasil mengimpor kategori. Jangan lupa klik Simpan Perubahan.');
      } catch (err) {
        showToast('Gagal mengimpor kategori', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  // --- Header Helpers ---
  const addHeaderLink = () => {
    if (!newItem.label || !newItem.url) return;
    setMenus(prev => ({
      ...prev,
      header: [...prev.header, { id: generateId(), label: newItem.label, url: newItem.url }]
    }));
    setNewItem({ label: '', url: '' });
  };

  const removeHeaderLink = (id) => {
    setMenus(prev => ({
      ...prev,
      header: prev.header.filter(item => item.id !== id)
    }));
  };

  const moveHeaderLink = (index, dir) => {
    setMenus(prev => {
      const newHeader = [...prev.header];
      if (dir === 'up' && index > 0) {
        [newHeader[index - 1], newHeader[index]] = [newHeader[index], newHeader[index - 1]];
      } else if (dir === 'down' && index < newHeader.length - 1) {
        [newHeader[index], newHeader[index + 1]] = [newHeader[index + 1], newHeader[index]];
      }
      return { ...prev, header: newHeader };
    });
  };

  // --- Footer Helpers ---
  const addFooterLink = (colId) => {
    if (!newItem.label || !newItem.url) return;
    setMenus(prev => ({
      ...prev,
      footer: prev.footer.map(col => {
        if (col.id === colId) {
          return { ...col, links: [...col.links, { id: generateId(), label: newItem.label, url: newItem.url }] };
        }
        return col;
      })
    }));
    setEditingItem(null);
    setNewItem({ label: '', url: '' });
  };

  const removeFooterLink = (colId, linkId) => {
    setMenus(prev => ({
      ...prev,
      footer: prev.footer.map(col => {
        if (col.id === colId) {
          return { ...col, links: col.links.filter(l => l.id !== linkId) };
        }
        return col;
      })
    }));
  };

  const updateFooterColTitle = (colId, newTitle) => {
    setMenus(prev => ({
      ...prev,
      footer: prev.footer.map(col => col.id === colId ? { ...col, title: newTitle } : col)
    }));
  };

  if (authLoading) return <div className="admin-loading-screen"><div className="spinner"></div><p>Memeriksa akses...</p></div>;
  if (!['superadmin', 'admin'].includes(userRole)) return <Navigate to="/admin/dashboard" replace />;

  return (
    <div className="admin-layout">
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          background: toast.type === 'error' ? '#e63946' : '#2ecc71',
          color: '#fff', padding: '12px 20px', borderRadius: '8px',
          fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          animation: 'fadeIn 0.3s ease'
        }}>
          {toast.msg}
        </div>
      )}

      
      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>Manajemen Menu</h1>
            <span style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', marginTop: '4px', display: 'block' }}>
              Atur tautan yang muncul pada Header dan Footer website
            </span>
          </div>
          <button className="admin-btn-primary" onClick={handleSaveAll} disabled={saving || loading}>
            <Save size={16} style={{ marginRight: '6px' }} /> 
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </header>

        <div className="admin-content">
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <button
              onClick={() => setActiveTab('header')}
              style={{
                padding: '10px 20px', background: activeTab === 'header' ? 'var(--color-accent)' : 'var(--color-surface-2)',
                color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600
              }}
            >
              Menu Header
            </button>
            <button
              onClick={() => setActiveTab('footer')}
              style={{
                padding: '10px 20px', background: activeTab === 'footer' ? 'var(--color-accent)' : 'var(--color-surface-2)',
                color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600
              }}
            >
              Menu Footer
            </button>
          </div>

          {loading ? (
            <div className="admin-loading">Memuat konfigurasi menu...</div>
          ) : (
            <>
              {activeTab === 'header' && (
                <div className="admin-table-container">
                  <div className="admin-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>Tautan Header (Secondary Menu)</h2>
                    <button 
                      onClick={handleImportCategories} 
                      className="admin-btn-secondary" 
                      style={{ padding: '6px 14px', fontSize: '13px', background: 'var(--admin-hover-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-primary)', cursor: 'pointer', borderRadius: '6px' }}
                      title="Import semua kategori aktif sebagai menu header"
                    >
                      ⚡ Import dari Kategori
                    </button>
                  </div>
                  
                  <div style={{ padding: '20px', background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                    <h3 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--color-text-secondary)' }}>Tambah Tautan Baru</h3>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', display: 'block', marginBottom: '6px' }}>Label Menu</label>
                        <input className="admin-input" placeholder="cth: Teknologi" value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} />
                      </div>
                      <div style={{ flex: 2, minWidth: '300px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', display: 'block', marginBottom: '6px' }}>URL / Link</label>
                        <input className="admin-input" placeholder="cth: /#kategori-teknologi" value={newItem.url} onChange={e => setNewItem({...newItem, url: e.target.value})} />
                      </div>
                      <button className="admin-btn-primary" onClick={addHeaderLink}>
                        <Plus size={16} /> Tambah
                      </button>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', marginTop: '12px' }}>
                      💡 Format URL Kategori: <code>/#kategori-[slug]</code> (contoh: <code>/#kategori-ekonomi</code>)<br/>
                      💡 Format URL Halaman: <code>/page/[slug]</code> (contoh: <code>/page/tentang-kami</code>)
                    </p>
                  </div>

                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>Urutan</th>
                        <th>Label Menu</th>
                        <th>URL Tautan</th>
                        <th style={{ width: '100px' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {menus.header.map((item, index) => (
                        <tr key={item.id}>
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={() => moveHeaderLink(index, 'up')} disabled={index === 0} style={{ background: 'none', border: 'none', color: index === 0 ? 'var(--admin-border)' : 'var(--admin-text-secondary)', cursor: index === 0 ? 'default' : 'pointer', fontSize: '14px' }}>▲</button>
                              <button onClick={() => moveHeaderLink(index, 'down')} disabled={index === menus.header.length - 1} style={{ background: 'none', border: 'none', color: index === menus.header.length - 1 ? 'var(--admin-border)' : 'var(--admin-text-secondary)', cursor: index === menus.header.length - 1 ? 'default' : 'pointer', fontSize: '14px' }}>▼</button>
                            </div>
                          </td>
                          <td style={{ fontWeight: 600 }}>{item.label}</td>
                          <td style={{ color: 'var(--admin-text-secondary)' }}><code>{item.url}</code></td>
                          <td>
                            <button onClick={() => removeHeaderLink(item.id)} className="admin-btn-icon-danger" title="Hapus"><Trash2 size={15} /></button>
                          </td>
                        </tr>
                      ))}
                      {menus.header.length === 0 && (
                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--admin-text-secondary)' }}>Belum ada tautan menu header. Jika dibiarkan kosong, sistem akan menampilkan semua Kategori secara otomatis.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'footer' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                  {menus.footer.map((col) => {
                    const isCategoryCol = col.title.toLowerCase() === 'kategori';
                    return (
                    <div key={col.id} className="admin-table-container" style={{ display: 'flex', flexDirection: 'column' }}>
                      <div className="admin-table-header" style={{ padding: '16px' }}>
                        <input 
                          value={col.title} 
                          onChange={(e) => updateFooterColTitle(col.id, e.target.value)}
                          className="admin-input"
                          style={{ fontSize: '16px', fontWeight: 700, padding: '4px 8px', background: 'var(--admin-hover-bg)', border: '1px solid transparent' }}
                          title="Ubah judul kolom"
                        />
                      </div>
                      
                      <div style={{ padding: '16px', flex: 1 }}>
                        {isCategoryCol ? (
                          <div style={{ fontSize: '13px', color: 'var(--admin-text-secondary)', textAlign: 'center', padding: '20px 0', lineHeight: 1.6 }}>
                            ✨<br/><br/>
                            Tautan pada kolom ini akan diisi <strong>secara otomatis</strong> dengan daftar Kategori dari sistem.
                          </div>
                        ) : (
                          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {col.links.map(link => (
                              <li key={link.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--admin-bg)', borderRadius: '6px' }}>
                                <div style={{ overflow: 'hidden' }}>
                                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-primary)' }}>{link.label}</div>
                                  <div style={{ fontSize: '11px', color: 'var(--admin-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{link.url}</div>
                                </div>
                                <button onClick={() => removeFooterLink(col.id, link.id)} className="admin-btn-icon-danger" style={{ padding: '4px 8px' }}><Trash2 size={14} /></button>
                              </li>
                            ))}
                            {col.links.length === 0 && (
                              <li style={{ fontSize: '13px', color: 'var(--admin-text-secondary)', textAlign: 'center', padding: '12px 0' }}>Belum ada tautan</li>
                            )}
                          </ul>
                        )}
                      </div>

                      {!isCategoryCol && (
                        <div style={{ padding: '16px', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
                          {editingItem?.loc === col.id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <input className="admin-input" placeholder="Label Tautan" value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} style={{ fontSize: '13px' }} />
                              <input className="admin-input" placeholder="URL Tautan" value={newItem.url} onChange={e => setNewItem({...newItem, url: e.target.value})} style={{ fontSize: '13px' }} />
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="admin-btn-primary" onClick={() => addFooterLink(col.id)} style={{ flex: 1, padding: '6px' }}><Check size={14} /> Simpan</button>
                                <button className="admin-btn-icon-danger" onClick={() => { setEditingItem(null); setNewItem({label:'', url:''}); }} style={{ padding: '6px 12px' }}><X size={14} /></button>
                              </div>
                            </div>
                          ) : (
                            <button 
                              className="admin-btn-primary" 
                              style={{ width: '100%', padding: '8px', background: 'transparent', border: '1px dashed var(--color-border)', color: 'var(--admin-text-secondary)' }}
                              onClick={() => { setEditingItem({ loc: col.id }); setNewItem({ label: '', url: '' }); }}
                            >
                              <Plus size={14} style={{ marginRight: '6px' }}/> Tambah Tautan
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              )}
            </>
          )}

        </div>
      </main>
    </div>
  );
};

export default AdminMenus;
