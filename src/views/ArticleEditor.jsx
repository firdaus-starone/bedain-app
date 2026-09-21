import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { collection, addDoc, doc, getDoc, updateDoc, Timestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { uploadAndCompressImage } from '../lib/uploadImage';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard, PenTool, Globe, ArrowLeft, Image as ImageIcon, Users, Tag, FileText, Settings, LogOut, CheckCircle2, Clock, Sparkles, Plus, AlertTriangle, Link2 } from 'lucide-react';
import { signOut } from 'firebase/auth';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import AIAssistantModal from '../components/AIAssistantModal';
import AIGeneratorModal from '../components/AIGeneratorModal';

const ArticleEditor = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams ? searchParams.get('id') : null;
  const justCreatedRef = useRef(false);
  const quillRef = useRef(null);
  const isUserTypingRef = useRef(false);
  
  const { currentUser, userRole, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [fetchingEdit, setFetchingEdit] = useState(!!editId);
  const [categories, setCategories] = useState([]);
  const [lastAutoSaved, setLastAutoSaved] = useState(null);
  const [localDraftData, setLocalDraftData] = useState(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isAIGenOpen, setIsAIGenOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });
  const [notifModal, setNotifModal] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
    articleSlug: '',
    status: ''
  });
  
  const [catModal, setCatModal] = useState({ isOpen: false, name: '', loading: false });
  
  const [formData, setFormData] = useState({
    title: '',
    category: 'Nasional',
    status: 'draft',
    scheduledAt: '',
    imageUrl: '',
    imageCaption: '',
    content: '',
    isHeadline: false,
    seoTitle: '',
    seoDescription: '',
    tags: '',
    slug: '',
    videoUrl: '',
    location: ''
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
        const snap = await getDocs(q);
        const cats = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.active !== false);
        setCategories(cats);
        if (!editId && cats.length > 0 && formData.category === 'Nasional') {
          setFormData(prev => ({ ...prev, category: cats[0].name }));
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (editId && currentUser) {
      if (justCreatedRef.current) {
        justCreatedRef.current = false;
        return;
      }
      const fetchArticleToEdit = async () => {
        setFetchingEdit(true);
        try {
          const docRef = doc(db, 'articles', editId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setFormData({
              title: data.title || '',
              category: data.category || 'Nasional',
              status: data.status || 'draft',
              scheduledAt: data.scheduledAt || '',
              imageUrl: data.coverImage || data.imageUrl || '',
              imageCaption: data.imageCaption || '',
              videoUrl: data.videoUrl || '',
              content: data.content || '',
              isHeadline: data.isHeadline || false,
              seoTitle: data.seoTitle || '',
              seoDescription: data.seoDescription || '',
              tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ''),
              slug: data.slug || '',
              location: data.location || ''
            });
          } else {
            alert('Berita tidak ditemukan.');
            router.push('/admin/dashboard');
          }
        } catch (err) {
          console.error("Error fetching article for edit:", err);
          alert('Gagal memuat berita.');
        } finally {
          setFetchingEdit(false);
        }
      };
      fetchArticleToEdit();
    } else {
      const saved = localStorage.getItem('bedainapp_autosave_draft');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.title || parsed.content)) {
            setLocalDraftData(parsed);
          }
        } catch (e) { /* ignore */ }
      }
    }
  }, [editId, currentUser, router]);

  useEffect(() => {
    if (!editId && (formData.title || formData.content)) {
      const timer = setTimeout(() => {
        const timestamp = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        localStorage.setItem('bedainapp_autosave_draft', JSON.stringify({ ...formData, savedAt: timestamp }));
        setLastAutoSaved(timestamp);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [formData, editId]);

  const restoreLocalDraft = () => {
    if (localDraftData) {
      setFormData(prev => ({
        ...prev,
        ...localDraftData
      }));
      setLocalDraftData(null);
    }
  };

  const dismissLocalDraft = () => {
    localStorage.removeItem('bedainapp_autosave_draft');
    setLocalDraftData(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleContentChange = (content, delta, source, editor) => {
    if (source === 'user') {
      isUserTypingRef.current = true;
    }
    setFormData(prev => ({ ...prev, content }));
  };

  const imageHandler = React.useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (file) {
        setLoading(true);
        try {
          const url = await uploadAndCompressImage(file, 'articles/content');
          const editor = quillRef.current.getEditor();
          const range = editor.getSelection(true) || { index: editor.getLength() };
          editor.insertEmbed(range.index, 'image', url);
          editor.setSelection(range.index + 1);
        } catch (err) {
          console.error("Gagal unggah gambar:", err);
          setNotifModal({
            isOpen: true,
            title: 'Gagal Unggah Gambar',
            message: 'Terjadi kesalahan saat mengunggah gambar ke server.',
            type: 'error'
          });
        } finally {
          setLoading(false);
        }
      }
    };
  }, []);

  const quillModules = React.useMemo(() => ({
    toolbar: {
      container: [
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote', 'code-block'],
        [{ 'header': 1 }, { 'header': 2 }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'script': 'sub'}, { 'script': 'super' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'direction': 'rtl' }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'font': [] }],
        [{ 'align': [] }],
        ['clean'],
        ['link', 'image', 'video']
      ],
      handlers: {
        image: imageHandler
      }
    }
  }), [imageHandler]);



  const boldTagsInContent = (tagsInput, htmlContent) => {
    let currentTags = [];
    if (typeof tagsInput === 'string') {
      currentTags = tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 1);
    } else if (Array.isArray(tagsInput)) {
      currentTags = tagsInput.map(t => String(t).trim()).filter(t => t.length > 1);
    }
    if (currentTags.length > 0 && htmlContent) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            if (node.parentNode.nodeName !== 'STRONG' && node.parentNode.nodeName !== 'B' && node.parentNode.nodeName !== 'A' && node.parentNode.nodeName !== 'H1' && node.parentNode.nodeName !== 'H2' && node.parentNode.nodeName !== 'H3') {
                textNodes.push(node);
            }
        }
        
        currentTags.sort((a, b) => b.length - a.length);
        const escapedTags = currentTags.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const regex = new RegExp(`\\b(${escapedTags.join('|')})\\b`, 'gi');
        let modified = false;

        textNodes.forEach(textNode => {
            if (regex.test(textNode.nodeValue)) {
                modified = true;
                regex.lastIndex = 0;
                const span = document.createElement('span');
                span.innerHTML = textNode.nodeValue.replace(regex, '<strong>$1</strong>');
                while(span.firstChild) {
                    textNode.parentNode.insertBefore(span.firstChild, textNode);
                }
                textNode.parentNode.removeChild(textNode);
            }
        });

        if (modified) {
          return doc.body.innerHTML;
        }
      } catch (e) {
        console.error("Error bolding tags:", e);
      }
    }
    return htmlContent;
  };

  const handleAutoFormat = () => {
    if (!formData.content) return;
    setConfirmModal({ isOpen: true });
  };

  const executeAutoFormat = () => {
    
    // Extract plain text
    let plainText = '';
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(formData.content, 'text/html');
      plainText = doc.body.textContent || '';
    } catch (e) {
      plainText = formData.content.replace(/<[^>]+>/g, ' ');
    }

    // Normalize spaces
    plainText = plainText.replace(/\s+/g, ' ').trim();
    if (!plainText) return;

    // Split text into words
    const words = plainText.split(' ');
    const paragraphs = [];
    let currentParagraph = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      currentParagraph.push(word);

      // Check if we reached minimum words and end of a sentence
      const minWords = 30;
      const maxWords = 50;
      
      const isSentenceEnd = /[.?!]["']?$/.test(word);
      const length = currentParagraph.length;

      // Force break if too long, or break if it's a sentence end after minWords
      if ((length >= minWords && isSentenceEnd) || length >= maxWords) {
        paragraphs.push(currentParagraph.join(' '));
        currentParagraph = [];
      }
    }

    if (currentParagraph.length > 0) {
      paragraphs.push(currentParagraph.join(' '));
    }

    // Build HTML string with an extra enter (<p><br></p>) between paragraphs
    let newHtmlContent = paragraphs.map(p => `<p>${p}</p><p><br></p>`).join('');
    
    // Auto bold tags in content
    newHtmlContent = boldTagsInContent(formData.tags, newHtmlContent);

    setFormData(prev => ({ ...prev, content: newHtmlContent }));
    
    setNotifModal({
      isOpen: true,
      type: 'success',
      title: '✅ Berhasil Dirapikan',
      message: 'Artikel berhasil diubah menjadi paragraf-paragraf ideal (30-50 kata) secara otomatis.',
      articleSlug: '',
      status: ''
    });
    
    setConfirmModal({ isOpen: false });
  };

  const handleSuggestInternalLinks = async () => {
    try {
      const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const allArticles = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(a => a.id !== editId && a.title && a.slug);

      if (allArticles.length === 0) {
        setNotifModal({
          isOpen: true,
          type: 'error',
          title: 'Belum Ada Artikel Lain',
          message: 'Tulis dan terbitkan beberapa artikel terlebih dahulu agar AI dapat merekomendasikan internal link otomatis.',
          articleSlug: '',
          status: ''
        });
        return;
      }

      const currentCat = formData.category || 'Berita';
      const currentTags = (formData.tags || '').toLowerCase().split(',').map(t => t.trim()).filter(Boolean);

      let ranked = allArticles.map(a => {
        let score = 0;
        if (a.category === currentCat) score += 3;
        const aTags = (a.tags || []).map(t => typeof t === 'string' ? t.toLowerCase() : '');
        currentTags.forEach(t => {
          if (aTags.includes(t)) score += 2;
          if ((a.title || '').toLowerCase().includes(t)) score += 2;
        });
        return { ...a, score };
      });

      ranked.sort((a, b) => b.score - a.score);
      const topSuggestions = ranked.slice(0, 2);

      let bacaJugaHtml = `<div style="margin: 24px 0; padding: 16px 20px; background: rgba(239, 68, 68, 0.06); border-left: 4px solid #ef4444; border-radius: 8px;">`;
      bacaJugaHtml += `<strong style="color: #ef4444; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px;">BACA JUGA:</strong>`;
      bacaJugaHtml += `<ul style="margin: 0; padding-left: 18px; line-height: 1.8;">`;
      topSuggestions.forEach(item => {
        const url = `/article/${item.slug}`;
        bacaJugaHtml += `<li style="margin-bottom: 6px;"><a href="${url}" target="_blank" rel="noopener noreferrer" style="color: inherit; font-weight: 600; text-decoration: underline;">${item.title}</a></li>`;
      });
      bacaJugaHtml += `</ul></div>`;

      let currentHtml = formData.content || '';
      const paragraphs = currentHtml.split('</p>');
      if (paragraphs.length > 3) {
        const midIdx = Math.floor(paragraphs.length / 2);
        paragraphs.splice(midIdx, 0, bacaJugaHtml);
        currentHtml = paragraphs.join('</p>');
      } else {
        currentHtml += bacaJugaHtml;
      }

      setFormData(prev => ({ ...prev, content: currentHtml }));

      setNotifModal({
        isOpen: true,
        type: 'success',
        title: '🔗 Internal Link Ditambahkan!',
        message: `AI berhasil menyisipkan blok rekomendasi "Baca Juga" dengan ${topSuggestions.length} artikel terkait ("${topSuggestions[0].title.slice(0, 40)}...") ke dalam tulisan Anda.`,
        articleSlug: '',
        status: ''
      });
    } catch (err) {
      console.error('Error suggesting internal link:', err);
      alert('Gagal mengambil saran internal link: ' + err.message);
    }
  };

  const showNotif = (message, type = 'success') => {
    setNotifModal({
      isOpen: true,
      type,
      title: type === 'success' ? '✅ Berhasil' : '⚠️ Perhatian',
      message,
      articleSlug: '',
      status: ''
    });
  };

  const getGeminiKey = () => {
    const localKey = localStorage.getItem('bedain_gemini_api_key');
    if (localKey && localKey.trim() !== '') return localKey.trim();
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (envKey && envKey !== 'YOUR_GEMINI_API_KEY') return envKey;
    return null;
  };

  const callGeminiAPI = async (prompt, systemInstruction = '') => {
    const apiKey = getGeminiKey();
    if (!apiKey) throw new Error('API_KEY_MISSING');
    
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7 }
    };
    
    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const modelsToTry = [
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-2.0-flash-exp',
      'gemini-2.0-flash',
      'gemini-pro'
    ];

    let response;
    let data;
    let success = false;

    // 1. Coba daftar model standar terlebih dahulu
    for (const modelName of modelsToTry) {
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          }
        );
        data = await response.json();
        if (response.ok && !data.error && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          success = true;
          break;
        }
      } catch (e) {
        console.warn(`Model ${modelName} gagal dipanggil:`, e);
      }
    }

    // 2. Jika semua model standar gagal (misal karena API key baru / list model khusus), lakukan auto-discovery model loop
    if (!success) {
      console.log('Model standar gagal/tidak tersedia, mencoba auto-discovery model dari akun API...');
      try {
        const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const listData = await listResponse.json();
        if (listData.models && listData.models.length > 0) {
          const availableModels = listData.models
            .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
            .filter(m => !m.name.includes('vision') && !m.name.includes('embedding') && !m.name.includes('aqa'))
            .sort((a, b) => {
              const score = (name) => {
                if (name.includes('1.5-flash')) return 10;
                if (name.includes('1.5-pro')) return 9;
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
                `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModelName}:generateContent?key=${apiKey}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body)
                }
              );
              data = await response.json();
              if (response.ok && !data.error && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                console.log('Auto-discovery berhasil dengan model:', resolvedModelName);
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
      throw new Error(data?.error?.message || 'Gagal terhubung ke AI. Pastikan API Key valid.');
    }

    return data.candidates[0].content.parts[0].text;
  };

  const generateSEOStandard = () => {
    let newTitle = formData.seoTitle;
    let newDesc = formData.seoDescription;
    let newSlug = formData.slug;
    let newTags = formData.tags;
    let newContent = formData.content;

    if (!newTitle && formData.title) {
      newTitle = formData.title;
    }
    
    if (formData.content) {
      let strippedContent = '';
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(formData.content, 'text/html');
        strippedContent = doc.body.textContent || '';
      } catch (e) {
        strippedContent = formData.content.replace(/<[^>]+>/g, ' ');
      }
      strippedContent = strippedContent.replace(/&nbsp;/gi, ' ').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
      
      if (!newDesc) {
        newDesc = strippedContent.substring(0, 155) + (strippedContent.length > 155 ? '...' : '');
      }

      if (!newTags) {
        const stopWords = ['yang','di','dan','ke','dari','ini','itu','untuk','dengan','pada','adalah','dalam','sebagai','tidak','akan','bisa','juga','sudah','saat','oleh','karena','atau','ada','mereka','kita','kami','saya','dia','hingga','namun','telah','setelah','lebih','menjadi','hanya','banyak','sangat','seperti','lagi','terus','biar','pun','para','bahwa','atas','bagi','lalu','sementara','sedangkan','sebuah','suatu','beberapa','antara','serta','kini','baru','tentang','tersebut','sekitar','terkait','bahkan','selalu','kapan','apa','siapa','mengapa','bagaimana','boleh','pernah','harus','mampu','tentu','maka','agar','supaya','sebab','kalau','jika','sehingga','sejak','sampai','saja','lain','masih','hal','lainnya','menurut','apakah','setiap','mulai','bukan','belum'];
        
        const titleWords = formData.title ? formData.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/) : [];
        const words = strippedContent.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/);
        
        const counts = {};
        
        // Find capitalized phrases (2-3 words) e.g., "Elon Musk", "Bursa Efek"
        const phraseRegex = /([A-Z][a-z0-9]+\s+[A-Z][a-z0-9]+(?:\s+[A-Z][a-z0-9]+)?)/g;
        let match;
        while ((match = phraseRegex.exec(strippedContent)) !== null) {
            const lowerP = match[1].toLowerCase();
            counts[lowerP] = (counts[lowerP] || 0) + 5; // Give phrases higher score
        }
        
        words.forEach(w => { 
            const lowerW = w.toLowerCase();
            if (lowerW.length > 3 && !stopWords.includes(lowerW)) {
                let score = 1;
                if (w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase()) score += 1;
                if (titleWords.includes(lowerW)) score += 3;
                counts[lowerW] = (counts[lowerW] || 0) + score;
            }
        });
        
        // Sort and map back to Title Case
        const keywords = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(entry => entry[0]);
        if (keywords.length > 0) {
          newTags = keywords.map(k => k.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')).join(', ');
        }
      }
    }

    if (!newSlug && formData.title) {
      newSlug = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    newContent = boldTagsInContent(newTags || formData.tags, newContent);

    setFormData(prev => ({
      ...prev,
      seoTitle: newTitle,
      seoDescription: newDesc,
      slug: newSlug,
      tags: newTags,
      content: newContent
    }));
  };

  const generateSEO = async () => {
    if (!formData.content && !formData.title) {
        showNotif('Isi judul atau konten berita terlebih dahulu!', 'error');
        return;
    }

    const apiKey = getGeminiKey();
    if (!apiKey) {
        showNotif('API Key belum diatur. Menggunakan metode Auto-Generate standar. Atur API key di Bedain AI Assistant.', 'error');
        generateSEOStandard();
        return;
    }
    
    let plainText = formData.title + "\n\n";
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(formData.content, 'text/html');
      plainText += (doc.body.textContent || '');
    } catch (e) {
      plainText += formData.content.replace(/<[^>]+>/g, ' ');
    }
    plainText = plainText.substring(0, 15000);

    setNotifModal({ isOpen: true, type: 'success', title: '⏳ Memproses AI...', message: 'Bedain AI sedang meracik SEO dan Metadata terbaik untuk artikel ini...', articleSlug: '', status: '' });

    try {
      const prompt = `Buatkan SEO metadata untuk artikel berikut.
Artikel:
${plainText}

Kembalikan WAJIB HANYA dalam format JSON valid (tanpa blok markdown) dengan struktur:
{
  "seoTitle": "Judul SEO maksimal 60 karakter yang memikat dan clickbait",
  "seoDescription": "Deskripsi meta maksimal 155 karakter yang bikin penasaran",
  "tags": "3-5 kata kunci spesifik atau frasa pisahkan dengan koma (contoh: Mobil Listrik, Bursa Efek Indonesia, Harga Emas)",
  "slug": "url-slug-seo-friendly-tanpa-spasi"
}`;

      const aiResponse = await callGeminiAPI(prompt, "Kamu adalah ahli SEO Jurnalistik spesialis pembuat metadata.");
      let cleanedJson = aiResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
      const jsonMatch = cleanedJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedJson = jsonMatch[0];
      }
      const result = JSON.parse(cleanedJson);

      let finalContent = boldTagsInContent(result.tags || formData.tags, formData.content);

      setFormData(prev => ({
        ...prev,
        seoTitle: result.seoTitle || prev.seoTitle,
        seoDescription: result.seoDescription || prev.seoDescription,
        tags: result.tags || prev.tags,
        slug: result.slug || prev.slug,
        content: finalContent
      }));
      setNotifModal({ isOpen: false, type: 'success', title: '', message: '', articleSlug: '', status: '' });
      setTimeout(() => showNotif('✨ SEO & Metadata berhasil diracik oleh Bedain AI!', 'success'), 300);

    } catch (error) {
      console.warn("AI Generate SEO gagal:", error.message);
      setNotifModal({ isOpen: false, type: 'success', title: '', message: '', articleSlug: '', status: '' });
      const errorMsg = error?.message || 'Gagal terhubung ke AI';
      setTimeout(() => showNotif(`AI Generate gagal (${errorMsg}). Menggunakan metode standar. Klik Mengerti & Perbaiki untuk cek/ubah API Key AI.`, 'error'), 300);
      generateSEOStandard();
    }
  };

  const handleAddCategory = () => {
    setCatModal({ isOpen: true, name: '', loading: false });
  };

  const saveNewCategory = async () => {
    const catNameTrimmed = catModal.name.trim();
    if (!catNameTrimmed) {
        setCatModal(prev => ({ ...prev, isOpen: false }));
        return;
    }
    
    if (categories.some(c => c.name.toLowerCase() === catNameTrimmed.toLowerCase())) {
        showNotif('Kategori ini sudah ada!', 'error');
        setCatModal(prev => ({ ...prev, isOpen: false }));
        return;
    }
    
    setCatModal(prev => ({ ...prev, loading: true }));
    try {
        const catData = {
            name: catNameTrimmed,
            slug: catNameTrimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
            active: true,
            order: categories.length + 1,
            createdAt: Timestamp.now()
        };
        const docRef = await addDoc(collection(db, 'categories'), catData);
        
        const newCat = { id: docRef.id, ...catData };
        setCategories(prev => [...prev, newCat]);
        setFormData(prev => ({ ...prev, category: newCat.name }));
        
        showNotif(`Kategori '${newCat.name}' berhasil ditambahkan!`, 'success');
    } catch (e) {
        showNotif('Gagal menambahkan kategori', 'error');
        console.error(e);
    } finally {
        setCatModal({ isOpen: false, name: '', loading: false });
    }
  };

  const autoSelectCategoryStandard = () => {
    if (categories.length === 0 || !formData.content) {
      showNotif('Tulis konten terlebih dahulu sebelum menggunakan Auto-Select', 'error');
      return;
    }
    
    let strippedContent = '';
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(formData.content, 'text/html');
      strippedContent = doc.body.textContent || '';
    } catch (e) {
      strippedContent = formData.content.replace(/<[^>]+>/g, ' ');
    }
    
    const textToAnalyze = `${formData.title} ${formData.title} ${formData.tags || ''} ${strippedContent}`.toLowerCase();
    
    let bestCategory = formData.category || categories[0].name;
    let maxScore = 0;
    
    categories.forEach(cat => {
      const catName = cat.name.toLowerCase();
      const catWords = catName.split(/[^a-z0-9]+/).filter(w => w.length > 2);
      
      let score = 0;
      
      if (textToAnalyze.includes(catName)) score += 10;
      
      catWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'g');
        const matches = textToAnalyze.match(regex);
        if (matches) {
           score += matches.length * 3;
        }
      });
      
      const synonyms = {
        'teknologi': ['gadget', 'smartphone', 'komputer', 'internet', 'digital', 'aplikasi', 'software', 'siber', 'cyber', 'ai', 'tech'],
        'finansial': ['ekonomi', 'saham', 'investasi', 'uang', 'rupiah', 'bank', 'kredit', 'pajak', 'bisnis', 'modal', 'keuangan', 'rupiah'],
        'hiburan': ['artis', 'film', 'musik', 'konser', 'selebritis', 'drama', 'sinetron', 'viral', 'trending', 'tiktok', 'gosip', 'kpop'],
        'gaya hidup': ['kesehatan', 'diet', 'makanan', 'travel', 'wisata', 'kuliner', 'fashion', 'baju', 'tren', 'sehat', 'olahraga', 'psikologi'],
        'politik': ['presiden', 'dpr', 'pemilu', 'partai', 'pemerintah', 'menteri', 'hukum', 'undang-undang', 'kpk', 'polisi', 'korupsi', 'kasus', 'gubernur', 'bupati'],
        'olahraga': ['bola', 'sepakbola', 'pertandingan', 'skor', 'timnas', 'badminton', 'liga', 'atlet', 'juara', 'medali'],
        'news': ['berita', 'kabar', 'info', 'terbaru', 'hari ini', 'peristiwa', 'kejadian', 'insiden', 'warga', 'nasional']
      };
      
      Object.keys(synonyms).forEach(key => {
        if (catName.includes(key)) {
          synonyms[key].forEach(syn => {
            const regex = new RegExp(`\\b${syn}\\b`, 'g');
            const matches = textToAnalyze.match(regex);
            if (matches) {
               score += (matches.length * 2); 
            }
          });
        }
      });
      
      if (score > maxScore) {
        maxScore = score;
        bestCategory = cat.name;
      }
    });
    
    if (maxScore > 0) {
      setFormData(prev => ({ ...prev, category: bestCategory }));
      showNotif(`Kategori '${bestCategory}' dipilih otomatis!`, 'success');
    } else {
      showNotif('Tidak menemukan kecocokan kata kunci. Kategori dipertahankan.', 'error');
    }
  };

  const autoSelectCategory = async () => {
    if (categories.length === 0 || !formData.content) {
      showNotif('Tulis konten terlebih dahulu sebelum menggunakan Auto-Select', 'error');
      return;
    }

    const apiKey = getGeminiKey();
    if (!apiKey) {
      showNotif('API Key belum diatur. Menggunakan metode Auto-Select standar. Atur API key di Bedain AI Assistant.', 'error');
      autoSelectCategoryStandard();
      return;
    }
    
    let strippedContent = '';
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(formData.content, 'text/html');
      strippedContent = doc.body.textContent || '';
    } catch (e) {
      strippedContent = formData.content.replace(/<[^>]+>/g, ' ');
    }
    
    const textToAnalyze = `${formData.title}\n\n${strippedContent}`.substring(0, 10000);
    const categoryNames = categories.map(c => c.name);

    setNotifModal({ isOpen: true, type: 'success', title: '⏳ Memproses AI...', message: 'Bedain AI sedang menganalisa kategori yang paling cocok...', articleSlug: '', status: '' });

    try {
      const prompt = `Dari daftar kategori berikut: [${categoryNames.join(', ')}]
      
Baca artikel ini dan pilih SATU kategori yang paling akurat/cocok untuk artikel ini.
Hanya kembalikan NAMA KATEGORINYA saja, tanpa penjelasan apapun. Harus sama persis ejaannya dengan daftar di atas.

Artikel:
${textToAnalyze}`;

      const aiResponse = await callGeminiAPI(prompt, "Kamu adalah asisten redaksi jurnalistik.");
      const selected = aiResponse.trim();
      
      setNotifModal({ isOpen: false, type: 'success', title: '', message: '', articleSlug: '', status: '' });

      if (categoryNames.includes(selected)) {
        setFormData(prev => ({ ...prev, category: selected }));
        setTimeout(() => showNotif(`✨ AI memilih kategori: '${selected}'!`, 'success'), 300);
      } else {
        const closest = categoryNames.find(c => selected.toLowerCase().includes(c.toLowerCase()));
        if (closest) {
           setFormData(prev => ({ ...prev, category: closest }));
           setTimeout(() => showNotif(`✨ AI memilih kategori: '${closest}'!`, 'success'), 300);
        } else {
           throw new Error("Kategori tidak valid: " + selected);
        }
      }
    } catch (error) {
      console.warn("AI Category Select gagal:", error.message);
      setNotifModal({ isOpen: false, type: 'success', title: '', message: '', articleSlug: '', status: '' });
      const errorMsg = error?.message || 'Gagal terhubung ke AI';
      setTimeout(() => showNotif(`AI Auto-Category gagal (${errorMsg}). Menggunakan metode standar. Klik Mengerti & Perbaiki untuk cek/ubah API Key AI.`, 'error'), 300);
      autoSelectCategoryStandard();
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const downloadUrl = await uploadAndCompressImage(file, 'articles/images');
      setFormData(prev => ({ ...prev, imageUrl: downloadUrl }));
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Gagal mengunggah gambar. Silakan coba lagi.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      setNotifModal({
        isOpen: true,
        type: 'error',
        title: '⚠️ Kolom Wajib Belum Lengkap',
        message: 'Judul dan Isi Berita (Konten) tidak boleh kosong sebelum disimpan atau diterbitkan.'
      });
      return;
    }

    try {
      setLoading(true);
      let tagsStr = formData.tags || '';
      if (formData.location) {
        const locStr = formData.location.trim();
        if (locStr && !tagsStr.toLowerCase().includes(locStr.toLowerCase())) {
          tagsStr = tagsStr ? `${tagsStr}, ${locStr}` : locStr;
        }
      }
      const tagsArray = tagsStr.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
      const finalStatus = userRole === 'reporter' ? 'draft' : formData.status;
      const finalContentWithBold = boldTagsInContent(tagsArray, formData.content);
      
      let finalSlug = formData.slug ? formData.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : '';
      if (!finalSlug && formData.title) {
        finalSlug = formData.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }
      if (!finalSlug) {
        finalSlug = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }

      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      const authorName = userSnap.exists() && userSnap.data().name 
        ? userSnap.data().name 
        : (currentUser.displayName || currentUser.email.split('@')[0]);

      if (editId) {
        const articleRef = doc(db, 'articles', editId);
        await updateDoc(articleRef, {
          title: formData.title,
          slug: finalSlug,
          category: formData.category,
          status: finalStatus,
          videoUrl: formData.videoUrl,
          coverImage: formData.imageUrl,
          imageUrl: formData.imageUrl,
          imageCaption: formData.imageCaption || '',
          content: finalContentWithBold,
          isHeadline: formData.isHeadline,
          seoTitle: formData.seoTitle,
          seoDescription: formData.seoDescription,
          tags: tagsArray,
          location: formData.location || '',
          updatedAt: Timestamp.now(),
          scheduledAt: finalStatus === 'scheduled' ? (formData.scheduledAt || '') : null,
          publishedAt: finalStatus === 'published' ? Timestamp.now() : (finalStatus === 'scheduled' && formData.scheduledAt ? Timestamp.fromDate(new Date(formData.scheduledAt)) : null),
          'author.name': authorName,
        });
      } else {
        const articleData = {
          ...formData,
          content: finalContentWithBold,
          slug: finalSlug,
          coverImage: formData.imageUrl,
          status: finalStatus,
          scheduledAt: finalStatus === 'scheduled' ? (formData.scheduledAt || '') : null,
          tags: tagsArray,
          createdAt: Timestamp.now(),
          publishedAt: finalStatus === 'published' ? Timestamp.now() : (finalStatus === 'scheduled' && formData.scheduledAt ? Timestamp.fromDate(new Date(formData.scheduledAt)) : null),
          authorId: currentUser.uid,
          author: {
            email: currentUser.email,
            name: authorName
          },
          views: 0
        };
        const newDocRef = await addDoc(collection(db, 'articles'), articleData);
        justCreatedRef.current = true;
        router.replace(`/admin/editor?id=${newDocRef.id}`);
      }
      
      localStorage.removeItem('bedainapp_autosave_draft');
      setLoading(false);

      const isPub = finalStatus === 'published';
      const isSched = finalStatus === 'scheduled';
      setNotifModal({
        isOpen: true,
        type: 'success',
        title: isPub ? '🎉 Berita Berhasil Diterbitkan!' : isSched ? '⏰ Berita Dijadwalkan Tayang Otomatis!' : '📁 Draf Berita Berhasil Disimpan!',
        message: `Artikel "${formData.title}" telah sukses diunggah ke portal dan tersimpan dengan aman di database Bedain News.`,
        articleSlug: finalSlug,
        status: finalStatus
      });
    } catch (error) {
      console.error("Error saving article:", error);
      setLoading(false);
      setNotifModal({
        isOpen: true,
        type: 'error',
        title: '⚠️ Gagal Menyimpan Berita',
        message: 'Terjadi kendala saat menyimpan artikel: ' + (error.message || 'Coba lagi beberapa saat.')
      });
    }
  };

  if (authLoading || fetchingEdit) return <div className="admin-loading-screen"><div className="spinner"></div><p>{fetchingEdit ? 'Memuat data berita...' : 'Memeriksa akses...'}</p></div>;

  return (
    <div className="admin-layout">
      
      <main className="admin-main" style={{ background: 'var(--admin-bg)' }}>
        <header className="admin-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0, flex: 1 }}>
              <Link href="/admin/dashboard" style={{ color: 'var(--admin-text-secondary)', display: 'flex', alignItems: 'center', padding: '8px', borderRadius: '50%', background: 'var(--admin-hover-bg)', flexShrink: 0 }}>
                <ArrowLeft size={20} />
              </Link>
              <div style={{ minWidth: 0 }}>
                <h1 style={{ fontSize: '1.2rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--admin-text-primary)' }}>{editId ? 'Edit Artikel Redaksi' : 'Tulis Berita Baru'}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--admin-text-secondary)' }}>
                  <span>{formData.status === 'published' ? '🟢 Sedang Tayang' : formData.status === 'scheduled' ? `⏰ Terjadwal (${formData.scheduledAt ? formData.scheduledAt.replace('T', ' ') : 'Atur Waktu'})` : '🟠 Draf'}</span>
                  {lastAutoSaved && (
                    <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      • <CheckCircle2 size={12} /> Tersimpan otomatis {lastAutoSaved}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <Link href="/admin/dashboard" className="admin-btn-secondary" style={{ padding: '10px 16px', textDecoration: 'none', borderRadius: '8px', background: 'transparent', color: 'var(--admin-text-primary)', border: '1px solid var(--admin-border)', fontSize: '14px' }}>
                Batal
              </Link>
              <button onClick={handleSubmit} className="admin-btn-primary submit-btn" disabled={loading || uploadingImage} style={{ padding: '10px 16px', fontSize: '14px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--color-accent), #ff5252)' }}>
                {loading ? 'Menyimpan...' : (editId ? 'Perbarui' : 'Simpan')}
              </button>
            </div>
          </div>
        </header>

        <div className="admin-content editor-content-mobile" style={{ maxWidth: '1400px' }}>
          <div className="editor-grid-layout">
            
            {/* Left Column: Editor */}
            <div className="editor-main-col" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Local Draft Alert Banner */}
              {localDraftData && (
                <div style={{
                  background: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#60a5fa', fontSize: '13.5px' }}>
                    <Sparkles size={18} />
                    <span>
                      Ditemukan draf otomatis yang belum dipublikasikan (terakhir disimpan pukul <strong>{localDraftData.savedAt || 'Sebelumnya'}</strong>).
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={restoreLocalDraft}
                      style={{
                        background: 'var(--color-accent)',
                        color: '#fff',
                        border: 'none',
                        padding: '7px 14px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Pulihkan Draf
                    </button>
                    <button
                      type="button"
                      onClick={dismissLocalDraft}
                      style={{
                        background: 'transparent',
                        color: 'var(--admin-text-secondary)',
                        border: '1px solid var(--admin-border)',
                        padding: '7px 12px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Abaikan
                    </button>
                  </div>
                </div>
              )}

              {/* Removed AI Writing Assistant Banner */}

              <div style={{ background: 'var(--admin-card-bg)', borderRadius: '16px', border: '1px solid var(--admin-card-border)', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--admin-card-border)' }}>
                  <textarea 
                    name="title" 
                    value={formData.title} 
                    onChange={handleChange}
                    onInput={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    placeholder="Judul Berita Utama..."
                    rows={1}
                    style={{ 
                      width: '100%', 
                      background: 'transparent', 
                      border: 'none', 
                      fontSize: '1.65rem', 
                      fontWeight: 700, 
                      color: 'var(--admin-text-primary)', 
                      outline: 'none',
                      fontFamily: 'var(--font-heading)',
                      padding: 0,
                      resize: 'none',
                      overflow: 'hidden',
                      minHeight: '40px',
                      lineHeight: '1.3'
                    }}
                    required 
                  />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px 0 16px', gap: '8px', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => setIsAIModalOpen(true)} style={{ background: 'linear-gradient(135deg, var(--color-accent), #ff8a65)', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(230, 57, 70, 0.3)' }}>
                    <Sparkles size={14} /> ✨ Bedain AI Assistant
                  </button>
                  <button type="button" onClick={handleAutoFormat} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}>
                    <Sparkles size={14} /> Rapikan Paragraf (30-50 kata)
                  </button>
                  <button type="button" onClick={handleSuggestInternalLinks} style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}>
                    <Link2 size={14} /> 🔗 Sisipkan "Baca Juga" (AI Internal Link)
                  </button>
                </div>

                <div className="modern-quill-container" style={{ padding: '16px' }}>
                  <ReactQuill 
                    ref={quillRef}
                    theme="snow" 
                    modules={quillModules}
                    value={formData.content} 
                    onChange={handleContentChange} 
                    placeholder="Tuliskan cerita jurnalistik Anda di sini..."
                    style={{ minHeight: '500px', fontSize: '1rem' }}
                  />
                </div>
              </div>

              {/* SEO & Tags Card */}
              <div style={{ background: 'var(--admin-card-bg)', borderRadius: '16px', border: '1px solid var(--admin-card-border)', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--admin-card-border)', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontSize: '14px', color: 'var(--admin-text-primary)', margin: 0 }}>SEO & Metadata</h3>
                  <button 
                    type="button" 
                    onClick={generateSEO}
                    className="editor-mobile-action-btn"
                    style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', minHeight: '44px', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                  >
                    <Sparkles size={14} /> ✨ Auto-Generate SEO & Meta
                  </button>
                </div>
                
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--admin-text-secondary)', marginBottom: '8px' }}>Lokasi Berita (Opsional)</label>
                  <input 
                    type="text" 
                    name="location" 
                    value={formData.location || ''} 
                    onChange={handleChange} 
                    placeholder="Contoh: JAKARTA"
                    style={{ width: '100%', padding: '12px', background: 'var(--admin-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '8px', color: 'var(--admin-text-primary)', outline: 'none', fontSize: '13px', textTransform: 'uppercase' }}
                  />
                  <p style={{ fontSize: '11px', color: 'var(--admin-text-tertiary)', marginTop: '6px' }}>Otomatis ditambahkan ke awal kalimat pembuka dan menjadi Topik.</p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--admin-text-secondary)', marginBottom: '8px' }}>Tags (Koma untuk pisah)</label>
                  <input 
                    type="text" 
                    name="tags" 
                    value={formData.tags} 
                    onChange={handleChange} 
                    placeholder="pemilu, jakarta, dki..."
                    style={{ width: '100%', padding: '12px', background: 'var(--admin-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '8px', color: 'var(--admin-text-primary)', outline: 'none', fontSize: '13px' }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--admin-text-secondary)', marginBottom: '8px' }}>SEO Title (Opsional)</label>
                  <input 
                    type="text" 
                    name="seoTitle" 
                    value={formData.seoTitle} 
                    onChange={handleChange} 
                    placeholder="Judul khusus pencarian..."
                    style={{ width: '100%', padding: '12px', background: 'var(--admin-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '8px', color: 'var(--admin-text-primary)', outline: 'none', fontSize: '13px' }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--admin-text-secondary)', marginBottom: '8px' }}>SEO Description (Opsional)</label>
                  <textarea 
                    name="seoDescription" 
                    value={formData.seoDescription} 
                    onChange={handleChange} 
                    placeholder="Deskripsi singkat artikel untuk Google..."
                    rows="3"
                    style={{ width: '100%', padding: '12px', background: 'var(--admin-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '8px', color: 'var(--admin-text-primary)', outline: 'none', fontSize: '13px', resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--admin-text-secondary)', marginBottom: '8px' }}>Custom URL Slug</label>
                  <input 
                    type="text" 
                    name="slug" 
                    value={formData.slug} 
                    onChange={handleChange} 
                    placeholder="otomatis-dari-judul"
                    style={{ width: '100%', padding: '12px', background: 'var(--admin-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '8px', color: 'var(--admin-text-primary)', outline: 'none', fontSize: '13px' }}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Settings Sidebar */}
            <aside className="editor-sidebar-col" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Media Card */}
              <div style={{ background: 'var(--admin-card-bg)', borderRadius: '16px', border: '1px solid var(--admin-card-border)', padding: '24px' }}>
                <h3 style={{ fontSize: '14px', color: 'var(--admin-text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ImageIcon size={16} color="var(--color-accent)" /> Media Thumbnail
                </h3>
                
                {formData.imageUrl ? (
                  <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
                    <img src={formData.imageUrl} alt="Thumbnail" style={{ width: '100%', display: 'block', aspectRatio: '16/9', objectFit: 'cover' }} />
                    <button 
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                      style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      &times;
                    </button>
                  </div>
                ) : (
                  <div style={{ width: '100%', aspectRatio: '16/9', background: 'var(--admin-bg)', border: '1px dashed var(--admin-border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <ImageIcon size={32} color="#444" />
                    <label style={{ background: 'var(--admin-hover-bg)', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', color: 'var(--admin-text-secondary)', cursor: 'pointer', border: '1px solid var(--admin-border)' }}>
                      {uploadingImage ? 'Mengunggah...' : 'Pilih Gambar'}
                      <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} style={{ display: 'none' }} />
                    </label>
                  </div>
                )}

                <div style={{ marginTop: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--admin-text-secondary)', marginBottom: '8px', fontWeight: '500' }}>Keterangan Foto Utama</label>
                  <input
                    type="text"
                    value={formData.imageCaption}
                    onChange={(e) => setFormData(prev => ({ ...prev, imageCaption: e.target.value }))}
                    placeholder="Contoh: CEO Bedain News saat presentasi..."
                    className="editor-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text-primary)' }}
                  />
                  <p style={{ fontSize: '11px', color: 'var(--admin-text-tertiary)', marginTop: '6px', lineHeight: '1.4' }}>Teks ini akan muncul tepat di bawah gambar utama artikel.</p>
                </div>
                
                <button
                  type="button"
                  onClick={() => setIsAIGenOpen(true)}
                  style={{
                    width: '100%', padding: '12px', marginTop: '12px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, var(--color-accent), #ff8a65)', color: 'white',
                    border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: '0 4px 12px rgba(230,57,70,0.2)'
                  }}
                >
                  <Sparkles size={16} /> Buat Gambar dengan AI
                </button>
                
                <div style={{ marginTop: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--admin-text-secondary)', marginBottom: '8px' }}>URL Video YouTube (Opsional)</label>
                  <input 
                    type="url"
                    value={formData.videoUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
                    placeholder="https://youtube.com/watch?v=..."
                    style={{ width: '100%', padding: '10px 14px', background: 'var(--admin-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '8px', color: 'var(--admin-text-primary)', fontSize: '14px', outline: 'none' }}
                  />
                  <p style={{ fontSize: '11px', color: 'var(--admin-text-secondary)', marginTop: '6px' }}>Jika diisi, video akan menggantikan posisi gambar utama di halaman detail berita.</p>
                </div>
              </div>

              {/* Publish Settings Card */}
              <div style={{ background: 'var(--admin-card-bg)', borderRadius: '16px', border: '1px solid var(--admin-card-border)', padding: '24px' }}>
                <h3 style={{ fontSize: '14px', color: 'var(--admin-text-primary)', marginBottom: '20px', borderBottom: '1px solid var(--admin-card-border)', paddingBottom: '12px' }}>Pengaturan Publikasi</h3>
                
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', display: 'block', marginBottom: '8px' }}>Kategori</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button 
                        type="button" 
                        onClick={handleAddCategory}
                        className="editor-mobile-action-btn"
                        style={{ flex: 1, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', transition: 'all 0.2s', minHeight: '44px', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                      >
                        <Plus size={13} /> + Baru
                      </button>
                      <button 
                        type="button" 
                        onClick={autoSelectCategory}
                        className="editor-mobile-action-btn"
                        style={{ flex: 2, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', transition: 'all 0.2s', minHeight: '44px', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                      >
                        <Sparkles size={13} /> ✨ Auto Kategori
                      </button>
                    </div>
                  </div>
                  <select 
                    name="category" 
                    value={formData.category} 
                    onChange={handleChange} 
                    style={{ width: '100%', padding: '12px', background: 'var(--admin-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '8px', color: 'var(--admin-text-primary)', outline: 'none' }}
                  >
                    {categories.length > 0 ? (
                      categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))
                    ) : (
                      <option value="Nasional">Nasional</option>
                    )}
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--admin-text-secondary)', marginBottom: '8px' }}>Status {userRole === 'reporter' && <span style={{color:'#ffc107'}}>(Hanya Draf)</span>}</label>
                  <select 
                    name="status" 
                    value={userRole === 'reporter' ? 'draft' : formData.status} 
                    onChange={handleChange} 
                    style={{ width: '100%', padding: '12px', background: 'var(--admin-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '8px', color: 'var(--admin-text-primary)', outline: 'none' }}
                    disabled={userRole === 'reporter'}
                  >
                    <option value="draft">Draft (Simpan Sementara)</option>
                    {userRole !== 'reporter' && (
                      <>
                        <option value="scheduled">Scheduled (Jadwalkan Tayang Otomatis)</option>
                        <option value="published">Published (Langsung Tayang)</option>
                      </>
                    )}
                  </select>
                </div>

                {formData.status === 'scheduled' && (
                  <div style={{ marginBottom: '16px', padding: '16px', background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#d8b4fe', fontWeight: 700, marginBottom: '10px' }}>
                      <Clock size={15} /> Atur Tanggal & Jam Tayang Otomatis
                    </label>
                    <input
                      type="datetime-local"
                      name="scheduledAt"
                      value={formData.scheduledAt}
                      onChange={handleChange}
                      required={formData.status === 'scheduled'}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'var(--admin-bg)',
                        border: '1px solid rgba(168, 85, 247, 0.4)',
                        borderRadius: '8px',
                        color: 'var(--admin-text-primary)',
                        fontSize: '13px',
                        outline: 'none',
                        marginBottom: '10px'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setHours(d.getHours() + 1);
                          const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                          setFormData(prev => ({ ...prev, scheduledAt: localIso }));
                        }}
                        style={{ background: 'rgba(168, 85, 247, 0.2)', border: 'none', color: '#e9d5ff', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        +1 Jam
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + 1);
                          d.setHours(8, 0, 0, 0);
                          const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                          setFormData(prev => ({ ...prev, scheduledAt: localIso }));
                        }}
                        style={{ background: 'rgba(168, 85, 247, 0.2)', border: 'none', color: '#e9d5ff', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Besok Pagi (08:00)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + 1);
                          d.setHours(17, 0, 0, 0);
                          const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                          setFormData(prev => ({ ...prev, scheduledAt: localIso }));
                        }}
                        style={{ background: 'rgba(168, 85, 247, 0.2)', border: 'none', color: '#e9d5ff', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Besok Sore (17:00)
                      </button>
                    </div>
                    <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#a855f7', lineHeight: 1.4 }}>
                      Berita akan otomatis terbit dan dapat dibaca publik setelah jam yang ditentukan tiba.
                    </p>
                  </div>
                )}

                <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(255, 193, 7, 0.05)', border: '1px solid rgba(255, 193, 7, 0.2)', borderRadius: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', margin: 0 }}>
                    <input 
                      type="checkbox" 
                      name="isHeadline" 
                      checked={formData.isHeadline} 
                      onChange={handleChange}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)' }}
                    />
                    <span style={{ fontSize: '13px', color: 'var(--admin-text-primary)', fontWeight: 500, lineHeight: 1.4 }}>
                      Jadikan Headline Utama Halaman Depan
                    </span>
                  </label>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* Modern Custom Category Modal */}
      {catModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(10, 10, 15, 0.85)',
          backdropFilter: 'blur(16px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            background: 'var(--admin-card-bg)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '480px',
            padding: '36px 28px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.75), 0 0 50px rgba(16, 185, 129, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '60px', height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.35))',
                border: '2px solid rgba(16, 185, 129, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
                boxShadow: '0 0 35px rgba(16, 185, 129, 0.35)'
              }}>
                <Plus size={32} />
              </div>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--admin-text-primary)', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>Kategori Baru</h2>
                <p style={{ color: 'var(--admin-text-secondary)', fontSize: '14px', margin: 0 }}>Tambahkan kategori baru ke portal.</p>
              </div>
            </div>

            <div>
              <input
                type="text"
                autoFocus
                placeholder="Misal: Nasional, Edukasi, Olahraga..."
                value={catModal.name}
                onChange={(e) => setCatModal(prev => ({ ...prev, name: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && saveNewCategory()}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'var(--admin-bg)',
                  border: '2px solid rgba(16, 185, 129, 0.5)',
                  borderRadius: '12px',
                  color: 'var(--admin-text-primary)',
                  fontSize: '16px',
                  outline: 'none',
                  boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.05)'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setCatModal(prev => ({ ...prev, isOpen: false }))}
                disabled={catModal.loading}
                style={{
                  flex: 1, padding: '16px',
                  background: 'transparent',
                  border: '1px solid var(--admin-border)',
                  borderRadius: '12px',
                  color: 'var(--admin-text-primary)',
                  fontSize: '15px', fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Batal
              </button>
              <button 
                onClick={saveNewCategory}
                disabled={catModal.loading || !catModal.name.trim()}
                style={{
                  flex: 1, padding: '16px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '15px', fontWeight: 700,
                  cursor: catModal.loading || !catModal.name.trim() ? 'not-allowed' : 'pointer',
                  opacity: catModal.loading || !catModal.name.trim() ? 0.7 : 1,
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
                }}
              >
                {catModal.loading ? 'Menyimpan...' : 'Simpan Kategori'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ultra-Modern Glassmorphism Custom Notification Modal */}
      {notifModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(10, 10, 15, 0.85)',
          backdropFilter: 'blur(16px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            background: 'var(--admin-card-bg)',
            border: notifModal.type === 'success' ? '1px solid rgba(74, 222, 128, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '480px',
            padding: '36px 28px',
            textAlign: 'center',
            boxShadow: notifModal.type === 'success' 
              ? '0 25px 60px rgba(0,0,0,0.75), 0 0 50px rgba(74, 222, 128, 0.15)'
              : '0 25px 60px rgba(0,0,0,0.75), 0 0 50px rgba(239, 68, 68, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px'
          }}>
            <div style={{
              width: '80px', height: '80px',
              borderRadius: '50%',
              background: notifModal.type === 'success'
                ? 'linear-gradient(135deg, rgba(74, 222, 128, 0.2), rgba(16, 185, 129, 0.35))'
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.35))',
              border: notifModal.type === 'success'
                ? '2px solid rgba(74, 222, 128, 0.6)'
                : '2px solid rgba(239, 68, 68, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: notifModal.type === 'success' ? '#4ade80' : '#ef4444',
              boxShadow: notifModal.type === 'success'
                ? '0 0 35px rgba(74, 222, 128, 0.35)'
                : '0 0 35px rgba(239, 68, 68, 0.35)'
            }}>
              {notifModal.type === 'success' ? <CheckCircle2 size={44} /> : <Sparkles size={44} />}
            </div>

            <div>
              <h3 style={{
                margin: '0 0 10px 0',
                fontSize: '22px',
                fontWeight: 800,
                color: 'var(--admin-text-primary)'
              }}>
                {notifModal.title}
              </h3>
              <p style={{
                margin: 0,
                fontSize: '14.5px',
                color: 'var(--admin-text-secondary)',
                lineHeight: 1.6
              }}>
                {notifModal.message}
              </p>
            </div>

            {notifModal.type === 'success' ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                width: '100%',
                marginTop: '10px'
              }}>
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                  <button
                    onClick={() => {
                      setNotifModal({ ...notifModal, isOpen: false });
                      router.push('/admin/articles');
                    }}
                    style={{
                      flex: 1,
                      padding: '13px 18px',
                      borderRadius: '12px',
                      background: 'var(--admin-hover-bg)',
                      border: '1px solid var(--admin-border)',
                      color: 'var(--admin-text-primary)',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    📰 Daftar Semua Berita
                  </button>

                  {notifModal.articleSlug && (
                    <a
                      href={`/article/${notifModal.articleSlug}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        flex: 1,
                        padding: '13px 18px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, var(--color-accent) 0%, #ff8a65 100%)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '14px',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 16px rgba(230, 57, 70, 0.4)'
                      }}
                    >
                      👁️ Lihat Live Berita
                    </a>
                  )}
                </div>

                {/* Auto-Broadcast & Medsos Distribution Hub */}
                {notifModal.articleSlug && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '16px',
                    padding: '16px',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📢 DISTRIBUSI & AUTO-BROADCAST INSTAN
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--admin-text-secondary)', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '10px' }}>
                        1-Klik Blast
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
                      <button
                        onClick={() => {
                          const url = `https://bedainnews.com/article/${notifModal.articleSlug}`;
                          const text = `🚨 *BREAKING NEWS - BEDAIN NEWS* 🚨\n\n*${formData.title}*\n\n🔗 Baca selengkapnya:\n${url}\n\n#Bedain News #BeritaTerkini`;
                          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                        }}
                        style={{
                          padding: '10px 8px',
                          borderRadius: '10px',
                          background: '#25D366',
                          color: '#fff',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px'
                        }}
                      >
                        💬 WA Group
                      </button>

                      <button
                        onClick={() => {
                          const url = `https://bedainnews.com/article/${notifModal.articleSlug}`;
                          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
                        }}
                        style={{
                          padding: '10px 8px',
                          borderRadius: '10px',
                          background: '#1877F2',
                          color: '#fff',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px'
                        }}
                      >
                        📘 FB
                      </button>

                      <button
                        onClick={() => {
                          const url = `https://bedainnews.com/article/${notifModal.articleSlug}`;
                          const text = `🚨 BREAKING NEWS: ${formData.title}`;
                          window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
                        }}
                        style={{
                          padding: '10px 8px',
                          borderRadius: '10px',
                          background: '#0088cc',
                          color: '#fff',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px'
                        }}
                      >
                        ✈️ Telegram
                      </button>

                      <button
                        onClick={() => {
                          const url = `https://bedainnews.com/article/${notifModal.articleSlug}`;
                          const text = `🚨 BREAKING NEWS: ${formData.title} @Bedain News`;
                          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
                        }}
                        style={{
                          padding: '10px 8px',
                          borderRadius: '10px',
                          background: '#14171A',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.2)',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px'
                        }}
                      >
                        𝕏 X
                      </button>
                    </div>

                    <button
                      onClick={(e) => {
                        const url = `https://bedainnews.com/article/${notifModal.articleSlug}`;
                        const text = `🚨 *BREAKING NEWS - BEDAIN NEWS* 🚨\n\n*${formData.title}*\n\n🔗 Baca selengkapnya:\n${url}\n\n#Bedain News #BeritaTerkini`;
                        navigator.clipboard.writeText(text);
                        const btn = e.currentTarget;
                        const orig = btn.innerHTML;
                        btn.innerHTML = '✅ Format Broadcast Berhasil Disalin!';
                        btn.style.background = 'rgba(74, 222, 128, 0.2)';
                        btn.style.borderColor = '#4ade80';
                        setTimeout(() => {
                          btn.innerHTML = orig;
                          btn.style.background = 'rgba(255, 255, 255, 0.05)';
                          btn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                        }, 2500);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: 'var(--admin-text-primary)',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      📋 Salin Template Pesan Broadcast (Siap Tempel)
                    </button>
                  </div>
                )}

                <button
                  onClick={() => {
                    setNotifModal({ ...notifModal, isOpen: false });
                  }}
                  style={{
                    width: '100%',
                    padding: '11px 18px',
                    borderRadius: '10px',
                    background: 'transparent',
                    border: '1px solid var(--admin-border)',
                    color: 'var(--admin-text-secondary)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  ✏️ Tetap di Halaman Editor
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setNotifModal({ ...notifModal, isOpen: false });
                  setIsAIModalOpen(true);
                }}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, var(--color-accent) 0%, #ff8a65 100%)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(230, 57, 70, 0.4)'
                }}
              >
                🔑 Mengerti & Perbaiki (Buka Pengaturan API Key AI)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(10, 10, 15, 0.85)',
          backdropFilter: 'blur(16px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            background: 'var(--admin-card-bg)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '440px',
            padding: '32px',
            textAlign: 'center',
            boxShadow: '0 25px 60px rgba(0,0,0,0.75), 0 0 50px rgba(239, 68, 68, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px'
          }}>
            <div style={{
              width: '70px', height: '70px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.35))',
              border: '2px solid rgba(239, 68, 68, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              boxShadow: '0 0 30px rgba(239, 68, 68, 0.35)'
            }}>
              <AlertTriangle size={36} />
            </div>

            <div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
                Format Ulang Paragraf?
              </h3>
              <p style={{ margin: 0, fontSize: '14.5px', color: 'var(--admin-text-secondary)', lineHeight: 1.6 }}>
                Peringatan: Merapikan paragraf akan <b>mereset semua format teks</b> (tebal, miring, link, gambar) yang sudah ada di dalam editor. Lanjutkan?
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '10px' }}>
              <button
                onClick={() => setConfirmModal({ isOpen: false })}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: '12px',
                  background: 'var(--admin-hover-bg)', border: '1px solid var(--admin-border)',
                  color: 'var(--admin-text-primary)', fontWeight: 700, fontSize: '14px',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Batal
              </button>
              <button
                onClick={executeAutoFormat}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', border: 'none',
                  color: '#fff', fontWeight: 700, fontSize: '14px',
                  cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)'
                }}
              >
                Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* AI Assistant Modal */}
      <AIAssistantModal 
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        currentTitle={formData.title}
        currentExcerpt={formData.seoDescription}
        currentContent={formData.content}
        onApplyTitle={(title) => setFormData(prev => ({ ...prev, title }))}
        onApplyExcerpt={(seoDescription) => setFormData(prev => ({ ...prev, seoDescription }))}
        onApplyContent={(content) => setFormData(prev => ({ ...prev, content }))}
        onApplySEO={(seo) => setFormData(prev => ({ ...prev, seoTitle: seo.seoTitle, seoDescription: seo.seoDescription }))}
      />

      {/* AI Image Generator Modal */}
      <AIGeneratorModal
        isOpen={isAIGenOpen}
        onClose={() => setIsAIGenOpen(false)}
        onApplyImage={(url) => setFormData(prev => ({ 
          ...prev, 
          imageUrl: url,
          imageCaption: prev.imageCaption ? prev.imageCaption : 'Ilustrasi dibuat oleh Bedain AI'
        }))}
      />
    </div>
  );
};

export default ArticleEditor;
