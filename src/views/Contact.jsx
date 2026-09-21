import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { 
  Phone, Mail, MapPin, Send, CheckCircle2, AlertCircle, 
  MessageSquare, HelpCircle, Briefcase, Shield, ChevronDown, ChevronUp, Sparkles, Building2, Clock
} from 'lucide-react';

const Contact = () => {
  const { settings } = useSiteSettings();
  const [formData, setFormData] = useState({
    name: '',
    emailOrPhone: '',
    department: 'partnership', // partnership, editorial, correction, technical
    subject: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null
  const [openFaq, setOpenFaq] = useState(null);

  const departments = [
    { id: 'partnership', label: '🤝 Kerja Sama Bisnis & Pasang Iklan Banner', desc: 'Sponsorship, advertorial, banner ads, dan kemitraan strategis.' },
    { id: 'editorial', label: '📰 Redaksi, Liputan & Siaran Pers (Press Release)', desc: 'Undangan liputan acara, pengiriman rilis pers, atau wawancara.' },
    { id: 'correction', label: '⚖️ Hak Jawab & Koreksi Pemberitaan', desc: 'Pengajuan sanggahan, klarifikasi, atau koreksi data artikel.' },
    { id: 'technical', label: '🐛 Masukan & Kendala Teknis Aplikasi', desc: 'Melaporkan bug, error, atau saran pengembangan web BEDAIN NEWS.' }
  ];

  const faqs = [
    {
      q: 'Bagaimana cara memasang iklan banner atau artikel bersponsor di Bedain News?',
      a: 'Anda dapat memilih opsi "Kerja Sama Bisnis & Pasang Iklan Banner" pada formulir di bawah, atau langsung menghubungi tim komersial kami via WhatsApp di nomor resmi redaksi/komersial. Kami menyediakan berbagai ruang iklan promosi mulai dari Header Banner, Sidebar Sticky, hingga In-Article Sponsor Card dengan jangkauan ribuan pembaca setia setiap harinya.'
    },
    {
      q: 'Apakah Bedain News menerima siaran pers (press release) dari instansi atau kampus?',
      a: 'Ya! Kami sangat terbuka menerima kiriman siaran pers dari universitas, perusahaan, startup, maupun organisasi masyarakat. Silakan kirimkan naskah beserta foto dokumentasi resolusi tinggi melalui email ke redaksi@bedainnews.com atau melalui formulir kontak ini.'
    },
    {
      q: 'Bagaimana prosedur menyampaikan hak jawab atau sanggahan berita?',
      a: 'BEDAIN NEWS berkomitmen penuh pada Kode Etik Jurnalistik dan UU Pers. Jika terdapat kekeliruan data atau Anda ingin menyampaikan hak jawab atas suatu pemberitaan, silakan pilih kategori "Hak Jawab & Koreksi Pemberitaan" dengan menyertakan tautan (URL) artikel terkait beserta data klarifikasi resmi.'
    },
    {
      q: 'Apakah saya bisa bergabung menjadi penulis atau jurnalis warga di Bedain News?',
      a: 'Tentu saja! Anda bisa langsung mengakses menu "Kirim Tulisan" di navigasi atas atau mengunjungi halaman /kirim-tulisan untuk mengirimkan opini, esai, atau laporan jurnalisme warga Anda langsung ke tim editor kami.'
    }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.emailOrPhone.trim() || !formData.message.trim()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      await addDoc(collection(db, 'contact_messages'), {
        name: formData.name.trim(),
        emailOrPhone: formData.emailOrPhone.trim(),
        department: formData.department,
        subject: formData.subject.trim() || 'Tanpa Subjek',
        message: formData.message.trim(),
        createdAt: serverTimestamp(),
        status: 'unread'
      });

      setSubmitStatus('success');
      setFormData({
        name: '',
        emailOrPhone: '',
        department: 'partnership',
        subject: '',
        message: ''
      });
    } catch (err) {
      console.error('Error submitting contact message:', err);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-container">
      <SEO 
        title="Hubungi & Kerja Sama Mitra - Bedain News"
        description="Hubungi redaksi BEDAIN NEWS untuk kerja sama bisnis, pemasangan iklan banner, pengiriman siaran pers, liputan, dan pengaduan layanan."
      />
      <Navbar />

      <main className="container" style={{ padding: '40px 0', minHeight: '80vh' }}>
        {/* Hero Header */}
        <div style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderRadius: '24px',
          padding: '44px 36px',
          marginBottom: '40px',
          border: '1px solid var(--color-border)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          background: 'linear-gradient(135deg, var(--color-bg-secondary) 0%, rgba(239, 68, 68, 0.08) 100%)',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: 'var(--color-accent)',
            padding: '6px 16px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            marginBottom: '16px'
          }}>
            <Sparkles size={14} /> PUSAT KOMUNIKASI & KEMITRAAN
          </div>
          
          <h1 style={{
            fontSize: '2.4rem',
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text-primary)',
            margin: '0 0 16px 0',
            lineHeight: 1.2
          }}>
            Hubungi & Bermitra Bersama <span style={{ color: 'var(--color-accent)' }}>BEDAIN NEWS</span>
          </h1>
          <p style={{
            fontSize: '1.05rem',
            color: 'var(--color-text-secondary)',
            maxWidth: '680px',
            margin: '0 auto',
            lineHeight: 1.6
          }}>
            Kami siap menjadi jembatan informasi dan mitra bisnis strategis Anda. Silakan hubungi kami untuk pemasangan iklan, kerja sama media partner, maupun pengiriman siaran pers.
          </p>
        </div>

        {/* Quick Contact Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '24px',
          marginBottom: '48px'
        }}>
          {/* Card 1: WhatsApp */}
          <div style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1.5px solid var(--color-border)',
            borderRadius: '20px',
            padding: '26px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.3s'
          }}>
            <div>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '14px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '18px'
              }}>
                <Phone size={26} />
              </div>
              <h3 style={{ fontSize: '1.2rem', margin: '0 0 8px 0', color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>
                WhatsApp Redaksi & Bisnis
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
                Layanan komunikasi cepat untuk pertanyaan iklan, sponsorship, dan koordinasi liputan darurat.
              </p>
            </div>
            <a
              href={`https://wa.me/${settings?.contactWhatsapp || '6281112345678'}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: '#10b981',
                color: '#fff',
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.9rem',
                textDecoration: 'none',
                transition: 'all 0.2s'
              }}
            >
              <span>Chat WhatsApp ({settings?.contactPhone || '+62 811-1234-5678'})</span>
            </a>
          </div>

          {/* Card 2: Email */}
          <div style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1.5px solid var(--color-border)',
            borderRadius: '20px',
            padding: '26px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.3s'
          }}>
            <div>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '14px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '18px'
              }}>
                <Mail size={26} />
              </div>
              <h3 style={{ fontSize: '1.2rem', margin: '0 0 8px 0', color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>
                Email Resmi Redaksi
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
                Kirimkan proposal kerja sama (*pitch deck*), siaran pers resmi, atau dokumen klarifikasi berita.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a
                href={`mailto:${settings?.contactEmail || 'redaksi@bedainnews.com'}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  textDecoration: 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                📰 {settings?.contactEmail || 'redaksi@bedainnews.com'}
              </a>
            </div>
          </div>

          {/* Card 3: Address / Office */}
          <div style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1.5px solid var(--color-border)',
            borderRadius: '20px',
            padding: '26px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.3s'
          }}>
            <div>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '14px',
                backgroundColor: 'rgba(168, 85, 247, 0.15)',
                color: '#a855f7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '18px'
              }}>
                <Building2 size={26} />
              </div>
              <h3 style={{ fontSize: '1.2rem', margin: '0 0 8px 0', color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>
                Alamat Kantor Redaksi
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '20px', whiteSpace: 'pre-line' }}>
                {settings?.contactAddress || 'Gedung BEDAIN NEWS Digital Hub, Lt. 3\nJl. Jenderal Sudirman, Jakarta Selatan 12190'}
              </p>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.82rem',
              color: 'var(--color-text-secondary)',
              borderTop: '1px solid var(--color-border)',
              paddingTop: '12px'
            }}>
              <Clock size={16} color="var(--color-accent)" style={{ flexShrink: 0 }} />
              <span>Jam Operasional: {settings?.contactHours || 'Senin - Jumat (09:00 - 17:00 WIB)'}</span>
            </div>
          </div>
        </div>

        {/* Form & FAQ Split Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '36px',
          alignItems: 'start'
        }}>
          {/* Left: Contact Form */}
          <div style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1.5px solid var(--color-border)',
            borderRadius: '24px',
            padding: '34px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-primary)',
              margin: '0 0 8px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <MessageSquare size={24} color="var(--color-accent)" /> Kirim Pesan & Pengajuan
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', margin: '0 0 24px 0', lineHeight: 1.5 }}>
              Isi formulir berikut dan tim redaksi atau komersial kami akan merespons pesan Anda paling lambat dalam 1x24 jam kerja.
            </p>

            {submitStatus === 'success' ? (
              <div style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1.5px solid #10b981',
                borderRadius: '16px',
                padding: '24px',
                textAlign: 'center',
                color: '#10b981'
              }}>
                <CheckCircle2 size={44} style={{ margin: '0 auto 12px' }} />
                <h4 style={{ fontSize: '1.15rem', margin: '0 0 8px 0', fontWeight: 800 }}>Pesan Berhasil Terkirim!</h4>
                <p style={{ fontSize: '0.88rem', margin: '0 0 18px 0', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  Terima kasih telah menghubungi BEDAIN NEWS. Tim kami segera meninjau pesan Anda dan akan menghubungi kembali via Email/WhatsApp.
                </p>
                <button
                  onClick={() => setSubmitStatus(null)}
                  style={{
                    backgroundColor: '#10b981',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.88rem'
                  }}
                >
                  Kirim Pesan Lainnya
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                    Tujuan & Kategori Pesan <span style={{ color: 'var(--color-accent)' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {departments.map(dept => (
                      <label
                        key={dept.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '12px 14px',
                          backgroundColor: formData.department === dept.id ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-bg-tertiary)',
                          border: `1px solid ${formData.department === dept.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <input
                          type="radio"
                          name="department"
                          value={dept.id}
                          checked={formData.department === dept.id}
                          onChange={handleChange}
                          style={{ marginTop: '3px', accentColor: 'var(--color-accent)' }}
                        />
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '2px' }}>
                            {dept.label}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                            {dept.desc}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                      Nama Lengkap / Perusahaan <span style={{ color: 'var(--color-accent)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Contoh: Budi Santoso (PT XYZ)"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        backgroundColor: 'var(--color-bg-tertiary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '10px',
                        color: 'var(--color-text-primary)',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                      Email / No. WhatsApp <span style={{ color: 'var(--color-accent)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="emailOrPhone"
                      value={formData.emailOrPhone}
                      onChange={handleChange}
                      placeholder="0812xxxx / email@domain.com"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        backgroundColor: 'var(--color-bg-tertiary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '10px',
                        color: 'var(--color-text-primary)',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                    Subjek / Judul Pesan
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Contoh: Penawaran Sponsorship Banner Ramadan / Siaran Pers Acara Kampus"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      backgroundColor: 'var(--color-bg-tertiary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '10px',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                    Isi Pesan Detail <span style={{ color: 'var(--color-accent)' }}>*</span>
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tuliskan pesan, pertanyaan, atau detail proposal kerja sama Anda di sini..."
                    rows={5}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      backgroundColor: 'var(--color-bg-tertiary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '10px',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {submitStatus === 'error' && (
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #ef4444',
                    borderRadius: '10px',
                    color: '#ef4444',
                    fontSize: '0.86rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <AlertCircle size={18} /> Gagal mengirim pesan. Silakan coba lagi atau langsung hubungi via WhatsApp.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    backgroundColor: isSubmitting ? 'var(--color-text-secondary)' : 'var(--color-accent)',
                    color: '#fff',
                    border: 'none',
                    padding: '14px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    boxShadow: isSubmitting ? 'none' : '0 6px 20px rgba(239, 68, 68, 0.35)'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
                      <span>Mengirim Pesan...</span>
                    </>
                  ) : (
                    <>
                      <span>Kirim Pesan Sekarang</span>
                      <Send size={18} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Right: FAQ Section */}
          <div>
            <h3 style={{
              fontSize: '1.4rem',
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-primary)',
              margin: '0 0 16px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <HelpCircle size={22} color="var(--color-accent)" /> Pertanyaan Umum (FAQ)
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', margin: '0 0 24px 0', lineHeight: 1.5 }}>
              Jawaban cepat seputar kerja sama iklan, pengiriman rilis berita, dan prosedur kemitraan.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    transition: 'all 0.2s'
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    style={{
                      width: '100%',
                      padding: '18px 20px',
                      background: 'transparent',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.94rem',
                      fontWeight: 700
                    }}
                  >
                    <span style={{ flex: 1, paddingRight: '12px', lineHeight: 1.4 }}>{faq.q}</span>
                    {openFaq === idx ? <ChevronUp size={20} color="var(--color-accent)" /> : <ChevronDown size={20} color="var(--color-text-secondary)" />}
                  </button>
                  {openFaq === idx && (
                    <div style={{
                      padding: '0 20px 20px 20px',
                      fontSize: '0.88rem',
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.6,
                      borderTop: '1px dashed var(--color-border)',
                      paddingTop: '14px'
                    }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Extra Info Box */}
            <div style={{
              marginTop: '28px',
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              borderRadius: '16px',
              padding: '22px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <Shield size={32} color="var(--color-accent)" style={{ flexShrink: 0 }} />
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Komitmen Kode Etik BEDAIN NEWS
                </h4>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                  Kami menjaga integritas jurnalistik serta menghormati privasi seluruh mitra dan pembaca sesuai UU Perlindungan Data Pribadi (PDP).
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
