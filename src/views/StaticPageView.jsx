import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Navbar from '../components/Navbar';
import BreakingNews from '../components/BreakingNews';
import Footer from '../components/Footer';
import { ArrowLeft, Share2, Printer, BookOpen, ChevronRight, FileText, CheckCircle, ShieldCheck, Sparkles } from 'lucide-react';
import SEO from '../components/SEO';
import FAQSection from '../components/FAQSection';
import { isMobileDevice } from '../lib/shareHelper';


const StaticPageView = () => {
  const { slug: paramSlug } = useParams();
  const router = useRouter();
  const slug = paramSlug || (typeof window !== 'undefined' && window.location.pathname.includes('/faq') ? 'faq' : null);
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [headings, setHeadings] = useState([]);
  const [contentHtml, setContentHtml] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [allPages, setAllPages] = useState([]);
  const contentRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (slug === 'kontak' || slug === 'contact') {
      router.push('/kontak', { replace: true });
      return;
    }
    const fetchPage = async () => {
      setLoading(true);
      setError(null);
      try {
        const q = query(
          collection(db, 'pages'),
          where('slug', '==', slug),
          where('status', '==', 'published'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setPage({ id: snap.docs[0].id, ...snap.docs[0].data() });
        } else if (slug === 'faq') {
          setPage({
            id: 'faq',
            slug: 'faq',
            title: 'Pertanyaan Umum (FAQ) & Bantuan Pembaca',
            content: ''
          });
        } else {
          setError('Halaman tidak ditemukan atau sedang dinonaktifkan.');
        }
      } catch (err) {
        console.error("Error fetching page:", err);
        setError('Terjadi kesalahan saat memuat halaman.');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPage();
    }
  }, [slug]);

  useEffect(() => {
    const fetchAllPages = async () => {
      try {
        const q = query(collection(db, 'pages'), where('status', '==', 'published'));
        const snap = await getDocs(q);
        const pagesData = [];
        snap.forEach(doc => pagesData.push({ id: doc.id, ...doc.data() }));
        if (!pagesData.some(p => p.slug === 'faq')) {
          pagesData.push({ id: 'faq', slug: 'faq', title: 'FAQ & Bantuan', status: 'published', showInFooter: true });
        }
        setAllPages(pagesData);
      } catch (err) {
        console.error("Error fetching all pages:", err);
      }
    };
    fetchAllPages();
  }, []);

  // Extract headings from content after render
  useEffect(() => {
    if (!page?.content) return;

    let contentToParse = page.content.replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ');

    // Parse headings from HTML content
    const parser = new DOMParser();
    const doc = parser.parseFromString(contentToParse, 'text/html');

    // Auto-enhance paragraphs that look like section titles or standalone bold text
    const paragraphs = doc.querySelectorAll('p');
    paragraphs.forEach(p => {
      const textContent = p.textContent.trim();
      const hasOnlyStrong = (p.children.length === 1 && (p.children[0].tagName === 'STRONG' || p.children[0].tagName === 'B') && p.children[0].textContent.trim() === textContent) || (textContent.endsWith(':') && textContent.length < 65 && p.textContent.length < 65);
      if (hasOnlyStrong && textContent.length > 2 && textContent.length < 80) {
        const h2 = doc.createElement('h2');
        h2.innerHTML = p.innerHTML;
        h2.style.borderLeft = '4px solid var(--color-accent)';
        h2.style.paddingLeft = '14px';
        h2.style.marginTop = '32px';
        h2.style.marginBottom = '16px';
        h2.style.fontSize = '1.35rem';
        h2.style.fontWeight = '700';
        h2.style.color = 'var(--color-text-primary)';
        p.replaceWith(h2);
      } else {
        p.style.marginBottom = '1.4em';
        p.style.lineHeight = '1.85';
      }
    });

    const hElements = doc.querySelectorAll('h1, h2, h3, h4');
    const extracted = [];
    hElements.forEach((el, index) => {
      const id = `heading-${index}`;
      el.setAttribute('id', id);
      el.style.borderLeft = el.style.borderLeft || '4px solid var(--color-accent)';
      el.style.paddingLeft = el.style.paddingLeft || '14px';
      el.style.marginTop = el.style.marginTop || '32px';
      el.style.marginBottom = el.style.marginBottom || '16px';
      el.style.color = 'var(--color-text-primary)';
      extracted.push({
        id,
        text: el.textContent.trim().replace(/:$/, ''),
        level: parseInt(el.tagName[1]) || 2
      });
    });
    setHeadings(extracted);
    setContentHtml(doc.body.innerHTML);
  }, [page?.content]);

  // Track active section using IntersectionObserver
  useEffect(() => {
    if (!contentRef.current || headings.length === 0) return;
    const hEls = contentRef.current.querySelectorAll('h1, h2, h3, h4');
    
    // Set scrollMarginTop for smooth scrolling offset
    hEls.forEach((el) => {
      el.style.scrollMarginTop = '100px';
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-80px 0px -70% 0px' }
    );

    hEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings, contentHtml]);

  const scrollToHeading = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (isMobileDevice() && navigator.share) {
      navigator.share({
        title: page?.title || 'BEDAIN NEWS',
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Tautan halaman berhasil disalin ke clipboard!');
    }
  };

  return (
    <div className="app-container">
      {page && (
        <SEO 
          title={page.title}
          description={page.content ? page.content.replace(/<[^>]+>/g, '').substring(0, 160) : ''}
          type="website"
        />
      )}
      <BreakingNews />
      <Navbar />

      <main className="container" style={{ margin: 'var(--spacing-xl) auto', minHeight: '60vh' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link href="/"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}
          >
            <ArrowLeft size={16} /> Kembali ke Beranda
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
            <p style={{ color: 'var(--color-text-secondary)' }}>Memuat halaman...</p>
          </div>
        ) : error || !page ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'var(--color-bg-secondary)',
            borderRadius: '16px',
            border: '1px solid var(--color-border)'
          }}>
            <h1 style={{ fontSize: '1.8rem', marginBottom: '12px', color: 'var(--color-text-primary)' }}>404 - Halaman Tidak Ditemukan</h1>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px', maxWidth: '480px', margin: '0 auto 24px' }}>
              {error || 'Maaf, halaman yang Anda cari tidak tersedia atau telah dipindahkan.'}
            </p>
            <Link href="/"
              className="btn"
              style={{ background: 'var(--color-accent)', color: '#fff', padding: '10px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}
            >
              Ke Beranda BEDAIN NEWS
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: (headings.length > 0 || allPages.length > 0) ? '240px 1fr' : '1fr', gap: '32px', alignItems: 'flex-start', maxWidth: '1100px', margin: '0 auto' }} className="static-page-layout">

            {/* Left Sidebar: Table of Contents & Pages Widget */}
            {(headings.length > 0 || allPages.length > 0) && (
              <aside style={{
                position: 'sticky',
                top: '188px',
                background: 'var(--color-bg-secondary)',
                borderRadius: '16px',
                border: '1px solid var(--color-border)',
                borderTop: '4px solid var(--color-accent)',
                padding: '22px 20px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '32px'
              }} className="static-toc-sidebar">
                
                {/* TOC Widget */}
                {headings.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid var(--color-text-accent)' }}>
                      <BookOpen size={16} color="var(--color-text-accent)" />
                      <h3 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-primary)', margin: 0 }}>
                        Daftar Isi
                      </h3>
                    </div>
                    <nav>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {headings.map((heading) => (
                          <li key={heading.id}>
                            <button
                              onClick={() => scrollToHeading(heading.id)}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                background: activeId === heading.id ? 'rgba(var(--color-accent-rgb, 59,130,246), 0.12)' : 'transparent',
                                border: 'none',
                                borderLeft: activeId === heading.id ? '3px solid var(--color-text-accent)' : '3px solid transparent',
                                borderRadius: '0 6px 6px 0',
                                padding: `6px ${heading.level <= 2 ? '10px' : '10px'} 6px ${(heading.level - 1) * 10 + 8}px`,
                                color: activeId === heading.id ? 'var(--color-text-accent)' : 'var(--color-text-secondary)',
                                fontSize: heading.level <= 2 ? '13px' : '12px',
                                fontWeight: heading.level <= 2 ? 600 : 400,
                                cursor: 'pointer',
                                lineHeight: 1.4,
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '4px'
                              }}
                            >
                              {heading.level >= 3 && <ChevronRight size={10} style={{ marginTop: '3px', flexShrink: 0 }} />}
                              {heading.text}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </nav>
                  </div>
                )}

                {/* Pages Widget */}
                {allPages.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid var(--color-text-accent)' }}>
                      <FileText size={16} color="var(--color-text-accent)" />
                      <h3 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-primary)', margin: 0 }}>
                        Informasi
                      </h3>
                    </div>
                    <nav>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {allPages.map((p) => (
                          <li key={p.id}>
                            <Link href={`/page/${p.slug}`}
                              style={{
                                display: 'block',
                                padding: '8px 10px',
                                color: p.slug === slug ? 'var(--color-text-accent)' : 'var(--color-text-secondary)',
                                background: p.slug === slug ? 'rgba(var(--color-accent-rgb, 59,130,246), 0.12)' : 'transparent',
                                borderRadius: '0 6px 6px 0',
                                textDecoration: 'none',
                                fontSize: '13px',
                                fontWeight: p.slug === slug ? 600 : 400,
                                transition: 'all 0.2s ease',
                                borderLeft: p.slug === slug ? '3px solid var(--color-text-accent)' : '3px solid transparent',
                              }}
                            >
                              {p.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </nav>
                  </div>
                )}
              </aside>
            )}

            {/* Main Content */}
            <article style={{
              background: 'var(--color-bg-secondary)',
              borderRadius: '20px',
              border: '1px solid var(--color-border)',
              padding: '44px 48px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
              position: 'relative',
              overflow: 'hidden'
            }} className="static-page-card">
              {/* Decorative top gradient accent */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 50%, #6366f1 100%)'
              }} />

              {/* Header */}
              <header style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '28px', marginBottom: '36px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '50px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-text-accent)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '16px' }}>
                  <ShieldCheck size={14} /> INFORMASI RESMI BEDAIN NEWS
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '2.6rem', fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1.2, margin: 0, flex: 1, fontFamily: 'var(--font-heading)', letterSpacing: '-0.5px' }}>
                    {page.title}
                  </h1>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={handleShare}
                      style={{ 
                        background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', 
                        borderRadius: '10px', padding: '10px 16px', color: 'var(--color-text-primary)', 
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px',
                        fontWeight: 600, transition: 'all 0.2s ease', boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                      }}
                      title="Bagikan Halaman"
                    >
                      <Share2 size={16} color="var(--color-text-accent)" /> <span className="share-btn-text">Bagikan</span>
                    </button>
                    <button
                      onClick={handlePrint}
                      style={{ 
                        background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', 
                        borderRadius: '10px', padding: '10px 16px', color: 'var(--color-text-primary)', 
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px',
                        fontWeight: 600, transition: 'all 0.2s ease', boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                      }}
                      title="Cetak Halaman"
                    >
                      <Printer size={16} color="var(--color-text-accent)" /> <span className="share-btn-text">Cetak</span>
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '20px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>BEDAIN NEWS MEDIA CENTER</span>
                  <span>•</span>
                  <span>Diperbarui: {page.updatedAt?.toDate ? page.updatedAt.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('id-ID')}</span>
                </div>
              </header>

              {/* Content Body */}
              {slug === 'faq' || page.slug === 'faq' ? (
                <FAQSection />
              ) : (
                <div
                  ref={contentRef}
                  className="article-content ql-editor"
                  style={{ fontSize: '1.1rem', lineHeight: 1.9, color: 'var(--color-text-primary)', padding: 0 }}
                  dangerouslySetInnerHTML={{ __html: contentHtml || '<p>Tidak ada konten.</p>' }}
                />
              )}

              {/* Verified Seal Box */}
              <div style={{
                marginTop: '50px',
                padding: '24px 28px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
                borderRadius: '16px',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '18px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
              }}>
                <div style={{
                  width: '46px', height: '46px', borderRadius: '50%', background: 'var(--color-accent, #3b82f6)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)'
                }}>
                  <CheckCircle size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Dokumen Resmi & Terverifikasi <Sparkles size={16} color="#eab308" />
                  </div>
                  <div style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', marginTop: '4px', lineHeight: 1.6 }}>
                    Informasi pada halaman ini dikelola secara langsung oleh Dewan Redaksi dan Manajemen BEDAIN NEWS. Semua pedoman serta kebijakan ditinjau secara berkala sesuai standar pers media siber nasional.
                  </div>
                </div>
              </div>

              {/* Footer inside page */}
              <footer style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                <div>
                  © {new Date().getFullYear()} BEDAIN NEWS. All rights reserved.
                </div>
                <div>
                  <Link href="/" style={{ color: 'var(--color-text-accent)', textDecoration: 'none', fontWeight: 600 }}>
                    Kembali ke Beranda &rarr;
                  </Link>
                </div>
              </footer>
            </article>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default StaticPageView;
