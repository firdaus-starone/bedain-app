import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { ref, listAll, getDownloadURL, getMetadata, deleteObject } from 'firebase/storage';
import { auth, storage } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { uploadAndCompressImage } from '../lib/uploadImage';
import { LayoutDashboard, PenTool, Globe, LogOut, Users, Image as ImageIcon, Copy, Trash2, UploadCloud, Settings, Tag, FileText } from 'lucide-react';


const AdminMedia = () => {
  const { userRole, loading: authLoading } = useAuth();
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [allRefs, setAllRefs] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    fetchMediaRefs();
  }, []);

  const fetchMediaRefs = async () => {
    setLoading(true);
    try {
      const paths = ['articles/images', 'banners', 'sticky-ads'];
      const allItems = [];
      
      for (const p of paths) {
        try {
          const listRef = ref(storage, p);
          const res = await listAll(listRef);
          allItems.push(...res.items);
        } catch (e) {
          console.warn(`Folder ${p} belum ada atau tidak bisa diakses`, e);
        }
      }
      
      // Filenames start with timestamp, so sorting by name descending puts newest first
      const sortedRefs = allItems.sort((a, b) => b.name.localeCompare(a.name));
      setAllRefs(sortedRefs);
      
      await loadPageData(sortedRefs, 0);
    } catch (error) {
      console.error("Gagal memuat galeri:", error);
      setLoading(false);
    }
  };

  const loadPageData = async (refs, pageIndex) => {
    setLoading(true);
    try {
      const startIndex = pageIndex * ITEMS_PER_PAGE;
      const paginatedRefs = refs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
      
      const promises = paginatedRefs.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        const metadata = await getMetadata(itemRef);
        return {
          name: itemRef.name,
          fullPath: itemRef.fullPath,
          url,
          size: (metadata.size / 1024).toFixed(2) + ' KB',
          timeCreated: new Date(metadata.timeCreated).toLocaleDateString('id-ID'),
          ref: itemRef
        };
      });

      const mediaItems = await Promise.all(promises);
      
      if (pageIndex === 0) {
        setMediaList(mediaItems);
      } else {
        setMediaList(prev => [...prev, ...mediaItems]);
      }
      
      setCurrentPage(pageIndex);
    } catch (error) {
      console.error("Gagal memuat detail gambar:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    loadPageData(allRefs, currentPage + 1);
  };

  const handleCopy = (url) => {
    navigator.clipboard.writeText(url);
    alert('Tautan gambar disalin!');
  };

  const handleDelete = async (item) => {
    if (userRole === 'reporter') {
      alert("Reporter tidak diizinkan menghapus gambar.");
      return;
    }
    if (window.confirm("Yakin ingin menghapus gambar ini permanen?")) {
      try {
        await deleteObject(item.ref);
        setMediaList(prev => prev.filter(m => m.fullPath !== item.fullPath));
      } catch (error) {
        console.error("Gagal menghapus gambar:", error);
        alert("Terjadi kesalahan saat menghapus.");
      }
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadAndCompressImage(file, 'articles/images');
      await fetchMediaRefs(); // Refresh list
    } catch (error) {
      console.error("Upload gagal:", error);
      alert("Gagal mengunggah gambar.");
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (authLoading) {
    return <div className="admin-loading-screen"><div className="spinner"></div><p>Memeriksa akses...</p></div>;
  }

  return (
    <div className="admin-layout">
      

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-header">
          <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
            <h1>Galeri Media</h1>
          </div>
          <button 
            onClick={handleUploadClick}
            disabled={uploading}
            className="admin-btn admin-btn-primary"
            style={{display: 'flex', alignItems: 'center', gap: '5px'}}
          >
            <UploadCloud size={18} />
            {uploading ? 'Mengunggah...' : 'Unggah Gambar Baru'}
          </button>
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            style={{display: 'none'}} 
          />
        </header>

        <div className="admin-content">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--admin-text-secondary)' }}>
              <div className="spinner" style={{ margin: '0 auto 20px', borderTopColor: 'var(--color-accent)' }}></div>
              <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Memuat data galeri, harap tunggu sebentar...</p>
            </div>
          ) : mediaList.length === 0 ? (
            <div style={{textAlign: 'center', padding: '50px', color: 'var(--admin-text-secondary)'}}>
              <ImageIcon size={48} style={{opacity: 0.3, marginBottom: '15px'}} />
              <p>Belum ada gambar yang diunggah.</p>
            </div>
          ) : (
            <div style={{
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
              gap: '20px', 
              padding: '20px 0'
            }}>
              {mediaList.map((item, idx) => (
                <div key={idx} style={{
                  backgroundColor: 'var(--admin-card-bg)', 
                  borderRadius: '10px', 
                  overflow: 'hidden',
                  border: '1px solid var(--admin-card-border)',
                  position: 'relative',
                  group: 'media-card'
                }}>
                  <div style={{
                    height: '150px', 
                    width: '100%', 
                    backgroundImage: `url(${item.url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}></div>
                  <div style={{padding: '10px', fontSize: '12px', color: 'var(--admin-text-primary)'}}>
                    <div style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '5px'}}>
                      {item.name}
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between', color: 'var(--admin-text-secondary)'}}>
                      <span>{item.size}</span>
                      <span>{item.timeCreated}</span>
                    </div>
                    <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                      <button 
                        onClick={() => handleCopy(item.url)}
                        style={{flex: 1, padding: '5px', backgroundColor: 'var(--admin-hover-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-primary)', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'}}
                      >
                        <Copy size={14} /> Salin
                      </button>
                      {userRole !== 'reporter' && (
                        <button 
                          onClick={() => handleDelete(item)}
                          style={{padding: '5px 10px', backgroundColor: 'rgba(244, 67, 54, 0.2)', color: '#f44336', border: 'none', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {mediaList.length > 0 && currentPage * ITEMS_PER_PAGE + ITEMS_PER_PAGE < allRefs.length && (
            <div style={{ textAlign: 'center', margin: '20px 0 40px 0' }}>
              <button 
                onClick={loadMore} 
                disabled={loading}
                className="admin-btn admin-btn-secondary"
                style={{ padding: '10px 24px', fontSize: '14px', borderRadius: '8px' }}
              >
                {loading ? 'Memuat...' : 'Muat Lebih Banyak'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminMedia;
