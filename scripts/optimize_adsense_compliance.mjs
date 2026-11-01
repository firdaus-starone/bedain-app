import fs from 'fs';
import os from 'os';
import path from 'path';

const configPath = path.join(os.homedir(), '.config/configstore/firebase-tools.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const token = config.tokens.access_token;

const BASE_URL = 'https://firestore.googleapis.com/v1/projects/bedain-eb6a6/databases/(default)/documents';

async function updateDoc(collectionPath, docId, fields) {
  const url = `${BASE_URL}/${collectionPath}/${docId}?updateMask.fieldPaths=${Object.keys(fields).join('&updateMask.fieldPaths=')}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to update ${collectionPath}/${docId}: ${err}`);
  }
  return await res.json();
}

async function run() {
  console.log('--- 1. Memperbarui Kategori (Nonaktifkan kategori kosong / < 4 artikel) ---');
  // Ambil semua artikel untuk hitung kategori
  const articlesRes = await fetch(`${BASE_URL}/articles?pageSize=1000`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const articlesData = await articlesRes.json();
  const catCounts = {};
  if (articlesData.documents) {
    articlesData.documents.forEach(doc => {
      const f = doc.fields || {};
      const status = f.status?.stringValue;
      if (status === 'published') {
        const cat = f.category?.stringValue || 'Tanpa Kategori';
        catCounts[cat] = (catCounts[cat] || 0) + 1;
      }
    });
  }

  const catsRes = await fetch(`${BASE_URL}/categories?pageSize=100`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const catsData = await catsRes.json();
  if (catsData.documents) {
    for (const c of catsData.documents) {
      const docId = c.name.split('/').pop();
      const f = c.fields || {};
      const name = f.name?.stringValue || docId;
      const count = catCounts[name] || 0;
      if (count < 4) {
        console.log(`Menonaktifkan kategori: ${name} (${count} artikel)`);
        await updateDoc('categories', docId, {
          active: { booleanValue: false },
          updatedAt: { timestampValue: new Date().toISOString() }
        });
      }
    }
  }

  console.log('\n--- 2. Memperbarui Kebijakan Privasi (Standar Google AdSense) ---');
  const privacyContent = `
<h2>Kebijakan Privasi (Privacy Policy) Bedain News</h2>
<p>Terakhir diperbarui: 29 Oktober 2026</p>
<p>Selamat datang di <strong>Bedain News</strong> (dapat diakses melalui <a href="https://bedainnews.com">bedainnews.com</a>). Kami berkomitmen tinggi untuk melindungi dan menghormati hak privasi setiap pengunjung serta pembaca kami. Kebijakan Privasi ini disusun sebagai wujud kepatuhan terhadap Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP) serta standar perlindungan privasi periklanan internasional termasuk Kebijakan Penayang Google (Google Publisher Policies).</p>

<h3>1. Informasi yang Kami Kumpulkan</h3>
<p>Saat Anda mengakses dan menggunakan layanan Bedain News, kami dapat mengumpulkan beberapa jenis data:</p>
<ul>
  <li><strong>Data Otomatis (Log Files):</strong> Seperti halnya situs berita profesional lainnya, sistem kami secara otomatis merekam informasi standar log server, termasuk alamat Protokol Internet (IP address), jenis peramban (browser type), Penyedia Layanan Internet (ISP), tanggal dan cap waktu (timestamp), halaman perujuk/keluar (referring/exit pages), dan perkiraan wilayah geografis (kota) untuk keperluan analisis tren dan pengoptimalan performa situs.</li>
  <li><strong>Data yang Anda Berikan Secara Sukarela:</strong> Jika Anda berinteraksi dengan fitur di situs kami (seperti mengirim komentar, berlangganan notifikasi web push, menghubungi redaksi, atau mengirim opini melalui formulir Kirim Tulisan), Anda mungkin memberikan nama, alamat email, dan konten komunikasi Anda.</li>
</ul>

<h3>2. Kebijakan Cookies dan Web Beacons</h3>
<p>Bedain News menggunakan teknologi <em>cookies</em> untuk menyimpan preferensi pengguna (seperti pilihan mode tampilan gelap/terang atau pengaturan bahasa), merekam data sesi navigasi, serta memastikan kecepatan dan kenyamanan saat membaca artikel berita.</p>

<h3>3. Google AdSense dan Cookie DoubleClick DART</h3>
<p>Bedain News bekerja sama dengan <strong>Google AdSense</strong> sebagai mitra periklanan pihak ketiga untuk menayangkan iklan saat Anda mengunjungi situs kami:</p>
<ul>
  <li>Google, sebagai vendor pihak ketiga, menggunakan <em>cookies</em> untuk menayangkan iklan di Bedain News.</li>
  <li>Penggunaan <strong>cookie DART</strong> memungkinkan Google dan mitra iklannya untuk menayangkan iklan kepada pengguna kami berdasarkan kunjungan mereka ke <em>bedainnews.com</em> dan/atau situs web lain di internet.</li>
  <li>Pengguna dapat memilih untuk menonaktifkan atau menyisihkan diri (<em>opt-out</em>) dari penggunaan cookie DART untuk iklan berbasis minat dengan mengunjungi <strong><a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">Kebijakan Privasi Jaringan Iklan dan Konten Google</a></strong>.</li>
  <li>Anda juga dapat menonaktifkan cookie periklanan yang dipersonalisasi dari vendor pihak ketiga dengan mengunjungi laman resmi <strong><a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">AboutAds.info</a></strong> atau melalui pengaturan peramban web (browser) masing-masing.</li>
</ul>

<h3>4. Mitra Periklanan dan Analitik Pihak Ketiga</h3>
<p>Server iklan pihak ketiga atau jaringan iklan dapat menggunakan teknologi seperti cookies, JavaScript, atau Web Beacons dalam iklan dan tautan masing-masing yang muncul di Bedain News. Mereka secara otomatis menerima alamat IP Anda ketika hal ini terjadi. Teknologi ini digunakan untuk mengukur efektivitas kampanye iklan mereka dan/atau untuk mempersonalisasi konten iklan yang Anda lihat.</p>
<p>Harap diperhatikan bahwa Bedain News tidak memiliki akses atau kendali atas cookies yang digunakan oleh pengiklan pihak ketiga tersebut.</p>

<h3>5. Tautan ke Situs Eksternal</h3>
<p>Artikel kami mungkin memuat tautan menuju situs eksternal atau rujukan media lain. Kami tidak bertanggung jawab atas isi materi, keamanan, atau praktik privasi situs eksternal tersebut. Kami mengimbau pembaca untuk membaca kebijakan privasi masing-masing situs yang dikunjungi.</p>

<h3>6. Hak dan Keamanan Data Pengguna</h3>
<p>Kami menerapkan protokol keamanan enkripsi Secure Socket Layer (HTTPS/SSL) untuk menjamin transmisi data pembaca aman. Anda berhak untuk meminta klarifikasi, pembaruan, maupun penghapusan data kontak yang pernah Anda kirimkan kepada kami.</p>

<h3>7. Persetujuan dan Pembaruan Kebijakan</h3>
<p>Dengan menggunakan situs web kami, Anda dengan ini menyetujui Kebijakan Privasi kami beserta syarat dan ketentuannya. Kami dapat memperbarui kebijakan ini secara berkala dan setiap perubahan akan dicantumkan secara terbuka pada laman ini.</p>

<h3>8. Hubungi Kami</h3>
<p>Jika Anda memiliki pertanyaan mengenai Kebijakan Privasi ini, penggunaan data, atau penayangan iklan di situs kami, silakan hubungi tim kami:</p>
<p>
  <strong>Redaksi Bedain News</strong><br>
  Email: <a href="mailto:bedainnews@gmail.com">bedainnews@gmail.com</a><br>
  WhatsApp: +62 821-7322-7210<br>
  Website: <a href="https://bedainnews.com">https://bedainnews.com</a>
</p>
  `.trim();

  // Doc ID untuk kebijakan-privasi adalah wDY5FZPpEBgsHUFMwrx7
  await updateDoc('pages', 'wDY5FZPpEBgsHUFMwrx7', {
    content: { stringValue: privacyContent },
    title: { stringValue: 'Kebijakan Privasi (Privacy Policy)' },
    seoDescription: { stringValue: 'Kebijakan Privasi Bedain News mengenai perlindungan data pembaca, penggunaan cookies, dan transparansi penayangan iklan Google AdSense.' },
    updatedAt: { timestampValue: new Date().toISOString() }
  });
  console.log('✓ Halaman Kebijakan Privasi berhasil diperbarui.');

  console.log('\n--- 3. Memperbarui FAQ (Memisahkan dari Privasi & Memberikan Tanya Jawab Asli) ---');
  const faqContent = `
<h2>Pertanyaan yang Sering Diajukan (FAQ) & Panduan Pembaca</h2>
<p>Berikut adalah jawaban atas pertanyaan-pertanyaan yang sering diajukan pembaca mengenai portal berita <strong>Bedain News</strong>.</p>

<h3>1. Apa itu Bedain News?</h3>
<p><strong>Bedain News</strong> (<em>bedainnews.com</em>) adalah portal berita digital independen yang menyajikan informasi berita nasional, isu kedaerahan, ekonomi, bisnis, pendidikan, sains-teknologi, dan tren gaya hidup terkini secara berimbang, faktual, dan mendalam.</p>

<h3>2. Apakah konten di Bedain News berbayar?</h3>
<p>Tidak. Seluruh artikel, liputan investigasi, analisis ekonomi, dan video di Bedain News dapat diakses secara <strong>100% gratis</strong> oleh seluruh masyarakat Indonesia dan pembaca global.</p>

<h3>3. Bagaimana standar verifikasi berita di Bedain News?</h3>
<p>Redaksi kami berpegang teguh pada Kode Etik Jurnalistik (KEJ) dan Pedoman Pemberitaan Media Siber Dewan Pers. Setiap informasi diverifikasi melalui konfirmasi narasumber resmi, perbandingan multi-sumber yang kredibel, serta kurasi ketat untuk mencegah penyebaran disinformasi dan hoaks.</p>

<h3>4. Bisakah saya mengirim artikel, rilis pers, atau opini ke Bedain News?</h3>
<p>Tentu saja! Bedain News membuka ruang partisipasi publik bagi akademisi, mahasiswa, praktisi, dan jurnalis warga. Anda dapat mengirimkan tulisan melalui menu <strong><a href="/kirim-tulisan">Kirim Tulisan</a></strong> atau mengirimkan siaran pers resmi ke email redaksi di <strong>bedainnews@gmail.com</strong>.</p>

<h3>5. Bagaimana jika ada ralat atau hak jawab atas suatu pemberitaan?</h3>
<p>Kami sangat menghormati Hak Jawab, Hak Koreksi, dan Ralat sebagaimana diatur dalam Undang-Undang Pers No. 40 Tahun 1999. Pembaca atau pihak terkait dapat menyampaikan sanggahan atau klarifikasi melalui email <strong>bedainnews@gmail.com</strong> atau kontak resmi redaksi, dan tim redaksi akan segera memproses verifikasi dan pembaruan artikel.</p>

<h3>6. Mengapa ada iklan yang tampil di Bedain News?</h3>
<p>Penayangan iklan (seperti melalui Google AdSense dan kerja sama kemitraan sponsor) adalah sumber pendapatan operasional yang memungkinkan kami untuk terus menggaji jurnalis, membiayai infrastruktur server berkecepatan tinggi, dan menyediakan berita berkualitas secara gratis tanpa sistem paywall.</p>

<h3>7. Bagaimana cara menjalin kerja sama atau periklanan dengan Bedain News?</h3>
<p>Untuk penawaran kerja sama media partner, iklan banner, artikel advertorial, atau kemitraan strategis, Anda dapat menghubungi tim bisnis kami melalui halaman <strong><a href="/kontak">Kontak Kami</a></strong> atau WhatsApp redaksi di <strong>+62 821-7322-7210</strong>.</p>
  `.trim();

  // Doc ID untuk FAQ adalah MFpfbdOWXN8waHEimyvi
  await updateDoc('pages', 'MFpfbdOWXN8waHEimyvi', {
    content: { stringValue: faqContent },
    title: { stringValue: 'FAQ (Pertanyaan Umum & Bantuan)' },
    seoDescription: { stringValue: 'Temukan jawaban atas pertanyaan umum seputar portal berita Bedain News, pengiriman tulisan, pedoman etika, dan kemitraan.' },
    updatedAt: { timestampValue: new Date().toISOString() }
  });
  console.log('✓ Halaman FAQ berhasil diperbarui dengan konten tanya jawab asli.');

  console.log('\n--- 4. Memperbarui Tentang Kami (E-E-A-T) ---');
  const aboutContent = `
<h2>Tentang Portal Berita Bedain News</h2>
<p><strong>Bedain News</strong> (<em>bedainnews.com</em>) adalah portal media siber independen nasional yang hadir dengan visi memberikan perspektif berita yang segar, berimbang, dan berdaya guna bagi kemajuan masyarakat Indonesia.</p>

<h3>Visi Kami</h3>
<p>Menjadi media digital rujukan terdepan yang menghubungkan denyut kedaerahan dengan panggung nasional, menyajikan jurnalisme yang mencerahkan, kritis, dan mengedepankan integritas data.</p>

<h3>Misi Redaksi</h3>
<ul>
  <li><strong>Menyajikan Fakta Akurat:</strong> Menjunjung tinggi verifikasi ketat sebelum publikasi untuk melawan misinformasi, hoaks, dan sensasionalisme.</li>
  <li><strong>Mendorong Literasi dan Edukasi:</strong> Menghadirkan liputan mendalam seputar ekonomi, teknologi, budaya, dan pendidikan yang memberikan nilai tambah bagi wawasan pembaca.</li>
  <li><strong>Inklusif dan Berdaya:</strong> Memberi panggung suara bagi masyarakat daerah, pelaku UMKM, talenta muda, dan komunitas inspiratif di seluruh penjuru nusantara.</li>
  <li><strong>Inovasi Teknologi Digital:</strong> Mengembangkan pengalaman membaca berita yang cepat, bersih, ramah seluler, dan mudah diakses oleh siapa saja.</li>
</ul>

<h3>Independensi dan Nilai Editorial</h3>
<p>Redaksi Bedain News menjamin kebebasan pers dan independensi editorial. Kebijakan redaksional kami bebas dari intervensi kekuatan politik praktis maupun kepentingan modal partisan. Seluruh jurnalis dan kontributor kami tunduk pada Kode Etik Jurnalistik yang ditetapkan oleh Dewan Pers Republik Indonesia.</p>

<h3>Alamat Redaksi & Kontak Operasional</h3>
<p>
  <strong>Kantor Redaksi Bedain News:</strong><br>
  Gedung Bedain Media Network<br>
  Email Redaksi: <a href="mailto:bedainnews@gmail.com">bedainnews@gmail.com</a><br>
  Layanan Pembaca & Iklan: +62 821-7322-7210<br>
  Website Resmi: <a href="https://bedainnews.com">https://bedainnews.com</a>
</p>
  `.trim();

  // Doc ID untuk tentang-kami adalah 21gnfQjwKJJdd4OggPZ7
  await updateDoc('pages', '21gnfQjwKJJdd4OggPZ7', {
    content: { stringValue: aboutContent },
    title: { stringValue: 'Tentang Kami - Profil Bedain News' },
    seoDescription: { stringValue: 'Mengenal portal berita Bedain News: Visi jurnalisme berimbang, independensi redaksi, dan dedikasi menghadirkan berita terkini bagi Indonesia.' },
    updatedAt: { timestampValue: new Date().toISOString() }
  });
  console.log('✓ Halaman Tentang Kami berhasil diperbarui.');

  console.log('\n--- 5. Memperbarui Pedoman Pemberitaan Media Siber ---');
  const pedomanContent = `
<h2>Pedoman Pemberitaan Media Siber Bedain News</h2>
<p>Kemerdekaan berpendapat, kemerdekaan berekspresi, dan kemerdekaan pers adalah hak asasi manusia yang dilindungi Pancasila, Undang-Undang Dasar 1945, dan Deklarasi Universal Hak Asasi Manusia PBB. Dalam mengelola ruang redaksi digital, <strong>Bedain News</strong> sepenuhnya menerapkan <strong>Pedoman Pemberitaan Media Siber</strong> yang dikeluarkan oleh Dewan Pers Indonesia.</p>

<h3>1. Ruang Lingkup</h3>
<p>Pedoman ini berlaku untuk seluruh produk jurnalistik, artikel berita, opini, konten multimedia, dan ruang komentar pengguna yang dipublikasikan di situs <em>bedainnews.com</em>.</p>

<h3>2. Verifikasi dan Keberimbangan Berita</h3>
<ul>
  <li>Setiap berita yang dipublikasikan wajib melalui proses verifikasi dan konfirmasi atas fakta yang disajikan.</li>
  <li>Berita yang berpotensi merugikan pihak lain wajib memberikan ruang konfirmasi yang proporsional (keberimbangan/<em>cover both sides</em>).</li>
  <li>Pengecualian verifikasi hanya dapat dilakukan dengan syarat berita mengandung kepentingan publik mendesak, sumber pertama jelas dan kredibel, serta redaksi mencantumkan catatan bahwa verifikasi lanjutan sedang diupayakan.</li>
</ul>

<h3>3. Konten Buatan Pengguna (User Generated Content)</h3>
<p>Bedain News memoderasi ruang komentar dan artikel partisipasi pembaca. Konten pengguna dilarang memuat ujaran kebencian (SARA), ajakan kekerasan, pornografi, maupun pelanggaran hak kekayaan intelektual.</p>

<h3>4. Ralat, Koreksi, dan Hak Jawab</h3>
<ul>
  <li>Ralat, koreksi, dan hak jawab mengacu pada UU Pers, Kode Etik Jurnalistik, dan Pedoman Hak Jawab Dewan Pers.</li>
  <li>Ralat atau koreksi atas kekeliruan isi berita dilakukan dengan mencantumkan keterangan ralat secara transparan pada artikel bersangkutan.</li>
  <li>Pihak yang merasa dirugikan berhak menyampaikan Hak Jawab melalui email redaksi <strong>bedainnews@gmail.com</strong>, dan redaksi wajib mempublikasikannya secara proporsional.</li>
</ul>

<h3>5. Pencabutan Berita</h3>
<p>Berita yang telah dipublikasikan tidak dapat dicabut kembali atas permintaan sepihak, kecuali terkait masalah SARA, kesusilaan anak di bawah umur, masa depan korban tindak kekerasan, atau atas pertimbangan khusus yang ditetapkan Dewan Pers.</p>

<h3>6. Hak Cipta dan Praktik Sitasi</h3>
<p>Bedain News menghormati hak cipta intelektual. Setiap pengutipan karya jurnalistik dari media lain wajib mencantumkan sumber asli secara jelas dan menaati batas wajar pengutipan.</p>
  `.trim();

  // Doc ID untuk pedoman-siber adalah QFULUW21S4d88oBDPj5l
  await updateDoc('pages', 'QFULUW21S4d88oBDPj5l', {
    content: { stringValue: pedomanContent },
    title: { stringValue: 'Pedoman Pemberitaan Media Siber' },
    seoDescription: { stringValue: 'Pedoman Pemberitaan Media Siber Bedain News sesuai standar Dewan Pers Republik Indonesia.' },
    updatedAt: { timestampValue: new Date().toISOString() }
  });
  console.log('✓ Halaman Pedoman Pemberitaan Media Siber berhasil diperbarui.');

  console.log('\n--- SEMUA DATA FIRESTORE BERHASIL DIOPTIMASI! ---');
}

run().catch(err => {
  console.error('Error saat optimasi:', err);
  process.exit(1);
});
