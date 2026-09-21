import { collection, addDoc, getDocs, query, where, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

export const newCategories = [
  { name: 'AI & Tech', slug: 'ai-tech', color: '#3b82f6', active: true, order: 1, homeLayout: 'grid' },
  { name: 'Bisnis', slug: 'bisnis', color: '#10b981', active: true, order: 2, homeLayout: 'zigzag' },
  { name: 'Finansial', slug: 'finansial', color: '#f59e0b', active: true, order: 3, homeLayout: 'grid' },
  { name: 'Produktivitas', slug: 'produktivitas', color: '#8b5cf6', active: true, order: 4, homeLayout: 'grid' },
  { name: 'Wellness', slug: 'wellness', color: '#ec4899', active: true, order: 5, homeLayout: 'zigzag' },
  { name: 'Eco-Living', slug: 'eco-living', color: '#22c55e', active: true, order: 6, homeLayout: 'grid' },
  { name: 'Keamanan', slug: 'keamanan', color: '#ef4444', active: true, order: 7, homeLayout: 'grid' },
  { name: 'Karir', slug: 'karir', color: '#06b6d4', active: true, order: 8, homeLayout: 'zigzag' },
  { name: 'Gadget', slug: 'gadget', color: '#6366f1', active: true, order: 9, homeLayout: 'grid' },
  { name: 'Mobilitas', slug: 'mobilitas', color: '#14b8a6', active: true, order: 10, homeLayout: 'grid' }
];

export const dummyArticles = [
  {
    title: "Mengungkap Potensi AGI: Kapan Mesin Bisa Menyamai Kecerdasan Manusia?",
    slug: "mengungkap-potensi-agi-mesin-menyamai-kecerdasan-manusia",
    excerpt: "Para ilmuwan top Silicon Valley memprediksi bahwa Artificial General Intelligence (AGI) akan terwujud dalam dekade ini. Apa dampaknya bagi kita?",
    content: "<p>Dunia teknologi kini berpacu menuju era Artificial General Intelligence (AGI) – sistem kecerdasan buatan yang mampu memahami, belajar, dan menerapkan pengetahuan setara dengan akal budi manusia.</p><p>CEO raksasa teknologi meyakini bahwa lompatan besar ini tidak hanya akan merevolusi industri perangkat lunak, tetapi juga akan memecahkan tantangan medis dan krisis iklim yang selama ini menjadi misteri bagi umat manusia.</p><p>Meski demikian, para ahli etika menyoroti perlunya regulasi yang ketat agar AGI tidak menjadi ancaman eksistensial bagi peradaban.</p>",
    category: "AI & Tech",
    author: { name: "Redaksi Pioner", email: "redaksi@bedainnews.com" },
    authorId: "seed-admin",
    coverImage: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80",
    publishedAt: Timestamp.now(),
    createdAt: Timestamp.now(),
    isHeadline: true,
    isBreaking: false,
    views: 85200,
    status: "published",
    tags: ["AI", "Teknologi", "Masa Depan"]
  },
  {
    title: "Strategi Bisnis Modern: Mengapa Model Subscription Menjadi Pilihan Utama Startup",
    slug: "strategi-bisnis-modern-model-subscription",
    excerpt: "Beralih dari penjualan satu kali putus, perusahaan kini berlomba membangun basis pelanggan setia lewat sistem langganan bulanan.",
    content: "<p>Model bisnis berbasis langganan (subscription) terbukti mampu menjaga arus kas perusahaan tetap stabil meski di tengah ketidakpastian ekonomi global.</p><p>Dari perangkat lunak, platform streaming, hingga layanan pengiriman kopi harian, para pendiri startup menyadari bahwa 'Recurring Revenue' adalah kunci untuk meyakinkan investor pada tahap pendanaan lanjutan.</p><p>Analisis pasar menunjukkan bahwa perusahaan dengan model subscription memiliki valuasi rata-rata 30% lebih tinggi dibanding perusahaan e-commerce tradisional.</p>",
    category: "Bisnis",
    author: { name: "Redaksi Pioner", email: "redaksi@bedainnews.com" },
    authorId: "seed-admin",
    coverImage: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80",
    publishedAt: Timestamp.now(),
    createdAt: Timestamp.now(),
    isHeadline: true,
    isBreaking: false,
    views: 42100,
    status: "published",
    tags: ["Bisnis", "Startup", "Strategi"]
  },
  {
    title: "Suku Bunga Turun: Momentum Emas untuk Investasi Reksa Dana Indeks",
    slug: "suku-bunga-turun-investasi-reksa-dana-indeks",
    excerpt: "Kebijakan pelonggaran moneter bank sentral menjadi sinyal positif bagi instrumen investasi berbasis ekuitas di pasar modal.",
    content: "<p>Keputusan bank sentral untuk memangkas suku bunga acuan telah memicu aliran dana masuk ke bursa saham secara masif. Bagi investor pemula, ini adalah momentum terbaik untuk mulai mengalokasikan portofolio ke Reksa Dana Indeks (Index Fund).</p><p>Para perencana keuangan menyarankan alokasi rutin setiap bulan (Dollar Cost Averaging) pada indeks LQ45 atau IDX30 karena terbukti mampu mengalahkan inflasi dalam jangka panjang.</p><p>Hindari spekulasi pada saham gorengan dan fokuslah pada pertumbuhan compounding interest yang stabil.</p>",
    category: "Finansial",
    author: { name: "Redaksi Pioner", email: "redaksi@bedainnews.com" },
    authorId: "seed-admin",
    coverImage: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80",
    publishedAt: Timestamp.now(),
    createdAt: Timestamp.now(),
    isHeadline: false,
    isBreaking: false,
    views: 31500,
    status: "published",
    tags: ["Investasi", "Saham", "Finansial"]
  },
  {
    title: "Teknik Pomodoro 2.0: Cara Eksekutif Top Mengelola Waktu Tanpa Stres",
    slug: "teknik-pomodoro-2-0-kelola-waktu",
    excerpt: "Lupakan manajemen waktu kuno. Pendekatan baru ini menggabungkan fokus mendalam (Deep Work) dengan siklus istirahat otak yang optimal.",
    content: "<p>Banyak profesional merasa kewalahan dengan tumpukan email dan rapat yang tak berujung. Teknik Pomodoro klasik (25 menit kerja, 5 menit istirahat) kini telah diadaptasi menjadi 'Pomodoro 2.0' untuk era kerja hybrid.</p><p>Aturan barunya adalah 90 menit fokus penuh (Deep Work) tanpa gangguan sama sekali, diikuti 20 menit istirahat total jauh dari layar gawai. Siklus ini diselaraskan dengan ritme ultradian alami tubuh manusia.</p><p>CEO perusahaan multinasional membuktikan bahwa metode ini dapat meningkatkan produktivitas harian hingga 40% sekaligus mencegah kelelahan mental.</p>",
    category: "Produktivitas",
    author: { name: "Redaksi Pioner", email: "redaksi@bedainnews.com" },
    authorId: "seed-admin",
    coverImage: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80",
    publishedAt: Timestamp.now(),
    createdAt: Timestamp.now(),
    isHeadline: false,
    isBreaking: false,
    views: 56300,
    status: "published",
    tags: ["Produktivitas", "Karir", "Tips"]
  },
  {
    title: "Mengenal 'Digital Detox' Akhir Pekan untuk Memulihkan Kewarasan Mental",
    slug: "mengenal-digital-detox-akhir-pekan-kewarasan",
    excerpt: "Paparan layar yang terus-menerus memicu lonjakan kortisol. Saatnya mengistirahatkan mata dan pikiran Anda dari notifikasi media sosial.",
    content: "<p>Kapan terakhir kali Anda menghabiskan akhir pekan tanpa mengecek ponsel sama sekali? Psikolog klinis menekankan pentingnya puasa digital atau 'Digital Detox' selama minimal 24 jam setiap minggu.</p><p>Terlepas dari layar gawai dapat membantu otak mengatur ulang kadar dopamin, meningkatkan kualitas tidur, dan memperbaiki hubungan interpersonal di dunia nyata.</p><p>Mulai dengan langkah kecil: tinggalkan ponsel di kamar saat Anda makan siang atau membaca buku di hari Minggu pagi.</p>",
    category: "Wellness",
    author: { name: "Redaksi Pioner", email: "redaksi@bedainnews.com" },
    authorId: "seed-admin",
    coverImage: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
    publishedAt: Timestamp.now(),
    createdAt: Timestamp.now(),
    isHeadline: false,
    isBreaking: false,
    views: 49800,
    status: "published",
    tags: ["Kesehatan", "Mental", "Wellness"]
  },
  {
    title: "Rumah Pintar Bertenaga Surya: Tren Arsitektur Ramah Lingkungan 2026",
    slug: "rumah-pintar-bertenaga-surya-tren-arsitektur",
    excerpt: "Menggabungkan teknologi IoT dengan panel surya atap, hunian masa depan kini bisa memproduksi energinya sendiri secara mandiri.",
    content: "<p>Desain arsitektur perumahan mewah kini tidak lagi hanya berbicara soal estetika, melainkan juga efisiensi energi. Konsep 'Net Zero Energy Home' menjadi tren paling diminati kaum urban progresif.</p><p>Dengan integrasi panel surya efisiensi tinggi, baterai penyimpan daya rumah tangga, dan perangkat IoT cerdas yang mengatur suhu ruangan secara otomatis, pemilik rumah dapat memangkas tagihan listrik hingga 80%.</p><p>Langkah ini merupakan kontribusi nyata dalam gaya hidup Eco-Living guna mengurangi jejak karbon di area perkotaan.</p>",
    category: "Eco-Living",
    author: { name: "Redaksi Pioner", email: "redaksi@bedainnews.com" },
    authorId: "seed-admin",
    coverImage: "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=1200&q=80",
    publishedAt: Timestamp.now(),
    createdAt: Timestamp.now(),
    isHeadline: false,
    isBreaking: false,
    views: 22100,
    status: "published",
    tags: ["Eco-Living", "Smart Home", "Solar"]
  },
  {
    title: "Awas! Serangan Phishing Era AI Kini Semakin Sulit Dikenali",
    slug: "awas-serangan-phishing-era-ai-makin-sulit",
    excerpt: "Hacker memanfaatkan kecerdasan buatan untuk meniru suara dan gaya bahasa atasan Anda dengan sangat sempurna. Begini cara menghindarinya.",
    content: "<p>Keamanan siber menghadapi tantangan baru dengan maraknya serangan 'Spear Phishing' yang digerakkan oleh AI generatif. Teks penipuan kini tidak lagi kaku atau penuh salah eja.</p><p>Lebih parah lagi, teknologi deepfake audio memungkinkan peretas untuk mengkloning suara eksekutif perusahaan melalui telepon genggam guna menginstruksikan transfer dana mendesak.</p><p>Pakar keamanan menyarankan implementasi sistem verifikasi ganda (2FA) berbasis perangkat keras dan verifikasi visual untuk setiap transaksi finansial bernilai besar.</p>",
    category: "Keamanan",
    author: { name: "Redaksi Pioner", email: "redaksi@bedainnews.com" },
    authorId: "seed-admin",
    coverImage: "https://images.unsplash.com/photo-1614064641913-a5323ea9df85?auto=format&fit=crop&w=1200&q=80",
    publishedAt: Timestamp.now(),
    createdAt: Timestamp.now(),
    isHeadline: false,
    isBreaking: true,
    views: 67400,
    status: "published",
    tags: ["Cybersecurity", "AI", "Phishing"]
  },
  {
    title: "Mengapa 'Quiet Quitting' Bukan Solusi Karir Jangka Panjang Anda",
    slug: "mengapa-quiet-quitting-bukan-solusi-karir",
    excerpt: "Melakukan pekerjaan seadanya untuk menghindari burnout mungkin terdengar menarik, namun ini bisa mematikan prospek karir Anda di masa depan.",
    content: "<p>Fenomena 'Quiet Quitting'—bekerja hanya sesuai batas minimum deskripsi pekerjaan—sempat viral di kalangan pekerja muda sebagai bentuk protes terhadap budaya gila kerja (hustle culture).</p><p>Namun, para konsultan karir memperingatkan bahwa sikap apatis ini dapat membunuh antusiasme profesional dan membuat Anda terlewatkan saat promosi jabatan tiba.</p><p>Solusi yang lebih baik adalah bernegosiasi secara terbuka dengan atasan mengenai beban kerja dan menetapkan batas profesional yang tegas tanpa kehilangan komitmen pada kualitas hasil kerja.</p>",
    category: "Karir",
    author: { name: "Redaksi Pioner", email: "redaksi@bedainnews.com" },
    authorId: "seed-admin",
    coverImage: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
    publishedAt: Timestamp.now(),
    createdAt: Timestamp.now(),
    isHeadline: false,
    isBreaking: false,
    views: 39500,
    status: "published",
    tags: ["Karir", "Profesional", "Kerja"]
  },
  {
    title: "Bocoran Flagship Terbaru: Kamera Periskop 200MP yang Mengguncang Pasar",
    slug: "bocoran-flagship-terbaru-kamera-periskop-200mp",
    excerpt: "Persaingan lensa fotografi ponsel pintar kian memanas. Inovasi sensor raksasa siap mengubah ponsel menjadi kamera profesional sungguhan.",
    content: "<p>Industri gadget dikejutkan dengan bocoran paten desain smartphone flagship dari pabrikan ternama yang mengusung modul kamera periskop dengan resolusi masif 200 Megapixel.</p><p>Sensor raksasa ini diklaim mampu menangkap cahaya 40% lebih banyak pada malam hari, serta menawarkan fitur optical zoom hingga 10x tanpa kehilangan detail pixel sedikitpun.</p><p>Bagi para konten kreator, ini berarti mereka tidak perlu lagi membawa perlengkapan kamera Mirrorless yang berat saat bepergian.</p>",
    category: "Gadget",
    author: { name: "Redaksi Pioner", email: "redaksi@bedainnews.com" },
    authorId: "seed-admin",
    coverImage: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80",
    publishedAt: Timestamp.now(),
    createdAt: Timestamp.now(),
    isHeadline: false,
    isBreaking: false,
    views: 92100,
    status: "published",
    tags: ["Gadget", "Smartphone", "Fotografi"]
  },
  {
    title: "Infrastruktur Pengisian Daya Cepat: Kunci Utama Revolusi Kendaraan Listrik",
    slug: "infrastruktur-pengisian-daya-cepat-kunci-kendaraan-listrik",
    excerpt: "Adopsi mobil listrik tidak akan maksimal tanpa ketersediaan stasiun pengisian daya super cepat (Fast Charging) di sepanjang jalan tol.",
    content: "<p>Transisi menuju mobilitas tanpa emisi kini bergantung penuh pada pembangunan infrastruktur pendukung. Konsumen masih ragu beralih ke kendaraan listrik (EV) akibat kekhawatiran 'Range Anxiety' atau kehabisan baterai di tengah perjalanan jauh.</p><p>Pemerintah bersama konsorsium BUMN energi kini tengah mempercepat pembangunan fasilitas Ultra Fast Charging berkapasitas 350kW di rest area tol utama.</p><p>Dengan teknologi ini, pengguna EV hanya butuh waktu 15 menit untuk mengisi daya baterai dari 20% hingga 80%, setara dengan durasi singgah di kedai kopi.</p>",
    category: "Mobilitas",
    author: { name: "Redaksi Pioner", email: "redaksi@bedainnews.com" },
    authorId: "seed-admin",
    coverImage: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1200&q=80",
    publishedAt: Timestamp.now(),
    createdAt: Timestamp.now(),
    isHeadline: false,
    isBreaking: false,
    views: 45600,
    status: "published",
    tags: ["EV", "Otomotif", "Mobilitas"]
  }
];

export const seedAllDummyArticles = async () => {
  try {
    console.log("Starting full re-seed protocol...");
    
    // 1. DELETE OLD CATEGORIES & ADD NEW ONES
    const catsRef = collection(db, 'categories');
    const catSnap = await getDocs(catsRef);
    for (const d of catSnap.docs) {
      await deleteDoc(doc(db, 'categories', d.id));
    }
    for (const cat of newCategories) {
      await addDoc(catsRef, cat);
    }
    console.log("Categories reset complete.");

    // 2. DELETE OLD SEED ARTICLES
    const articlesRef = collection(db, 'articles');
    const artSnap = await getDocs(articlesRef);
    for (const d of artSnap.docs) {
      if (d.data().authorId === 'seed-admin') {
        await deleteDoc(doc(db, 'articles', d.id));
      }
    }
    console.log("Old seed articles cleaned.");

    // 3. ADD NEW SEED ARTICLES
    let addedCount = 0;
    for (const article of dummyArticles) {
      await addDoc(articlesRef, article);
      addedCount++;
    }
    
    console.log(`Successfully imported ${addedCount} premium articles!`);
    return addedCount;
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

export const seedDatabase = async () => {
  try {
    const count = await seedAllDummyArticles();
    alert(`BERHASIL! Bedain News kini telah di-reset dengan 10 Kategori Premium dan ${count} Artikel Eksklusif!`);
  } catch (error) {
    alert('Error seeding database: ' + error.message);
  }
};
