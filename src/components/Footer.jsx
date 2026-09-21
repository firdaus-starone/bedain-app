"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useSiteSettings } from '../hooks/useSiteSettings';

const Footer = () => {
  const [pages, setPages] = useState([]);
  const [footerMenus, setFooterMenus] = useState([]);
  const { settings } = useSiteSettings();

  const renderLogoText = () => {
    if (settings?.siteName) {
      const cleanName = settings.siteName.replace(/\s+/g, '');
      const match = cleanName.match(/^(.*?)(house)$/i);
      if (match) {
        return <>{match[1]}<span>{match[2]}</span></>;
      }
      const parts = settings.siteName.trim().split(/\s+/);
      if (parts.length > 1) {
        return <>{parts[0]}<span>{parts.slice(1).join('')}</span></>;
      }
      return cleanName;
    }
    return <>Bedain<span>News</span></>;
  };

  useEffect(() => {
    const fetchPages = async () => {
      try {
        const q = query(
          collection(db, 'pages'),
          where('status', '==', 'published'),
          where('showInFooter', '==', true)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const orderMap = {
          'faq': 1,
          'tentang-kami': 2,
          'redaksi': 3,
          'pedoman-pemberitaan-media-siber': 4,
          'kebijakan-privasi': 5
        };
        list.sort((a, b) => {
          const orderA = orderMap[a.slug] || 99;
          const orderB = orderMap[b.slug] || 99;
          if (orderA !== orderB) return orderA - orderB;
          return (a.title || '').localeCompare(b.title || '');
        });
        setPages(list);
      } catch (err) {
        console.error("Error loading footer pages:", err);
      }
    };
    fetchPages();
  }, []);

  const [categories, setCategories] = useState([]);
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const q = query(
          collection(db, 'categories'),
          where('active', '==', true)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
        setCategories(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const docRef = doc(db, 'settings', 'menus');
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data().footer && snap.data().footer.length > 0) {
          const validFooter = snap.data().footer;
          const hasAnyLinks = validFooter.some(col => 
            col.title.toLowerCase() === 'kategori' || (col.links && col.links.length > 0)
          );
          if (hasAnyLinks) {
            setFooterMenus(validFooter);
          }
        }
      } catch (err) {
        console.error("Error loading footer menus:", err);
      }
    };
    fetchMenus();
  }, []);

  return (
    <footer className="footer-complex">
      <div className="container">
        <div className="footer-grid">
          {/* Column 1: Logo & Socials */}
          <div className="footer-col footer-col-brand">
            <Link href="/" className="footer-logo" style={{ textDecoration: 'none', display: 'inline-block' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="logo-text" style={{ cursor: 'pointer', fontWeight: 800, fontSize: '1.85rem' }}>
                {renderLogoText()}
              </div>
            </Link>
            <div className="footer-part-of">
              <span>part of</span>
              <div style={{fontSize: '0.8rem', color: 'var(--color-text-tertiary)', letterSpacing: '1px', textTransform: 'uppercase'}}>
                Bagian dari <span className="text-accent" style={{fontWeight: 'bold'}}>bedain</span>network
              </div>
            </div>
            
            <div className="footer-socials-wrapper">
              <span className="socials-title">Connect With Us</span>
              <div className="footer-socials">
                {settings?.contactWhatsapp && (
                  <a href={`https://wa.me/${settings.contactWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="social-icon social-wa" aria-label="WhatsApp" title="WhatsApp">
                    <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.45 15.34L2 22l4.82-1.46A10 10 0 1 0 12 2zm0 18a7.92 7.92 0 0 1-4.06-1.12l-.29-.17-3 .91.93-2.88-.19-.31A7.95 7.95 0 1 1 12 20zm4.56-5.95c-.25-.13-1.48-.73-1.71-.81-.23-.09-.4-.13-.56.13-.17.25-.65.81-.8 98-.15.17-.3.19-.55.06a6.94 6.94 0 0 1-2.04-1.26 7.64 7.64 0 0 1-1.41-1.76c-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.72 4.31 3.81.6.26 1.07.42 1.44.54.61.19 1.16.16 1.6.1.49-.07 1.48-.6 1.69-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.18-.48-.3z"/></svg>
                  </a>
                )}
                {settings?.facebookUrl && (
                  <a href={settings.facebookUrl} target="_blank" rel="noreferrer" className="social-icon social-fb" aria-label="Facebook" title="Facebook">
                    <svg viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                  </a>
                )}
                {settings?.twitterUrl && (
                  <a href={settings.twitterUrl} target="_blank" rel="noreferrer" className="social-icon social-x" aria-label="X (Twitter)" title="X (Twitter)">
                    <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </a>
                )}
                {settings?.instagramUrl && (
                  <a href={settings.instagramUrl} target="_blank" rel="noreferrer" className="social-icon social-ig" aria-label="Instagram" title="Instagram">
                    <svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1.5"/></svg>
                  </a>
                )}
                {settings?.linkedinUrl && (
                  <a href={settings.linkedinUrl} target="_blank" rel="noreferrer" className="social-icon social-in" aria-label="LinkedIn" title="LinkedIn">
                    <svg viewBox="0 0 24 24"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                  </a>
                )}
                {settings?.youtubeUrl && (
                  <a href={settings.youtubeUrl} target="_blank" rel="noreferrer" className="social-icon social-yt" aria-label="YouTube" title="YouTube">
                    <svg viewBox="0 0 24 24"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="white"/></svg>
                  </a>
                )}
                {settings?.tiktokUrl && (
                  <a href={settings.tiktokUrl} target="_blank" rel="noreferrer" className="social-icon social-tt" aria-label="TikTok" title="TikTok">
                    <svg viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
                  </a>
                )}
                {settings?.threadsUrl && (
                  <a href={settings.threadsUrl} target="_blank" rel="noreferrer" className="social-icon social-threads" aria-label="Threads" title="Threads">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21.5c-4.43 0-8-3.57-8-8v-3c0-4.43 3.57-8 8-8s8 3.57 8 8c0 1.25-.43 2.5-1.14 3.42C18.17 14.82 17 15 16 15c-1.33 0-2.5-.9-2.5-2.25V9.5"></path><path d="M13.5 12.5c0 1.93-1.57 3.5-3.5 3.5s-3.5-1.57-3.5-3.5 1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5z"></path></svg>
                  </a>
                )}
              </div>
            </div>
            
            <div className="footer-copyright" style={{ whiteSpace: 'pre-line' }}>
              {settings?.footerText || `Copyright @ ${new Date().getFullYear()} ${settings?.siteName || 'bedainnews.com'}.\nAll rights reserved`}
            </div>
          </div>

          {footerMenus.length > 0 && (
            footerMenus.map(col => {
              const isCategoryCol = col.title.toLowerCase() === 'kategori';
              return (
              <div className={`footer-col ${isCategoryCol ? 'footer-col-kategori' : ''}`} key={col.id}>
                <h3 className="footer-heading">{col.title}</h3>
                {isCategoryCol ? (
                  <div className="footer-links-grid">
                    <ul className="footer-links">
                      {categories.slice(0, Math.ceil(categories.length / 2)).map(cat => (
                        <li key={cat.id}>
                          <a href={`/#kategori-${cat.slug}`}>{cat.name}</a>
                        </li>
                      ))}
                    </ul>
                    <ul className="footer-links">
                      {categories.slice(Math.ceil(categories.length / 2)).map(cat => (
                        <li key={cat.id}>
                          <a href={`/#kategori-${cat.slug}`}>{cat.name}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : col.title.toLowerCase() === 'informasi' ? (
                  <ul className="footer-links">
                    {pages.map(page => (
                      <li key={page.id}>
                        <Link href={`/page/${page.slug}`}>{page.title}</Link>
                      </li>
                    ))}
                    {col.links && col.links.map(link => {
                      const cleanUrl = link.url.replace(/^\/(page\/|halaman\/)?/, '').replace(/\/$/, '').toLowerCase();
                      const linkLabel = (link.label || '').toLowerCase();
                      const isDuplicateWithPages = pages.some(p => {
                        const pageSlug = (p.slug || '').toLowerCase();
                        return cleanUrl === pageSlug || 
                               (linkLabel.includes('redaksi') && pageSlug.includes('redaksi')) ||
                               (linkLabel.includes('pedoman') && pageSlug.includes('pedoman')) ||
                               (linkLabel.includes('tentang') && pageSlug.includes('tentang')) ||
                               (linkLabel.includes('privasi') && pageSlug.includes('privasi')) ||
                               (linkLabel.includes('faq') && pageSlug.includes('faq'));
                      });
                      if (isDuplicateWithPages) return null;
                      return (
                        <li key={link.id}>
                          {link.url.startsWith('/') ? (
                            <Link href={link.url}>{link.label}</Link>
                          ) : (
                            <a href={link.url} target="_blank" rel="noreferrer">{link.label}</a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <ul className="footer-links">
                    {col.links.map(link => (
                      <li key={link.id}>
                        {link.url.startsWith('/') ? (
                          <Link href={link.url}>{link.label}</Link>
                        ) : (
                          <a href={link.url} target="_blank" rel="noreferrer">{link.label}</a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )})
          )}

          {pages.length > 0 && !footerMenus.some(col => col.title.toLowerCase() === 'informasi') && (
            <div className="footer-col" key="auto-informasi-col">
              <h3 className="footer-heading">Informasi</h3>
              <ul className="footer-links">
                {pages.map(page => (
                  <li key={page.id}>
                    <Link href={`/page/${page.slug}`}>{page.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
