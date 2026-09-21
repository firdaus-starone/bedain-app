"use client";
import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Wand2, Bot, Check, Copy, RefreshCw, Key, X, 
  ArrowRight, FileText, Type, Search, Lightbulb, ExternalLink,
  AlertCircle, ShieldCheck
} from 'lucide-react';

const AIAssistantModal = ({ 
  isOpen, 
  onClose, 
  currentTitle = '', 
  currentExcerpt = '', 
  currentContent = '',
  onApplyTitle,
  onApplyExcerpt,
  onApplyContent,
  onApplySEO,
  inline = false
}) => {
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [activeTab, setActiveTab] = useState('grammar'); // grammar, headlines, excerpt, seo, expand, custom
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [parsedHeadlines, setParsedHeadlines] = useState([]);
  const [parsedSEO, setParsedSEO] = useState(null);
  const [parsedAntiplagiat, setParsedAntiplagiat] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState('');

  // Load API key from env or localStorage
  useEffect(() => {
    const localKey = localStorage.getItem('bedain_gemini_api_key');
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (localKey && localKey.trim() !== '') {
      setApiKey(localKey);
    } else if (envKey && envKey !== 'YOUR_GEMINI_API_KEY') {
      setApiKey(envKey);
    }
  }, [isOpen]);

  const saveApiKey = (key) => {
    setApiKey(key);
    localStorage.setItem('bedain_gemini_api_key', key);
    setShowKeyInput(false);
  };

  // Strip HTML tags for clean text analysis
  const stripHtml = (html) => {
    if (!html) return '';
    // Replace <br> and </p> with newlines to preserve spacing
    let htmlWithNewlines = html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n');
    const tmp = document.createElement('DIV');
    tmp.innerHTML = htmlWithNewlines;
    return tmp.textContent || tmp.innerText || '';
  };

  const getCleanArticleText = () => {
    const cleanContent = stripHtml(currentContent);
    return `Judul Saat Ini: ${currentTitle || '(Belum ada judul)'}\nRingkasan Saat Ini: ${currentExcerpt || '(Belum ada ringkasan)'}\nIsi Berita:\n${cleanContent || '(Belum ada isi berita)'}`;
  };

  // Call Google Gemini API (gemini-1.5-flash)
  const callGeminiAPI = async (promptText, targetTab = activeTab) => {
    setLoading(true);
    setError('');
    setResult('');
    setParsedHeadlines([]);
    setParsedSEO(null);
    setParsedAntiplagiat(null);
    setApplied('');

    const effectiveKey = apiKey.trim() || import.meta.env.VITE_GEMINI_API_KEY;

    if (!effectiveKey || effectiveKey === 'YOUR_GEMINI_API_KEY') {
      // Demo / Simulation mode when no API key is set yet
      setTimeout(() => {
        handleDemoResponse(targetTab);
        setLoading(false);
      }, 1200);
      return;
    }

    try {
      const modelsToTry = [
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-2.0-flash-exp',
        'gemini-2.0-flash',
        'gemini-pro'
      ];

      const requestBody = JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
        ]
      });

      let response;
      let data;
      let success = false;

      // 1. Coba daftar model standar terlebih dahulu
      for (const modelName of modelsToTry) {
        try {
          response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${effectiveKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: requestBody
            }
          );
          data = await response.json();
          if (response.ok && !data.error && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            success = true;
            break;
          }
        } catch (e) {
          console.warn(`AIAssistantModal model ${modelName} gagal dipanggil:`, e);
        }
      }

      // 2. Jika semua model standar gagal, lakukan auto-discovery model loop
      if (!success) {
        console.log('Model standar gagal/tidak tersedia di AIAssistantModal, mencoba auto-discovery model...');
        try {
          const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${effectiveKey}`);
          const listData = await listResponse.json();
          if (listData.models && listData.models.length > 0) {
            const availableModels = listData.models
              .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
              .filter(m => !m.name.includes('vision') && !m.name.includes('embedding') && !m.name.includes('aqa'))
              .sort((a, b) => {
                const score = (name) => {
                  if (name.includes('1.5-pro')) return 10;
                  if (name.includes('1.5-flash')) return 9;
                  if (name.includes('2.0-flash')) return 8;
                  if (name.includes('gemini-pro')) return 7;
                  if (name.includes('2.5')) return 1;
                  return 5;
                };
                return score(b.name) - score(a.name);
              });

            for (const model of availableModels) {
              const resolvedModelName = model.name.replace('models/', '');
              try {
                response = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModelName}:generateContent?key=${effectiveKey}`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: requestBody
                  }
                );
                data = await response.json();
                if (response.ok && !data.error && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                  console.log('Auto-discovery AIAssistantModal berhasil dengan model:', resolvedModelName);
                  success = true;
                  break;
                }
              } catch (err) {
                console.warn(`Auto-discovery model ${resolvedModelName} gagal:`, err);
              }
            }
          }
        } catch (err) {
          console.error('Gagal mengambil daftar model auto-discovery:', err);
        }
      }

      if (!success || !response?.ok || data?.error) {
        throw new Error(data?.error?.message || 'Gagal menghubungi Gemini API');
      }

      let outputText = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
      
      const finishReason = data?.candidates?.[0]?.finishReason;
      if (finishReason === 'MAX_TOKENS') {
        outputText += '\n\n<p><i>(Peringatan: Teks terpotong karena melampaui batas maksimum kata AI. Silakan pecah artikel menjadi 2 bagian jika terlalu panjang.)</i></p>';
      } else if (finishReason === 'SAFETY') {
        outputText += '\n\n<p><i>(Peringatan: Teks terpotong oleh filter keamanan Google.)</i></p>';
      }

      if (!outputText) {
        throw new Error('Respons AI kosong. Silakan coba lagi.');
      }

      processAIResponse(targetTab, outputText);
    } catch (err) {
      console.error('Gemini API Error:', err);
      setError(`Kesalahan API: ${err.message}. Memuat mode simulasi cerdas sebagai alternatif.`);
      handleDemoResponse(targetTab);
    } finally {
      setLoading(false);
    }
  };

  const cleanArticleContent = (rawText) => {
    if (!rawText) return '';
    let cleaned = rawText
      .replace(/\[Catatan.*?\]/gis, '')
      .replace(/\(Catatan.*?\)/gis, '')
      .replace(/^Tentu, berikut.*?:\n+/gis, '')
      .replace(/^Berikut adalah.*?:\n+/gis, '')
      .trim();

    // Fix glued sentences where punctuation is immediately followed by a capital letter without space (e.g., '.Pelimpahan' -> '. Pelimpahan')
    cleaned = cleaned.replace(/([a-z0-9])\.\s*([A-Z])/g, '$1. $2');

    // If text already has <p> tags, clean and return
    if (cleaned.includes('<p>')) {
      return cleaned;
    }

    // Split by newlines (single or multiple) into distinct paragraphs
    const paragraphs = cleaned
      .split(/\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (paragraphs.length > 0) {
      return paragraphs.map(p => `<p>${p}</p>`).join('');
    }
    return `<p>${cleaned}</p>`;
  };


  const processAIResponse = (tab, text) => {
    setResult(text);

    if (tab === 'headlines') {
      // Parse numbered lines or bullet points into array
      const lines = text
        .split('\n')
        .map(l => l.replace(/^[0-9]+[\.\)]\s*|^[\-\*\•]\s*/, '').replace(/^["']|["']$/g, '').trim())
        .filter(l => l.length > 10);
      setParsedHeadlines(lines.slice(0, 5));
    } else if (tab === 'seo') {
      // Try parsing SEO title and description
      const lines = text.split('\n').filter(Boolean);
      let title = currentTitle;
      let desc = '';
      lines.forEach(l => {
        if (l.toLowerCase().includes('title') || l.toLowerCase().includes('judul seo')) {
          title = l.replace(/^.*?:/i, '').replace(/["']/g, '').trim();
        } else if (l.toLowerCase().includes('desc') || l.toLowerCase().includes('deskripsi')) {
          desc = l.replace(/^.*?:/i, '').replace(/["']/g, '').trim();
        }
      });
      if (!desc && lines.length >= 2) {
        title = lines[0].replace(/^.*?:/i, '').trim();
        desc = lines[1].replace(/^.*?:/i, '').trim();
      }
      setParsedSEO({ seoTitle: title, seoDescription: desc || text.substring(0, 160) });
    } else if (tab === 'antiplagiat') {
      try {
        const jsonStr = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonStr);
        setParsedAntiplagiat({ title: data.judul, excerpt: data.ringkasan, content: data.isi });
      } catch (e) {
        setResult(text);
      }
    }
  };

  const handleDemoResponse = (tab) => {
    const cleanText = stripHtml(currentContent) || 'Berita Bedain News terbaru mengenai kebijakan dan inovasi nasional.';
    const activeTitle = currentTitle || 'Topik Berita Terkini';
    
    if (tab === 'grammar') {
      setResult(
        cleanText
          .replace(/\bnggak\b|\bgak\b|\bga\b/gi, 'tidak')
          .replace(/\bbikin\b/gi, 'membuat')
          .replace(/\bkayak\b/gi, 'seperti')
      );
    } else if (tab === 'rewrite') {
      setResult(
        cleanText
          .split('. ')
          .map((sentence, i) => i % 2 === 0 ? sentence + '.<br><br>' : sentence + '.')
          .join(' ')
      );
    } else if (tab === 'summarize') {
      setResult(
        `<p>${cleanText.substring(0, Math.max(100, cleanText.length / 2))}...</p><p>Kesimpulannya, artikel ini telah diringkas secara otomatis.</p>`
      );
    } else if (tab === 'headlines') {
      const h1 = `${activeTitle}: Fakta dan Kronologi Lengkap`;
      const h2 = `Dampak Mengejutkan dari ${activeTitle} Bagi Masyarakat`;
      const h3 = `Analisis Pakar: Di Balik Ramainya Isu ${activeTitle}`;
      setParsedHeadlines([h1, h2, h3]);
      setResult(`1. ${h1}\n2. ${h2}\n3. ${h3}\n\n(Peringatan: Ini adalah Mode Simulasi karena API Key belum diatur)`);
    } else if (tab === 'excerpt') {
      const excerptText = cleanText.substring(0, 180) + '... Liputan mendalam Bedain News menyoroti berbagai aspek krusial serta tanggapan resmi para pemangku kepentingan.';
      setResult(excerptText);
    } else if (tab === 'seo') {
      const seoTitle = (activeTitle).substring(0, 60);
      const seoDesc = cleanText.substring(0, 155) + '...';
      setParsedSEO({ seoTitle, seoDescription: seoDesc });
      setResult(`SEO Title: ${seoTitle}\nSEO Description: ${seoDesc}\n\n(Mode Simulasi)`);
    } else if (tab === 'antiplagiat') {
      setParsedAntiplagiat({
        title: activeTitle + ' (Versi Anti-Plagiasi)',
        excerpt: cleanText.substring(0, 50) + '... (Versi Anti-Plagiasi)',
        content: `<p>${cleanText}</p><p><i>(Teks di atas telah diparafrase dan ditulis ulang sepenuhnya oleh AI agar 100% bebas plagiasi. Ini adalah mode simulasi.)</i></p>`
      });
      setResult('Berhasil disimulasikan.');
    } else {
      setResult(
        `${cleanText}\n\nLebih lanjut, berbagai pengamat menilai langkah ini memberikan momentum strategis bagi keberlanjutan program jangka panjang. Masyarakat diharapkan dapat berpartisipasi aktif dalam memantau perkembangan terkini melalui kanal resmi Bedain News.`
      );
    }
  };

  const runAssistant = (tabType, customTextOverride = null) => {
    setActiveTab(tabType);
    const articleInfo = getCleanArticleText();
    const effectiveCustomText = (customTextOverride || customPrompt || 'Perbaiki tata bahasa dan lengkapi analisis liputan berita ini agar lebih tajam, lugas, dan mendalam').trim();

    let prompt = '';
    switch (tabType) {
      case 'grammar':
        prompt = `Bertindaklah sebagai Editor Kepala Jurnalistik Media Nasional Indonesia. Perbaiki tata bahasa, ejaan (PUEBI/KBBI), struktur kalimat, dan tanda baca dari teks berita berikut agar lugas, baku, tajam, dan profesional. ATURAN WAJIB:\n1. PERTAHANKAN SELURUH PANJANG DAN KELENGKAPAN INFORMASI BERITA (JANGAN DIRINGKAS ATAU DIPOTONG).\n2. TULISKAN HASILNYA DALAM FORMAT HTML DENGAN MENGGUNAKAN TAG <p> dan </p> UNTUK SETIAP PARAGRAF.\n3. Jangan sertakan catatan, komentar pendahuluan, atau penjelasan apapun di dalam respons. Hanya kembalikan artikel hasil perbaikan dalam tag <p>:\n\n${articleInfo}`;
        break;
      case 'headlines':
        prompt = `Bertindaklah sebagai Pakar SEO & Editor Berita Media Nasional. Berdasarkan berita berikut, buatkan 3 pilihan Judul Berita (Headline) yang sangat menarik, spesifik, akurat, dan mencerminkan inti atau fakta utama dari berita tersebut. HINDARI menggunakan template generik seperti "Fakta Lengkap:" atau "Analisis Mendalam:". Judul harus memicu rasa penasaran tanpa clickbait murahan, serta berpotensi tinggi masuk Google News & viral. Tuliskan HANYA dalam format daftar bernomor 1 sampai 3 tanpa penjelasan lain:\n\n${articleInfo}`;
        break;
      case 'excerpt':
        prompt = `Bertindaklah sebagai Editor Berita Senior. Buatkan ringkasan inti berita (lead / excerpt) sebanyak 2 kalimat (maksimal 30 kata) yang spesifik menyebutkan subjek/tokoh utama, fakta penting, dan memikat untuk dibaca. Hindari ringkasan yang terlalu generik:\n\n${articleInfo}`;
        break;
      case 'seo':
        prompt = `Bertindaklah sebagai Pakar SEO Media Siber. Berdasarkan berita berikut, buatkan:\n1. SEO Title (Maksimal 60 karakter)\n2. SEO Description / Meta Description (Maksimal 155 karakter)\n\nTuliskan dengan format:\nSEO Title: [judul]\nSEO Description: [deskripsi]\n\n${articleInfo}`;
        break;
      case 'expand':
        prompt = `Bertindaklah sebagai Jurnalis Senior. Kembangkan dan lengkapi narasi berita berikut agar lebih kaya informasi, mengalir rapi, dan komprehensif dengan menambahkan analisis konteks jurnalistik yang relevan. ATURAN WAJIB:\n1. ARTIKEL HARUS MENJADI LEBIH PANJANG DAN MENDALAM. JANGAN PERNAH MERINGKAS ARTIKEL.\n2. TULISKAN HASILNYA DALAM FORMAT HTML DENGAN MENGGUNAKAN TAG <p> dan </p> UNTUK SETIAP PARAGRAF.\n3. Jangan sertakan catatan atau komentar pendahuluan AI, berikan langsung teks artikel hasil pengembangan dalam tag <p>:\n\n${articleInfo}`;
        break;
      case 'rewrite':
        prompt = `Bertindaklah sebagai Editor Jurnalistik Profesional. Perbaiki teks berita berikut sesuai aturan penulisan (PUEBI/KBBI) dan buat bahasanya menjadi lebih memikat dan menarik bagi pembaca. TUGAS UTAMA: Jika terdapat kalimat atau paragraf yang terlalu panjang, PECAH dan susun ulang menjadi beberapa paragraf (alinea) baru. Pastikan setiap paragraf berisi sekitar 30 hingga 50 kata agar sangat nyaman dibaca di layar HP.\n\nATURAN WAJIB:\n1. PERTAHANKAN SELURUH DETAIL INFORMASI (JANGAN DIRINGKAS, HANYA DIPERBAIKI DAN DIPANJANGKAN).\n2. TULISKAN HASILNYA DALAM FORMAT HTML DENGAN MENGGUNAKAN TAG <p> dan </p> UNTUK SETIAP PARAGRAF.\n3. Jangan sertakan catatan, komentar pendahuluan, atau penjelasan apapun di dalam respons. Hanya kembalikan teks hasil perbaikan dalam tag <p>:\n\n${articleInfo}`;
        break;
      case 'summarize':
        prompt = `Bertindaklah sebagai Editor Berita Senior. Ringkas artikel berita yang bertele-tele berikut menjadi tulisan yang padat, lugas, ringkas, dan to the point tanpa menghilangkan substansi atau fakta utama. Buang kalimat-kalimat pengulangan atau basa-basi yang tidak perlu. ATURAN WAJIB:\n1. TULISKAN HASILNYA DALAM FORMAT HTML DENGAN MENGGUNAKAN TAG <p> dan </p> UNTUK SETIAP PARAGRAF.\n2. Pastikan selalu ada spasi setelah tanda baca titik (.) atau koma (,).\n3. Jangan sertakan catatan, komentar pendahuluan, atau penjelasan apapun di dalam respons. Hanya kembalikan artikel hasil ringkasan dalam tag <p>:\n\n${articleInfo}`;
        break;
      case 'antiplagiat':
        prompt = `Bertindaklah sebagai Editor Senior Jurnalistik Bedain News. Tulis ulang (parafrase) seluruh teks berita berikut secara menyeluruh agar 100% UNIK, BEBAS PLAGIASI, dan lolos uji orisinalitas di mesin pencari (SEO-friendly). Gunakan gaya bahasa jurnalistik modern yang khas Bedain News. ATURAN WAJIB:\n1. PERTAHANKAN SELURUH FAKTA DAN DATA (JANGAN MENGUBAH MAKNA ATAU MERINGKAS TERLALU PENDEK).\n2. ROMBAK TOTAL STRUKTUR KALIMAT DAN PEMILIHAN KATA.\n3. KEMBALIKAN DALAM FORMAT JSON VALID DENGAN STRUKTUR TEPAT SEPERTI INI: {"judul": "Judul Baru yang Menggugah (Maks 70 karakter)", "ringkasan": "Ringkasan padat dan jelas (Maksimal 2 kalimat)", "isi": "<p>paragraf pertama berita hasil parafrase...</p><p>paragraf kedua...</p>"}.\n4. Jangan sertakan markdown \`\`\`json, berikan teks JSON murni saja agar bisa langsung diproses sistem:\n\n${articleInfo}`;
        break;
      case 'custom':
        prompt = `Bertindaklah sebagai Asisten AI Redaksi Berita Bedain News. Instruksi khusus dari Editor: "${effectiveCustomText}". ATURAN WAJIB:\n1. JANGAN MEMANGKAS ATAU MERINGKAS ARTIKEL KECUALI DIMINTA DALAM INSTRUKSI. PERTAHANKAN SELURUH ISI BERITA.\n2. TULISKAN HASILNYA DALAM FORMAT HTML DENGAN MENGGUNAKAN TAG <p> dan </p> UNTUK SETIAP PARAGRAF.\n3. Jangan sertakan catatan AI di dalam respons, berikan langsung teks hasilnya dalam tag <p>:\n\nBahan berita saat ini:\n${articleInfo}`;
        break;
      default:
        return;
    }

    callGeminiAPI(prompt, tabType);
  };

  const handleCopyText = (txt) => {
    navigator.clipboard.writeText(txt || result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const overlayStyle = inline ? {
    width: '100%',
    marginBottom: '24px'
  } : {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(10, 10, 15, 0.8)',
    backdropFilter: 'blur(12px)',
    zIndex: 99999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  };

  const containerStyle = inline ? {
    background: 'var(--color-bg-secondary)',
    border: '1px solid rgba(230, 57, 70, 0.3)',
    borderRadius: '16px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 30px rgba(0,0,0,0.4), 0 0 20px rgba(230, 57, 70, 0.05)',
    overflow: 'hidden'
  } : {
    background: 'var(--color-bg-secondary)',
    border: '1px solid rgba(230, 57, 70, 0.3)',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '820px',
    maxHeight: '88vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 60px rgba(0,0,0,0.65), 0 0 40px rgba(230, 57, 70, 0.15)',
    overflow: 'hidden'
  };

  return (
    <div style={overlayStyle}>
      <div style={containerStyle}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, rgba(230, 57, 70, 0.18), rgba(255, 138, 101, 0.08))',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--color-accent), #ff8a65)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', boxShadow: '0 4px 14px rgba(230, 57, 70, 0.35)'
            }}>
              <Sparkles size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                ✨ Bedain AI Writing Assistant
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                Powered by Google Gemini AI — Asisten Cerdas Editorial & Jurnalistik
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              title="Pengaturan API Key Gemini"
              style={{
                background: apiKey ? 'rgba(74, 222, 128, 0.15)' : 'rgba(255, 193, 7, 0.15)',
                color: apiKey ? '#4ade80' : '#ffc107',
                border: `1px solid ${apiKey ? '#4ade8055' : '#ffc10755'}`,
                padding: '6px 12px',
                borderRadius: '999px',
                fontSize: '11.5px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Key size={14} />
              {apiKey ? 'API Key Aktif' : 'Atur API Key'}
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                color: 'var(--color-text-secondary)',
                width: '36px', height: '36px',
                borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Optional Gemini API Key Configuration Panel */}
        {showKeyInput && (
          <div style={{
            padding: '16px 24px',
            background: 'var(--color-bg-tertiary)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Google Gemini API Key (Opsional)
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '12px', color: 'var(--color-accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                Dapatkan API Key Gratis <ExternalLink size={12} />
              </a>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="password"
                placeholder="Masukkan API key AI Studio Anda (AIza...)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  fontSize: '13px'
                }}
              />
              <button
                onClick={() => saveApiKey(apiKey)}
                style={{
                  background: 'var(--color-accent)',
                  color: '#fff',
                  border: 'none',
                  padding: '0 18px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Simpan
              </button>
            </div>
            <span style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>
              Jika dikosongkan, AI Assistant akan berjalan dalam <b>Mode Simulasi Cerdas Bedain</b> sehingga tetap dapat diuji coba tanpa hambatan.
            </span>
          </div>
        )}

        {/* Feature Navigation Tabs */}
        <div style={{
          padding: '14px 24px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          background: 'var(--color-bg-primary)'
        }}>
          {[
            { id: 'antiplagiat', label: 'Bebas Plagiasi', icon: ShieldCheck },
            { id: 'grammar', label: 'Perbaiki Bahasa (PUEBI)', icon: Wand2 },
            { id: 'rewrite', label: 'Rapikan & Pecah Paragraf', icon: Sparkles },
            { id: 'headlines', label: '3 Saran Judul Menarik', icon: Type },
            { id: 'excerpt', label: 'Ringkasan (Excerpt)', icon: FileText },
            { id: 'seo', label: 'SEO Metadata', icon: Search },
            { id: 'expand', label: 'Perkaya Paragraf', icon: Lightbulb },
            { id: 'summarize', label: 'Ringkas Artikel', icon: Sparkles },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => runAssistant(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  background: isActive ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                  color: isActive ? '#fff' : 'var(--color-text-primary)',
                  border: isActive ? 'none' : '1px solid var(--color-border)',
                  fontWeight: isActive ? 700 : 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Custom Prompt Bar + Quick Suggestion Chips */}
        <div style={{
          padding: '14px 24px',
          background: 'var(--color-bg-tertiary)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bot size={18} style={{ color: 'var(--color-accent)' }} />
            <input
              type="text"
              placeholder="Ketik instruksi khusus AI (cth: 'Buat paragraf penutup dramatis', 'Ubah gaya bahasa')..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  runAssistant('custom');
                }
              }}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-primary)',
                fontSize: '13.5px',
                outline: 'none'
              }}
            />
            <button
              onClick={() => runAssistant('custom')}
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, var(--color-accent), #ff8a65)',
                color: '#fff',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(230, 57, 70, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Wand2 size={15} /> Minta AI
            </button>
          </div>

          {/* Quick Suggestion Prompt Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Coba Cepat:</span>
            {[
              'Buat paragraf penutup yang dramatis dan menarik',
              'Ubah gaya bahasa menjadi lebih lugas & profesional',
              'Tambahkan sudut pandang analisis dampak masyarakat',
              'Ringkas paragraf pertama agar lebih memikat pembaca'
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setCustomPrompt(chip);
                  runAssistant('custom', chip);
                }}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '11.5px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                ⚡ {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{
          flex: 1,
          padding: '24px',
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxWidth: '100%',
          boxSizing: 'border-box'
        }}>
          {loading ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              gap: '16px',
              color: 'var(--color-text-secondary)'
            }}>
              <div className="ai-spin-sparkle" style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(230,57,70,0.2), rgba(255,138,101,0.2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-accent)'
              }}>
                <Sparkles size={28} className="spin-animation" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '16px', marginBottom: '4px' }}>
                  Gemini AI sedang menganalisis draf berita Anda...
                </div>
                <div style={{ fontSize: '13px', opacity: 0.8 }}>
                  Menyelaraskan kaidah jurnalistik, kejelasan makna, dan daya tarik SEO
                </div>
              </div>
            </div>
          ) : result || parsedHeadlines.length > 0 ? (
            <>
              {error && (
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(255, 193, 7, 0.12)',
                  border: '1px solid rgba(255, 193, 7, 0.3)',
                  borderRadius: '12px',
                  color: '#ffc107',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              {/* Headlines Mode Display */}
              {activeTab === 'headlines' && parsedHeadlines.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                    🎯 Klik judul di bawah ini untuk langsung menerapkan ke artikel Anda:
                  </div>
                  {parsedHeadlines.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '16px 18px',
                        background: 'var(--color-bg-primary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
                        {item}
                      </div>
                      <button
                        onClick={() => {
                          if (onApplyTitle) onApplyTitle(item);
                          setApplied(`Judul #${idx + 1}`);
                        }}
                        style={{
                          background: 'rgba(230, 57, 70, 0.15)',
                          color: 'var(--color-accent)',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '10px',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        Gunakan Judul Ini <ArrowRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : activeTab === 'seo' && parsedSEO ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ padding: '16px', background: 'var(--color-bg-primary)', borderRadius: '14px', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Rekomendasi SEO Title (Maks 60 Karakter)
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {parsedSEO.seoTitle}
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: 'var(--color-bg-primary)', borderRadius: '14px', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Rekomendasi SEO Meta Description (Maks 155 Karakter)
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      {parsedSEO.seoDescription}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (onApplySEO) onApplySEO(parsedSEO);
                      setApplied('SEO Title & Description otomatis terisi di kolom form!');
                      setTimeout(() => { if (onClose) onClose(); }, 800);
                    }}
                    style={{
                      alignSelf: 'flex-start',
                      background: 'linear-gradient(135deg, var(--color-accent), #ff8a65)',
                      color: '#fff',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '12px',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(230, 57, 70, 0.4)'
                    }}
                  >
                    <Check size={18} /> Terapkan Otomatis ke Form SEO Metadata
                  </button>
                </div>
              ) : activeTab === 'antiplagiat' && parsedAntiplagiat ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ padding: '16px', background: 'var(--color-bg-primary)', borderRadius: '14px', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Judul Baru (Bebas Plagiasi)
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {parsedAntiplagiat.title}
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: 'var(--color-bg-primary)', borderRadius: '14px', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Ringkasan Baru
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      {parsedAntiplagiat.excerpt}
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: 'var(--color-bg-primary)', borderRadius: '14px', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Isi Berita Baru
                    </div>
                    <div className="ai-result-content ql-editor" dangerouslySetInnerHTML={{ __html: parsedAntiplagiat.content }} style={{ padding: 0, fontSize: '14.5px', color: 'var(--color-text-primary)', lineHeight: 1.8 }} />
                  </div>

                  <button
                    onClick={() => {
                      if (onApplyTitle) onApplyTitle(parsedAntiplagiat.title);
                      if (onApplyExcerpt) onApplyExcerpt(parsedAntiplagiat.excerpt);
                      if (onApplyContent) onApplyContent(parsedAntiplagiat.content);
                      setApplied('Judul, Ringkasan & Isi Artikel otomatis diperbarui!');
                      setTimeout(() => {
                        if (onClose) onClose();
                      }, 800);
                    }}
                    style={{
                      alignSelf: 'flex-start',
                      background: 'linear-gradient(135deg, var(--color-accent), #ff8a65)',
                      color: '#fff',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '12px',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(230, 57, 70, 0.4)'
                    }}
                  >
                    <Check size={18} /> Terapkan Semuanya Sekaligus
                  </button>
                </div>
              ) : (
                <div 
                  className="ai-result-content ql-editor"
                  style={{
                    padding: '20px',
                    background: 'var(--color-bg-primary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '16px',
                    fontSize: '14.5px',
                    lineHeight: 1.8,
                    color: 'var(--color-text-primary)',
                    maxWidth: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  <style>
                    {`
                      .ai-result-content p {
                        margin-bottom: 1.4rem !important;
                      }
                      .ai-result-content p:last-child {
                        margin-bottom: 0 !important;
                      }
                    `}
                  </style>
                  <div dangerouslySetInnerHTML={{ 
                    __html: (activeTab === 'grammar' || activeTab === 'expand' || activeTab === 'custom' || activeTab === 'rewrite' || activeTab === 'summarize')
                      ? cleanArticleContent(result)
                      : result.replace(/\n/g, '<br/>')
                  }} />
                </div>
              )}
            </>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--color-text-secondary)'
            }}>
              <Bot size={44} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-text-primary)' }}>
                Pilih aksi AI di atas untuk mulai menyempurnakan tulisan
              </div>
              <div style={{ fontSize: '13px', marginTop: '6px' }}>
                AI dapat membantu memperbaiki tata bahasa, membuat judul menarik, hingga menyusun ringkasan SEO
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '16px 24px',
          background: 'var(--color-bg-tertiary)',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ fontSize: '13px', color: '#4ade80', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            {applied && <>✨ Berhasil diterapkan: {applied}</>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {result && (
              <button
                onClick={() => handleCopyText(result)}
                style={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                {copied ? <Check size={16} color="#4ade80" /> : <Copy size={16} />}
                {copied ? 'Tersalin!' : 'Salin Teks'}
              </button>
            )}

            {result && (activeTab === 'grammar' || activeTab === 'expand' || activeTab === 'custom' || activeTab === 'rewrite' || activeTab === 'summarize') && (
              <button
                onClick={() => {
                  if (onApplyContent) onApplyContent(cleanArticleContent(result));
                  setApplied('Konten Artikel (Bersih tanpa catatan AI)');
                  setTimeout(() => { if (onClose) onClose(); }, 800);
                }}
                style={{
                  background: 'var(--color-accent)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(230, 57, 70, 0.4)'
                }}
              >
                <Check size={16} /> Terapkan ke Isi Berita
              </button>
            )}

            {result && activeTab === 'excerpt' && (
              <button
                onClick={() => {
                  if (onApplyExcerpt) onApplyExcerpt(result);
                  setApplied('Ringkasan / Excerpt');
                  setTimeout(() => { if (onClose) onClose(); }, 800);
                }}
                style={{
                  background: 'var(--color-accent)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(230, 57, 70, 0.4)'
                }}
              >
                <Check size={16} /> Terapkan ke Kolom Ringkasan
              </button>
            )}

            {result && activeTab === 'seo' && parsedSEO && (
              <button
                onClick={() => {
                  if (onApplySEO) onApplySEO(parsedSEO);
                  setApplied('SEO Title & Description');
                  setTimeout(() => { if (onClose) onClose(); }, 800);
                }}
                style={{
                  background: 'var(--color-accent)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(230, 57, 70, 0.4)'
                }}
              >
                <Check size={16} /> Terapkan ke Metadata SEO
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantModal;
