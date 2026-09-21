import React, { useState, useEffect, useRef } from 'react';

import Link from 'next/link';
import { signOut } from 'firebase/auth';
import {
  collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, PenTool, Globe, LogOut, Users, Settings,
  Image as ImageIcon, Tag, Trash2, Edit2, Plus, Check, X, FileText, ExternalLink, Zap,
  Menu, Layout, Sparkles
} from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';


const Navigate = ({to}) => { React.useEffect(() => { if (typeof window !== 'undefined') window.location.href = to; }, [to]); return null; };

const AdminPages = () => {
  const { currentUser, userRole, loading: authLoading } = useAuth();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const quillRef = useRef(null);
  const isUserTypingRef = useRef(false);
  
  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('published');
  const [showInFooter, setShowInFooter] = useState(true);
  const [showInSideMenu, setShowInSideMenu] = useState(true);
  
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchPages();
  }, []);

  const handleContentChange = (val, delta, source, editor) => {
    if (source === 'user') {
      isUserTypingRef.current = true;
    }
    setContent(val);
  };

  useEffect(() => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      if (editor) {
        if (isUserTypingRef.current) {
          isUserTypingRef.current = false;
          return;
        }
        if (editor.root.innerHTML !== content) {
          const delta = editor.clipboard.convert({ html: content || '' });
          editor.setContents(delta, 'silent');
        }
      }
    }
  }, [content]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const toSlug = (str) =>
    str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const fetchPages = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'pages'), orderBy('title', 'asc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const hasFaq = list.some(p => p.slug === 'faq');
      if (!hasFaq && list.length > 0) {
        await addDoc(collection(db, 'pages'), {
          title: 'FAQ (Tanya Jawab & Bantuan)',
          slug: 'faq',
          status: 'published',
          showInFooter: true,
          showInSideMenu: true,
          content: `<h2>Pertanyaan Umum & Pusat Bantuan BEDAIN NEWS</h2>\n<p>Halaman ini menampilkan pertanyaan yang sering diajukan oleh pembaca terkait fitur baca AI, penulisan artikel warga, dan kebijakan redaksi.</p>`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        const snap2 = await getDocs(query(collection(db, 'pages'), orderBy('title', 'asc')));
        setPages(snap2.docs.map(d => ({ id: d.id, ...d.data() })));
      } else {
        setPages(list);
      }
    } catch (e) {
      try {
        const snap = await getDocs(collection(db, 'pages'));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const hasFaq = data.some(p => p.slug === 'faq');
        if (!hasFaq && data.length > 0) {
          await addDoc(collection(db, 'pages'), {
            title: 'FAQ (Tanya Jawab & Bantuan)',
            slug: 'faq',
            status: 'published',
            showInFooter: true,
            showInSideMenu: true,
            content: `<h2>Pertanyaan Umum & Pusat Bantuan BEDAIN NEWS</h2>\n<p>Halaman ini menampilkan pertanyaan yang sering diajukan oleh pembaca terkait fitur baca AI, penulisan artikel warga, dan kebijakan redaksi.</p>`,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          const snap2 = await getDocs(collection(db, 'pages'));
          setPages(snap2.docs.map(d => ({ id: d.id, ...d.data() })));
        } else {
          setPages(data);
        }
      } catch (err) {
        console.error("Error fetching pages:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setCurrentId(null);
    setTitle('');
    setSlug('');
    setContent('');
    setStatus('published');
    setShowInFooter(true);
    setShowInSideMenu(true);
    setIsEditing(true);
  };

  const getDefaultTemplateForSlug = (targetSlug) => {
    const cleanSlug = (targetSlug || '').trim().toLowerCase();
    const defaultTemplates = {
      'tentang-kami': `<h2>Tentang Portal Berita BEDAIN NEWS</h2>\n<p><strong>BEDAIN NEWS</strong> adalah portal berita masa depan dan media informasi aktual yang mengedepankan akurasi, ketajaman analisis, dan kecepatan pelaporan. Didirikan dengan visi untuk menjadi mercusuar informasi terpercaya di era digital, kami menyajikan jurnalisme berkelas yang mencerahkan masyarakat.</p>\n<h3>Visi & Misi</h3>\n<p><strong>Visi:</strong> Menjadi media siber rujukan utama yang independen, edukatif, dan terdepan dalam inovasi teknologi jurnalisme.</p>\n<p><strong>Misi:</strong></p>\n<ul>\n  <li>Menyajikan berita yang faktual, berimbang, dan telah diverifikasi secara mendalam.</li>\n  <li>Mengupas tren teknologi, finansial, dan kebijakan publik secara komprehensif.</li>\n  <li>Memberikan ruang bagi literasi digital dan edukasi masyarakat Indonesia.</li>\n</ul>\n<p>Kami percaya bahwa informasi yang tepat adalah kunci untuk membangun peradaban yang lebih maju.</p>`,
      'redaksi': `<h2>Susunan Redaksi BEDAIN NEWS</h2>\n<p>Portal Berita <strong>BEDAIN NEWS</strong> diterbitkan oleh jaringan media digital independen yang diawasi oleh standar kode etik jurnalistik tertinggi.</p>\n<hr />\n<h3>Manajemen & Redaksi</h3>\n<p><strong>Pemimpin Umum / Pemimpin Redaksi:</strong> Tim Redaksi BEDAIN NEWS<br />\n<strong>Redaktur Pelaksana:</strong> Tim Liputan Siber & Teknologi<br />\n<strong>Koordinator Liputan:</strong> Divisi Riset & Data</p>\n<h3>Jurnalis & Desk Liputan</h3>\n<ul>\n  <li><strong>Desk Teknologi & AI:</strong> Tim Tekno BEDAIN NEWS</li>\n  <li><strong>Desk Finansial & Bisnis:</strong> Tim Ekonomi & Pasar</li>\n  <li><strong>Desk Politik & Kebijakan:</strong> Tim Liputan Nasional</li>\n  <li><strong>Desk Gaya Hidup & Hiburan:</strong> Tim Budaya & Tren Visual</li>\n</ul>\n<hr />\n<h3>Divisi Teknologi & Pengembangan Web</h3>\n<p><strong>Chief Technology Officer (CTO):</strong> Divisi Rekayasa Web<br />\n<strong>UI/UX & Desain Grafis:</strong> Studio Visual BEDAIN NEWS</p>\n<hr />\n<p><strong>Alamat Kantor Redaksi:</strong><br />\nGedung BEDAIN NEWS Media Center, Lantai 8<br />\nJakarta, Indonesia<br />\nEmail Redaksi: redaksi@bedainnews.com</p>`,
      'pedoman-siber': `<h2>Pedoman Pemberitaan Media Siber</h2>\n<p>Kemerdekaan berpendapat, kemerdekaan berekspresi, dan kemerdekaan pers adalah hak asasi manusia yang dilindungi Pancasila, Undang-Undang Dasar 1945, dan Deklarasi Universal Hak Asasi Manusia PBB. Keberadaan media siber di Indonesia juga merupakan bagian dari kemerdekaan berpendapat, kemerdekaan berekspresi, dan kemerdekaan pers.</p>\n<p>Media siber memiliki karakter khusus sehingga memerlukan pedoman agar pengelolaan pemberitaan dapat dipertanggungjawabkan secara profesional dan memenuhi fungsi, hak, dan kewajibannya sesuai dengan Undang-Undang Nomor 40 Tahun 1999 tentang Pers dan Kode Etik Jurnalistik.</p>\n<h3>1. Ruang Lingkup</h3>\n<p>Pedoman ini berlaku untuk seluruh redaksi, jurnalis, dan tim liputan di lingkungan BEDAIN NEWS.</p>\n<h3>2. Verifikasi dan Keberimbangan Berita</h3>\n<p>a. Pada prinsipnya setiap berita harus melalui verifikasi.<br />\nb. Berita yang dapat merugikan pihak lain memerlukan verifikasi pada berita yang sama untuk memenuhi prinsip akurasi dan keberimbangan.</p>\n<h3>3. Pencabutan, Ralat, dan Hak Jawab</h3>\n<p>BEDAIN NEWS menyediakan mekanisme ralat, koreksi, dan hak jawab sesuai Undang-Undang Pers dengan mencantumkan tautan ke berita awal yang dikoreksi.</p>`,
      'kebijakan-privasi': `<h2>Kebijakan Privasi (Privacy Policy)</h2>\n<p>Selamat datang di <strong>BEDAIN NEWS</strong>. Kami sangat menghargai privasi dan keamanan data pribadi setiap pembaca dan pengunjung situs web kami. Kebijakan Privasi ini menjelaskan bagaimana informasi Anda dikumpulkan, digunakan, dan dilindungi.</p>\n<h3>1. Pengumpulan Informasi</h3>\n<p>Kami mengumpulkan informasi non-pribadi seperti alamat IP, jenis peramban (browser), waktu kunjungan, dan halaman yang diakses untuk analisis statistik dan peningkatan performa website. Kami tidak mengumpulkan data pribadi sensitif tanpa persetujuan Anda.</p>\n<h3>2. Penggunaan Cookies</h3>\n<p>BEDAIN NEWS menggunakan cookies untuk mempercepat pemuatan halaman, menyimpan preferensi mode tema gelap/terang Anda, serta memberikan pengalaman membaca yang disesuaikan.</p>\n<h3>3. Keamanan Data</h3>\n<p>Kami menerapkan standar enkripsi keamanan tertinggi (HTTPS/SSL) dan perlindungan server Firestore Cloud untuk menjaga agar data aktivitas website tidak disalahgunakan oleh pihak yang tidak berwenang.</p>\n<p>Dengan mengakses situs ini, Anda menyetujui Kebijakan Privasi yang berlaku di portal BEDAIN NEWS.</p>`,
      'faq': `<h2>Pertanyaan Umum & Pusat Bantuan BEDAIN NEWS</h2>\n<p>Halaman ini menampilkan pertanyaan yang sering diajukan oleh pembaca terkait fitur baca AI, penulisan artikel warga, dan kebijakan redaksi.</p>`,
      'kontak': `<h2>Pusat Komunikasi & Kemitraan Resmi BEDAIN NEWS</h2>\n<p>Untuk penawaran kerja sama bisnis, pemasangan iklan banner, pengiriman siaran pers (*press release*), liputan eksklusif, atau pengaduan pemberitaan, silakan langsung mengunjungi halaman interaktif kontak resmi kami atau menghubungi redaksi melalui:</p>\n<ul>\n  <li><strong>WhatsApp Redaksi & Bisnis:</strong> <a href="https://wa.me/6281112345678" target="_blank" rel="noreferrer">+62 811-1234-5678</a></li>\n  <li><strong>Email Komersial & Sponsorship:</strong> info@bedainnews.com</li>\n  <li><strong>Email Liputan & Siaran Pers:</strong> redaksi@bedainnews.com</li>\n  <li><strong>Alamat Kantor:</strong> Gedung BEDAIN NEWS Digital Hub, Lt. 3, Jl. Jenderal Sudirman, Jakarta Selatan 12190</li>\n</ul>\n<p><a href="/kontak" style="display:inline-block;padding:12px 24px;background-color:#ef4444;color:#fff;border-radius:12px;text-decoration:none;font-weight:bold;margin-top:16px;">Buka Formulir Kontak Interaktif</a></p>`
    };
    return defaultTemplates[cleanSlug] || '';
  };

  const handleOpenEdit = (page) => {
    setCurrentId(page.id);
    setTitle(page.title || '');
    const currentSlug = page.slug || '';
    setSlug(currentSlug);
    
    let existingContent = page.content || '';
    if (!existingContent.trim()) {
      existingContent = getDefaultTemplateForSlug(currentSlug);
    }
    setContent(existingContent);
    setStatus(page.status || 'published');
    setShowInFooter(page.showInFooter ?? true);
    setShowInSideMenu(page.showInSideMenu ?? true);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showToast('Judul halaman wajib diisi!', 'error');
      return;
    }
    setSaving(true);
    try {
      const finalSlug = slug.trim() || toSlug(title);
      const pageData = {
        title: title.trim(),
        slug: finalSlug,
        content,
        status,
        showInFooter,
        showInSideMenu,
        updatedAt: serverTimestamp()
      };

      if (currentId) {
        await updateDoc(doc(db, 'pages', currentId), pageData);
        showToast('Halaman berhasil diperbarui!');
      } else {
        pageData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'pages'), pageData);
        showToast('Halaman baru berhasil dibuat!');
      }

      setIsEditing(false);
      await fetchPages();
    } catch (e) {
      console.error("Save error:", e);
      showToast('Gagal menyimpan halaman: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, pageTitle) => {
    if (!window.confirm(`Yakin ingin menghapus halaman "${pageTitle}"?`)) return;
    try {
      await deleteDoc(doc(db, 'pages', id));
      await fetchPages();
      showToast('Halaman berhasil dihapus');
    } catch (e) {
      showToast('Gagal menghapus halaman', 'error');
    }
  };

  const handleToggleStatus = async (page) => {
    try {
      const newStatus = page.status === 'published' ? 'draft' : 'published';
      await updateDoc(doc(db, 'pages', page.id), { status: newStatus });
      await fetchPages();
      showToast(`Status diubah menjadi ${newStatus === 'published' ? 'Diterbitkan' : 'Draft'}`);
    } catch (e) {
      showToast('Gagal mengubah status', 'error');
    }
  };

  const handleGenerateDefaultPages = async () => {
    if (!window.confirm('Buat otomatis 6 halaman standar portal berita (Tentang Kami, FAQ & Bantuan, Redaksi, Pedoman Siber, Privasi, dan Kontak)?')) return;
    setGenerating(true);
    try {
      const defaultPages = [
        {
          title: 'Tentang Kami',
          slug: 'tentang-kami',
          status: 'published',
          showInFooter: true,
          showInSideMenu: true,
          content: `<h2>Tentang Portal Berita BEDAIN NEWS</h2>
<p><strong>BEDAIN NEWS</strong> adalah portal berita masa depan dan media informasi aktual yang mengedepankan akurasi, ketajaman analisis, dan kecepatan pelaporan. Didirikan dengan visi untuk menjadi mercusuar informasi terpercaya di era digital, kami menyajikan jurnalisme berkelas yang mencerahkan masyarakat.</p>
<h3>Visi & Misi</h3>
<p><strong>Visi:</strong> Menjadi media siber rujukan utama yang independen, edukatif, dan terdepan dalam inovasi teknologi jurnalisme.</p>
<p><strong>Misi:</strong></p>
<ul>
  <li>Menyajikan berita yang faktual, berimbang, dan telah diverifikasi secara mendalam.</li>
  <li>Mengupas tren teknologi, finansial, dan kebijakan publik secara komprehensif.</li>
  <li>Memberikan ruang bagi literasi digital dan edukasi masyarakat Indonesia.</li>
</ul>
<p>Kami percaya bahwa informasi yang tepat adalah kunci untuk membangun peradaban yang lebih maju.</p>`
        },
        {
          title: 'Redaksi & Susunan Tim',
          slug: 'redaksi',
          status: 'published',
          showInFooter: true,
          showInSideMenu: true,
          content: `<h2>Susunan Redaksi BEDAIN NEWS</h2>
<p>Portal Berita <strong>BEDAIN NEWS</strong> diterbitkan oleh jaringan media digital independen yang diawasi oleh standar kode etik jurnalistik tertinggi.</p>
<hr />
<h3>Manajemen & Redaksi</h3>
<p><strong>Pemimpin Umum / Pemimpin Redaksi:</strong> Tim Redaksi BEDAIN NEWS<br />
<strong>Redaktur Pelaksana:</strong> Tim Liputan Siber & Teknologi<br />
<strong>Koordinator Liputan:</strong> Divisi Riset & Data</p>
<h3>Jurnalis & Desk Liputan</h3>
<ul>
  <li><strong>Desk Teknologi & AI:</strong> Tim Tekno BEDAIN NEWS</li>
  <li><strong>Desk Finansial & Bisnis:</strong> Tim Ekonomi & Pasar</li>
  <li><strong>Desk Politik & Kebijakan:</strong> Tim Liputan Nasional</li>
  <li><strong>Desk Gaya Hidup & Hiburan:</strong> Tim Budaya & Tren Visual</li>
</ul>
<hr />
<h3>Divisi Teknologi & Pengembangan Web</h3>
<p><strong>Chief Technology Officer (CTO):</strong> Divisi Rekayasa Web<br />
<strong>UI/UX & Desain Grafis:</strong> Studio Visual BEDAIN NEWS</p>
<hr />
<p><strong>Alamat Kantor Redaksi:</strong><br />
Gedung BEDAIN NEWS Media Center, Lantai 8<br />
Jakarta, Indonesia<br />
Email Redaksi: redaksi@bedainnews.com</p>`
        },
        {
          title: 'Pedoman Pemberitaan Media Siber',
          slug: 'pedoman-siber',
          status: 'published',
          showInFooter: true,
          showInSideMenu: false,
          content: `<h2>Pedoman Pemberitaan Media Siber</h2>
<p>Kemerdekaan berpendapat, kemerdekaan berekspresi, dan kemerdekaan pers adalah hak asasi manusia yang dilindungi Pancasila, Undang-Undang Dasar 1945, dan Deklarasi Universal Hak Asasi Manusia PBB. Keberadaan media siber di Indonesia juga merupakan bagian dari kemerdekaan berpendapat, kemerdekaan berekspresi, dan kemerdekaan pers.</p>
<p>Media siber memiliki karakter khusus sehingga memerlukan pedoman agar pengelolaan pemberitaan dapat dipertanggungjawabkan secara profesional dan memenuhi fungsi, hak, dan kewajibannya sesuai dengan Undang-Undang Nomor 40 Tahun 1999 tentang Pers dan Kode Etik Jurnalistik.</p>
<h3>1. Ruang Lingkup</h3>
<p>Pedoman ini berlaku untuk seluruh redaksi, jurnalis, dan tim liputan di lingkungan BEDAIN NEWS.</p>
<h3>2. Verifikasi dan Keberimbangan Berita</h3>
<p>a. Pada prinsipnya setiap berita harus melalui verifikasi.<br />
b. Berita yang dapat merugikan pihak lain memerlukan verifikasi pada berita yang sama untuk memenuhi prinsip akurasi dan keberimbangan.</p>
<h3>3. Pencabutan, Ralat, dan Hak Jawab</h3>
<p>BEDAIN NEWS menyediakan mekanisme ralat, koreksi, dan hak jawab sesuai Undang-Undang Pers dengan mencantumkan tautan ke berita awal yang dikoreksi.</p>`
        },
        {
          title: 'Kebijakan Privasi',
          slug: 'kebijakan-privasi',
          status: 'published',
          showInFooter: true,
          showInSideMenu: false,
          content: `<h2>Kebijakan Privasi (Privacy Policy)</h2>
<p>Selamat datang di <strong>BEDAIN NEWS</strong>. Kami sangat menghargai privasi dan keamanan data pribadi setiap pembaca dan pengunjung situs web kami. Kebijakan Privasi ini menjelaskan bagaimana informasi Anda dikumpulkan, digunakan, dan dilindungi.</p>
<h3>1. Pengumpulan Informasi</h3>
<p>Kami mengumpulkan informasi non-pribadi seperti alamat IP, jenis peramban (browser), waktu kunjungan, dan halaman yang diakses untuk analisis statistik dan peningkatan performa website. Kami tidak mengumpulkan data pribadi sensitif tanpa persetujuan Anda.</p>
<h3>2. Penggunaan Cookies</h3>
<p>BEDAIN NEWS menggunakan cookies untuk mempercepat pemuatan halaman, menyimpan preferensi mode tema gelap/terang Anda, serta memberikan pengalaman membaca yang disesuaikan.</p>
<h3>3. Keamanan Data</h3>
<p>Kami menerapkan standar enkripsi keamanan tertinggi (HTTPS/SSL) dan perlindungan server Firestore Cloud untuk menjaga agar data aktivitas website tidak disalahgunakan oleh pihak yang tidak berwenang.</p>
<p>Dengan mengakses situs ini, Anda menyetujui Kebijakan Privasi yang berlaku di portal BEDAIN NEWS.</p>`
        },
        {
          title: 'FAQ (Tanya Jawab & Bantuan)',
          slug: 'faq',
          status: 'published',
          showInFooter: true,
          showInSideMenu: true,
          content: `<h2>Pertanyaan Umum & Pusat Bantuan BEDAIN NEWS</h2>
<p>Halaman ini menampilkan pertanyaan yang sering diajukan oleh pembaca terkait fitur baca AI, penulisan artikel warga, dan kebijakan redaksi.</p>`
        },
        {
          title: 'Kontak & Kemitraan',
          slug: 'kontak',
          status: 'published',
          showInFooter: true,
          showInSideMenu: true,
          content: `<h2>Pusat Komunikasi & Kemitraan Resmi BEDAIN NEWS</h2>
<p>Untuk penawaran kerja sama bisnis, pemasangan iklan banner, pengiriman siaran pers (*press release*), liputan eksklusif, atau pengaduan pemberitaan, silakan langsung mengunjungi halaman interaktif kontak resmi kami atau menghubungi redaksi melalui:</p>
<ul>
  <li><strong>WhatsApp Redaksi & Bisnis:</strong> <a href="https://wa.me/6281112345678" target="_blank" rel="noreferrer">+62 811-1234-5678</a></li>
  <li><strong>Email Komersial & Sponsorship:</strong> info@bedainnews.com</li>
  <li><strong>Email Liputan & Siaran Pers:</strong> redaksi@bedainnews.com</li>
  <li><strong>Alamat Kantor:</strong> Gedung BEDAIN NEWS Digital Hub, Lt. 3, Jl. Jenderal Sudirman, Jakarta Selatan 12190</li>
</ul>
<p><a href="/kontak" style="display:inline-block;padding:12px 24px;background-color:#ef4444;color:#fff;border-radius:12px;text-decoration:none;font-weight:bold;margin-top:16px;">Buka Formulir Kontak Interaktif</a></p>`
        }
      ];

      let addedCount = 0;
      for (const p of defaultPages) {
        const exists = pages.some(existing => existing.slug === p.slug || existing.title === p.title);
        if (!exists) {
          await addDoc(collection(db, 'pages'), {
            ...p,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          addedCount++;
        }
      }

      await fetchPages();
      showToast(`Berhasil menambahkan ${addedCount} halaman standar portal!`);
    } catch (e) {
      console.error(e);
      showToast('Gagal membuat halaman standar: ' + e.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch (e) { console.error(e); }
  };

  if (authLoading) return <div className="admin-loading-screen"><div className="spinner"></div><p>Memeriksa akses...</p></div>;
  if (!['superadmin', 'admin'].includes(userRole)) return <Navigate to="/admin/dashboard" replace />;

  const modules = {
    toolbar: [
      [{ 'header': [2, 3, 4, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
      ['link', 'clean'],
      [{ 'color': [] }, { 'background': [] }],
    ],
  };

  return (
    <div className="admin-layout">
      {/* Toast */}
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

      
      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>Kelola Halaman Statis</h1>
            <span style={{ fontSize: '13px', color: 'var(--admin-text-secondary)', marginTop: '4px', display: 'block' }}>
              Atur halaman khusus website seperti Tentang Kami, Pedoman Siber, Redaksi, dan Privasi
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleGenerateDefaultPages}
              disabled={generating}
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(168, 85, 247, 0.15))',
                border: '1px solid #3b82f6',
                color: 'var(--admin-text-primary)',
                padding: '10px 18px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '13.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              title="Buat otomatis halaman FAQ & Bantuan jika belum ada di database"
            >
              <Sparkles size={16} color="#3b82f6" />
              {generating ? 'Membuat...' : '⚡ Buat / Sync Halaman FAQ & Standar'}
            </button>

            <button
              className="admin-btn-primary"
              onClick={handleOpenNew}
            >
              <Plus size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Tambah Halaman Baru
            </button>
          </div>
        </header>

        <div className="admin-content">
          {/* Editor Modal Overlay */}
          {isEditing && (
            <div style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(0, 0, 0, 0.78)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px'
            }}>
              <div style={{
                background: 'var(--admin-card-bg)',
                border: '1px solid var(--admin-card-border)',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '960px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.65)',
                overflow: 'hidden'
              }}>
                {/* Modal Sticky Header */}
                <div style={{
                  padding: '20px 28px',
                  borderBottom: '1px solid var(--admin-card-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255, 255, 255, 0.02)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '12px',
                      background: 'rgba(230, 57, 70, 0.15)', color: 'var(--color-accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1px solid rgba(230, 57, 70, 0.3)'
                    }}>
                      <FileText size={22} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0 }}>
                        {currentId ? 'Edit Halaman Statis' : 'Buat Halaman Baru'}
                      </h2>
                      <p style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', margin: '2px 0 0 0' }}>
                        Atur judul, URL slug, status publikasi, dan penempatan tautan di portal
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEditing(false)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--admin-border)',
                      borderRadius: '10px',
                      width: '38px', height: '38px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--admin-text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title="Tutup Modal"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Modal Scrollable Content */}
                <div style={{
                  padding: '24px 28px',
                  overflowY: 'auto',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '22px'
                }}>
                  {/* Top Inputs Section */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-secondary)', display: 'block', marginBottom: '6px', letterSpacing: '0.4px' }}>
                        JUDUL HALAMAN *
                      </label>
                      <input
                        className="admin-input"
                        placeholder="cth: Tentang Kami"
                        value={title}
                        onChange={e => {
                          setTitle(e.target.value);
                          if (!currentId) setSlug(toSlug(e.target.value));
                        }}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-secondary)', display: 'block', marginBottom: '6px', letterSpacing: '0.4px' }}>
                        SLUG / PATH URL
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--admin-hover-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px', padding: '0 12px' }}>
                        <span style={{ color: 'var(--admin-text-secondary)', fontSize: '13px', fontWeight: 600 }}>/page/</span>
                        <input
                          style={{ background: 'transparent', border: 'none', color: 'var(--admin-text-primary)', padding: '10px 4px', width: '100%', outline: 'none', fontSize: '13px' }}
                          placeholder="tentang-kami"
                          value={slug}
                          onChange={e => setSlug(toSlug(e.target.value))}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-secondary)', display: 'block', marginBottom: '6px', letterSpacing: '0.4px' }}>
                        STATUS PUBLIKASI
                      </label>
                      <select
                        className="admin-input"
                        value={status}
                        onChange={e => setStatus(e.target.value)}
                      >
                        <option value="published">🟢 Diterbitkan (Published)</option>
                        <option value="draft">🟡 Draft (Sembunyikan)</option>
                      </select>
                    </div>
                  </div>

                  {/* Toggle Placement Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                    <div
                      onClick={() => setShowInFooter(!showInFooter)}
                      style={{
                        padding: '14px 18px',
                        borderRadius: '12px',
                        border: showInFooter ? '1px solid var(--color-accent)' : '1px solid var(--admin-border)',
                        background: showInFooter ? 'rgba(230, 57, 70, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Layout size={20} color={showInFooter ? 'var(--color-accent)' : 'var(--admin-text-secondary)'} />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-primary)' }}>Tampilkan di Footer Website</div>
                          <div style={{ fontSize: '11px', color: 'var(--admin-text-secondary)' }}>Muncul di tautan bawah situs</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={showInFooter}
                        onChange={() => {}}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                      />
                    </div>

                    <div
                      onClick={() => setShowInSideMenu(!showInSideMenu)}
                      style={{
                        padding: '14px 18px',
                        borderRadius: '12px',
                        border: showInSideMenu ? '1px solid var(--color-accent)' : '1px solid var(--admin-border)',
                        background: showInSideMenu ? 'rgba(230, 57, 70, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Menu size={20} color={showInSideMenu ? 'var(--color-accent)' : 'var(--admin-text-secondary)'} />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-primary)' }}>Tampilkan di Menu Samping</div>
                          <div style={{ fontSize: '11px', color: 'var(--admin-text-secondary)' }}>Muncul di Side Drawer navigasi</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={showInSideMenu}
                        onChange={() => {}}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                      />
                    </div>
                  </div>

                  {/* Rich Text Editor */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-secondary)', letterSpacing: '0.4px' }}>
                        KONTEN / ISI HALAMAN
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const tpl = getDefaultTemplateForSlug(slug);
                          if (tpl) {
                            if (!content.trim() || window.confirm('Isi/ganti konten di atas dengan template standar resmi BEDAIN NEWS?')) {
                              setContent(tpl);
                              showToast('Template standar resmi berhasil diisikan!');
                            }
                          } else {
                            showToast('Tidak ada template otomatis untuk slug ini. Silakan ketik manual.', 'info');
                          }
                        }}
                        style={{
                          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(249, 115, 22, 0.15))',
                          border: '1px solid #ef4444',
                          color: '#ef4444',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        title="Isi otomatis dengan template teks standar resmi"
                      >
                        <Sparkles size={14} /> ⚡ Isi Template Standar Resmi
                      </button>
                    </div>
                    <div className="modern-quill-container" style={{
                      background: 'var(--admin-bg)',
                      borderRadius: '14px',
                      border: '1px solid var(--admin-border)',
                      padding: '16px'
                    }}>
                      <ReactQuill
                        ref={quillRef}
                        theme="snow"
                        value={content || ''}
                        onChange={handleContentChange}
                        modules={modules}
                        placeholder="Tuliskan isi lengkap halaman statis di sini..."
                        style={{ minHeight: '340px', fontSize: '1rem' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Modal Sticky Footer Action Bar */}
                <div style={{
                  padding: '18px 28px',
                  borderTop: '1px solid var(--admin-card-border)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '14px'
                }}>
                  <button
                    className="admin-btn-secondary"
                    onClick={() => setIsEditing(false)}
                    style={{ padding: '10px 22px', borderRadius: '10px', fontSize: '14px' }}
                  >
                    Batal
                  </button>
                  <button
                    className="admin-btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                    style={{ padding: '10px 26px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', boxShadow: '0 4px 14px rgba(230, 57, 70, 0.4)' }}
                  >
                    <Check size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    {saving ? 'Menyimpan...' : 'Simpan Halaman'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Table List */}
          <div className="admin-table-container">
            <div className="admin-table-header">
              <h2>Daftar Halaman Statis ({pages.length})</h2>
            </div>

            {loading ? (
              <div className="admin-loading">Memuat halaman...</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Judul Halaman</th>
                    <th>URL Path</th>
                    <th>Lokasi Menu</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((p) => (
                    <tr key={p.id}>
                      <td className="admin-table-title">
                        <span style={{ fontWeight: 600, color: 'var(--admin-text-primary)', fontSize: '15px' }}>{p.title}</span>
                      </td>
                      <td>
                        <a
                          href={`/page/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#4cc9f0', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(76, 201, 240, 0.1)', padding: '4px 10px', borderRadius: '6px', fontSize: '13px' }}
                          title="Buka halaman di tab baru"
                        >
                          /page/{p.slug} <ExternalLink size={13} />
                        </a>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {p.showInFooter && (
                            <span style={{ background: 'var(--admin-hover-bg)', color: 'var(--admin-text-primary)', border: '1px solid var(--admin-border)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px' }}>
                              ⚡ Footer
                            </span>
                          )}
                          {p.showInSideMenu && (
                            <span style={{ background: 'var(--admin-hover-bg)', color: 'var(--admin-text-primary)', border: '1px solid var(--admin-border)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px' }}>
                              📱 Side Menu
                            </span>
                          )}
                          {!p.showInFooter && !p.showInSideMenu && (
                            <span style={{ color: 'var(--admin-text-secondary)', fontSize: '12px' }}>Tersembunyi</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleStatus(p)}
                          className={`status-badge ${p.status === 'published' ? 'status-published' : 'status-draft'}`}
                          style={{ cursor: 'pointer', border: 'none', background: 'none' }}
                          title="Klik untuk ubah status"
                        >
                          {p.status === 'published' ? 'Diterbitkan' : 'Draft'}
                        </button>
                      </td>
                      <td className="admin-table-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="admin-btn-icon"
                          title="Edit Halaman"
                          style={{ padding: '6px 10px', background: 'var(--admin-hover-bg)', border: '1px solid var(--admin-border)', borderRadius: '6px', color: 'var(--admin-text-secondary)', cursor: 'pointer' }}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.title)}
                          className="admin-btn-icon-danger"
                          title="Hapus Halaman"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pages.length === 0 && (
                    <tr>
                      <td colSpan={5} className="admin-table-empty" style={{ padding: '40px', textAlign: 'center' }}>
                        <p style={{ marginBottom: '12px', color: 'var(--admin-text-secondary)' }}>Belum ada halaman statis yang dibuat.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Info Box */}
          <div style={{
            marginTop: '20px',
            background: 'rgba(76, 201, 240, 0.06)',
            border: '1px solid rgba(76, 201, 240, 0.2)',
            borderRadius: '10px',
            padding: '16px 20px',
            color: 'var(--admin-text-secondary)',
            fontSize: '13px',
            lineHeight: 1.7
          }}>
            <strong style={{ color: '#4cc9f0' }}>💡 Info Pengelolaan Halaman:</strong><br />
            • <strong>Halaman Statis</strong> digunakan untuk informasi institusional portal berita seperti <em>Tentang Kami, Redaksi, Pedoman Pemberitaan Media Siber, Kebijakan Privasi, dan Kontak</em>.<br />

            • Tautan halaman yang aktif dan dicentang <strong>Footer</strong> atau <strong>Side Menu</strong> akan otomatis muncul di bagian bawah website dan di menu hamburger penonton.
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPages;
