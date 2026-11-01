"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { useI18n } from '../hooks/useI18n';
import LanguageSwitcher from './LanguageSwitcher';

const Footer = () => {
  const router = useRouter();
  const { t, lang } = useI18n();
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

  const getColTitle = (title) => {
    if (!title) return '';
    const clean = title.trim();
    const lower = clean.toLowerCase();
    const hyphenated = lower.replace(/\s+/g, '-');
    const fromDict = t(`footer.cols.${lower}`) || t(`footer.cols.${hyphenated}`);
    if (fromDict && !fromDict.startsWith('footer.cols.')) return fromDict;

    if (lower.includes('jaringan') || lower.includes('media network') || lower.includes('partner')) {
      return lang === 'zh' ? '媒体网络' : lang === 'en' ? 'Media Network' : 'Jaringan Media';
    }
    if (lower.includes('kategori') || lower.includes('category')) {
      return lang === 'zh' ? '分类' : lang === 'en' ? 'Categories' : 'Kategori';
    }
    if (lower.includes('informasi') || lower.includes('info')) {
      return lang === 'zh' ? '信息' : lang === 'en' ? 'Information' : 'Informasi';
    }
    return clean;
  };

  const getLocalizedCategoryName = (cat) => {
    if (!cat) return '';
    const slug = (cat.slug || cat.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || '').trim();
    const name = (cat.name || '').trim();
    const lowerName = name.toLowerCase();

    const fromDict = t(`categories.${slug}`);
    if (fromDict && !fromDict.startsWith('categories.')) return fromDict;

    if (lang === 'en' && cat.name_en) return cat.name_en;
    if (lang === 'zh' && cat.name_zh) return cat.name_zh;

    const catMap = {
      'sosial': { zh: '社会', en: 'Social' },
      'pemerintahan': { zh: '政务', en: 'Government' },
      'kuliner': { zh: '美食', en: 'Culinary' },
      'berita': { zh: '新闻', en: 'News' },
      'ekonomi': { zh: '经济', en: 'Economy' },
      'bisnis': { zh: '商业', en: 'Business' },
      'ekonomi-bisnis': { zh: '经济与商业', en: 'Economy & Business' },
      'budaya': { zh: '文化', en: 'Culture' },
      'pendidikan': { zh: '教育', en: 'Education' },
      'sorotan': { zh: '焦点', en: 'Focus' },
      'sport': { zh: '体育', en: 'Sports' },
      'olahraga': { zh: '体育', en: 'Sports' },
      'lifestyle': { zh: '生活方式', en: 'Lifestyle' },
      'gaya-hidup': { zh: '生活方式', en: 'Lifestyle' },
      'pariwisata': { zh: '旅游', en: 'Tourism' },
      'wisata': { zh: '旅游', en: 'Tourism' },
      'gadget': { zh: '数码科技', en: 'Gadgets' },
      'teknologi': { zh: '科技', en: 'Technology' },
      'hukum-kriminal': { zh: '法律与犯罪', en: 'Law & Crime' },
      'hukum': { zh: '法律', en: 'Law' },
      'kriminal': { zh: '犯罪', en: 'Crime' },
      'politik': { zh: '政治', en: 'Politics' },
      'opini': { zh: '观点', en: 'Opinion' },
      'kesehatan': { zh: '健康', en: 'Health' },
      'otomotif': { zh: '汽车', en: 'Automotive' },
      'internasional': { zh: '国际', en: 'International' },
      'daerah': { zh: '地方', en: 'Regional' },
      'hiburan': { zh: '娱乐', en: 'Entertainment' },
      'parlemen': { zh: '议会', en: 'Parliament' },
      'kementerian': { zh: '部委', en: 'Ministry' },
      'meja-redaksi': { zh: '编辑部', en: 'Editorial Desk' },
      'video': { zh: '视频', en: 'Video' },
      'properti': { zh: '房产', en: 'Property' }
    };

    const matched = catMap[slug] || catMap[lowerName];
    if (matched && matched[lang]) {
      return matched[lang];
    }
    return name;
  };

  const getLocalizedPageTitle = (page) => {
    if (!page) return '';
    const slug = (page.slug || '').toLowerCase();
    const title = (page.title || '').toLowerCase();

    if (lang === 'zh') {
      if (slug === 'faq' || title.includes('faq') || title.includes('bantuan')) return '常见问题与帮助 (FAQ)';
      if (slug === 'tentang-kami' || title.includes('tentang kami') || title.includes('profil')) return '关于我们 - Bedain News 简介';
      if (slug === 'redaksi' || title.includes('redaksi') || title.includes('susunan tim')) return '编辑部与团队架构';
      if (slug === 'kebijakan-privasi' || title.includes('privasi') || title.includes('privacy')) return '隐私政策 (Privacy Policy)';
      if (slug === 'kontak' || title.includes('kontak') || title.includes('kemitraan') || title.includes('hubungi')) return '联系我们与商务合作';
      if (slug === 'pedoman-pemberitaan-media-siber' || title.includes('pedoman') || title.includes('siber')) return '网络媒体报道准则';
    } else if (lang === 'en') {
      if (slug === 'faq' || title.includes('faq') || title.includes('bantuan')) return 'FAQ & Help Center';
      if (slug === 'tentang-kami' || title.includes('tentang kami') || title.includes('profil')) return 'About Us - Bedain News Profile';
      if (slug === 'redaksi' || title.includes('redaksi') || title.includes('susunan tim')) return 'Editorial Board & Team';
      if (slug === 'kebijakan-privasi' || title.includes('privasi') || title.includes('privacy')) return 'Privacy Policy';
      if (slug === 'kontak' || title.includes('kontak') || title.includes('kemitraan') || title.includes('hubungi')) return 'Contact & Partnership';
      if (slug === 'pedoman-pemberitaan-media-siber' || title.includes('pedoman') || title.includes('siber')) return 'Cyber Media News Guidelines';
    }

    return page.title || '';
  };

  const getLocalizedLinkText = (link) => {
    if (!link) return '';
    const label = link.label || '';
    const lower = label.toLowerCase();
    const url = (link.url || '').toLowerCase();

    if (lang === 'zh') {
      if (url.includes('faq') || lower.includes('faq') || lower.includes('bantuan')) return '常见问题与帮助 (FAQ)';
      if (url.includes('tentang') || lower.includes('tentang')) return '关于我们 - Bedain News 简介';
      if (url.includes('redaksi') || lower.includes('redaksi')) return '编辑部与团队架构';
      if (url.includes('privasi') || lower.includes('privacy') || lower.includes('privasi')) return '隐私政策 (Privacy Policy)';
      if (url.includes('kontak') || lower.includes('kontak') || lower.includes('hubungi')) return '联系我们与商务合作';
      if (url.includes('pedoman') || lower.includes('pedoman') || lower.includes('siber')) return '网络媒体报道准则';
    } else if (lang === 'en') {
      if (url.includes('faq') || lower.includes('faq') || lower.includes('bantuan')) return 'FAQ & Help Center';
      if (url.includes('tentang') || lower.includes('tentang')) return 'About Us - Bedain News Profile';
      if (url.includes('redaksi') || lower.includes('redaksi')) return 'Editorial Board & Team';
      if (url.includes('privasi') || lower.includes('privacy') || lower.includes('privasi')) return 'Privacy Policy';
      if (url.includes('kontak') || lower.includes('kontak') || lower.includes('hubungi')) return 'Contact & Partnership';
      if (url.includes('pedoman') || lower.includes('pedoman') || lower.includes('siber')) return 'Cyber Media News Guidelines';
    }

    return label;
  };

  const renderCopyright = () => {
    const currentYear = new Date().getFullYear();
    const siteName = settings?.siteName || 'Bedain News';
    if (lang === 'zh') {
      return `© ${currentYear} ${siteName}. 保留所有权利。`;
    }
    if (lang === 'en') {
      return `© ${currentYear} ${siteName}. All rights reserved.`;
    }
    return settings?.footerText || `© ${currentYear} ${siteName}. Semua hak dilindungi.`;
  };

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
              <div style={{fontSize: '0.8rem', color: 'var(--color-text-tertiary)', letterSpacing: '1px', textTransform: 'uppercase'}}>
                {t('footer.part_of') || (lang === 'zh' ? '所属' : lang === 'en' ? 'PART OF' : 'BAGIAN DARI')} <span className="text-accent" style={{fontWeight: 'bold'}}>bedain</span>network
              </div>
            </div>
            
            <div className="footer-socials-wrapper">
              <span className="socials-title">{t('footer.connect_with_us') || (lang === 'zh' ? '关注我们' : lang === 'en' ? 'Connect With Us' : 'Ikuti Kami')}</span>
              <div className="footer-socials">
                {(settings?.waChannelUrl || settings?.contactWhatsapp) && (
                  <a 
                    href={settings?.waChannelUrl || `https://wa.me/${settings?.contactWhatsapp?.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="social-icon social-wa" 
                    aria-label="WhatsApp Channel" 
                    title={settings?.waChannelUrl ? "Saluran WhatsApp Bedain News" : "WhatsApp"}
                  >
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
            
            <div style={{ margin: '16px 0 12px 0' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                {lang === 'en' ? 'Language / Bahasa' : lang === 'zh' ? '语言 / Language' : 'Bahasa / Language'}
              </div>
              <LanguageSwitcher variant="inline" />
            </div>
            
            <div className="footer-copyright" style={{ whiteSpace: 'pre-line' }}>
              {renderCopyright()}
            </div>
          </div>

          {footerMenus.length > 0 && (
            footerMenus.map(col => {
              const isCategoryCol = col.title.toLowerCase() === 'kategori';
              
              // Hide column if it's not a special column and has no links
              if (!isCategoryCol && col.title.toLowerCase() !== 'informasi' && (!col.links || col.links.length === 0)) {
                return null;
              }

              return (
              <div className={`footer-col ${isCategoryCol ? 'footer-col-kategori' : ''}`} key={col.id}>
                <h3 className="footer-heading">{getColTitle(col.title)}</h3>
                {isCategoryCol ? (
                  <div className="footer-links-grid">
                    <ul className="footer-links">
                      {categories.slice(0, Math.ceil(categories.length / 2)).map(cat => (
                        <li key={cat.id}>
                          <a 
                            href={`/#kategori-${cat.slug}`}
                            onClick={e => {
                              const targetId = `kategori-${cat.slug}`;
                              const el = document.getElementById(targetId);
                              if (el) {
                                e.preventDefault();
                                el.scrollIntoView({ behavior: 'smooth' });
                              } else {
                                e.preventDefault();
                                router.push(`/cari?q=${encodeURIComponent(cat.name)}`);
                              }
                            }}
                          >
                            {getLocalizedCategoryName(cat)}
                          </a>
                        </li>
                      ))}
                    </ul>
                    <ul className="footer-links">
                      {categories.slice(Math.ceil(categories.length / 2)).map(cat => (
                        <li key={cat.id}>
                          <a 
                            href={`/#kategori-${cat.slug}`}
                            onClick={e => {
                              const targetId = `kategori-${cat.slug}`;
                              const el = document.getElementById(targetId);
                              if (el) {
                                e.preventDefault();
                                el.scrollIntoView({ behavior: 'smooth' });
                              } else {
                                e.preventDefault();
                                router.push(`/cari?q=${encodeURIComponent(cat.name)}`);
                              }
                            }}
                          >
                            {getLocalizedCategoryName(cat)}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : col.title.toLowerCase() === 'informasi' ? (
                  <ul className="footer-links">
                    {pages.map(page => (
                      <li key={page.id}>
                        <Link href={`/page/${page.slug}`}>{getLocalizedPageTitle(page)}</Link>
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
                            <Link href={link.url}>{getLocalizedLinkText(link)}</Link>
                          ) : (
                            <a href={link.url} target="_blank" rel="noreferrer">{getLocalizedLinkText(link)}</a>
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
                          <Link href={link.url}>{getLocalizedLinkText(link)}</Link>
                        ) : (
                          <a href={link.url} target="_blank" rel="noreferrer">{getLocalizedLinkText(link)}</a>
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
              <h3 className="footer-heading">{getColTitle('informasi')}</h3>
              <ul className="footer-links">
                {pages.map(page => (
                  <li key={page.id}>
                    <Link href={`/page/${page.slug}`}>{getLocalizedPageTitle(page)}</Link>
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
