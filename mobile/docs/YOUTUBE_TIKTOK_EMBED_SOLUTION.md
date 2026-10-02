# Solusi Ultimate: YouTube Embedded ala TikTok di React Native

Dokumen ini mencatat masalah dan solusi sempurna (perfect solution) yang kita temukan untuk membuat feed video vertikal (ala TikTok/Reels) menggunakan video YouTube murni di aplikasi React Native (`expo` / `react-native-webview`).

## 🚨 Masalah yang Dihadapi (The Problems)

1. **Bug Aspect Ratio 16:9 Paksa (Video Mengecil)**  
   *Library* bawaan seperti `react-native-youtube-iframe` menggunakan *hack* CSS internal (`padding-bottom: 56.25%`) yang mengunci iframe menjadi *landscape* (16:9). Jika kita memasukkan video YouTube Shorts (9:16), video tersebut akan "di-geprek" dan menyusut menjadi kotak mungil di tengah layar, dan posisinya akan "nyangkut" di atas layar karena *WebView* kekurangan `flex: 1`.

2. **Error 152 / 153 (Hak Cipta & Origin Block)**  
   Jika kita membuat `<WebView>` murni dan menyuntikkan tag `<iframe>` YouTube secara manual, YouTube akan memblokir video yang memiliki hak cipta ketat dengan pesan "Video unavailable" (Error 152/153). Ini terjadi karena `Origin` dari aplikasi *mobile* tidak dikenali atau diblokir oleh YouTube.

3. **Auto-Play & Auto-Mute Constraints**  
   Platform seluler biasanya memblokir *auto-play* video yang bersuara. 

4. **Tumpang Tindih dengan Navigasi Atas (Top Header)**  
   Jika iframe dibuat *Full Screen* dari ujung ke ujung, judul bawaan YouTube (dan gradasi hitamnya) akan menutupi teks navigasi aplikasi kita yang ada di atas layar.

---

## 💡 Solusi Sempurna (The Perfect Solution)

Kita **membuang** library `react-native-youtube-iframe` dan meracik mesin **Custom WebView** yang mengimplementasikan YouTube Iframe API secara langsung.

### 1. Meretas Origin (Mencegah Error 152)
Kita menggunakan prop `baseUrl: 'https://lonelycpp.github.io'` (atau domain valid lainnya) di dalam WebView. Saat YouTube mengecek *Origin* dari *player* kita, ia akan mengira bahwa *player* ini dijalankan di atas *website* resmi tersebut (yang memang sudah di-whitelist/diizinkan oleh YouTube), sehingga **Error 152 lenyap**.

### 2. Membongkar Penjara 16:9 (CSS 100vh)
Kita mendefinisikan HTML kustom di mana kontainer utamanya diberi CSS murni:
```css
.container { position: relative; width: 100vw; height: 100vh; }
.video { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
```
Dengan tinggi `100vh`, YouTube Iframe API akan memiliki ruang sebesar layar HP secara penuh. Mesin YouTube kemudian akan secara otomatis merespons ukuran layar ini:
- **Video Portrait (9:16)**: Akan membentang tinggi memenuhi seluruh layar HP.
- **Video Landscape (16:9)**: Akan diposisikan pas di tengah layar (vertikal & horizontal) tanpa terpotong.

### 3. Mengatur Jarak Header (topOffset)
Untuk mencegah judul bawaan YouTube menabrak tulisan Navigasi ("Video Pilihan") di aplikasi kita, kita memotong tinggi WebView dan menggesernya ke bawah menggunakan *React Native style*:
```tsx
const topOffset = 60; // Geser ke bawah sejauh 60px
const playerHeight = containerHeight - topOffset;
```

### 4. Mengizinkan Suara Auto-Play
Pada *React Native WebView*, kita menambahkan *prop*:
```tsx
mediaPlaybackRequiresUserAction={false}
```
Ini membuat aplikasi memiliki "Hak Istimewa" untuk memutar video secara otomatis meskipun ada suaranya. Di dalam HTML Iframe API, kita cukup memanggil `event.target.playVideo()` tanpa perlu memanggil `event.target.mute()`.

---

## 💻 Kode Referensi (The Core Code)

Berikut adalah resep kode yang digunakan di dalam `VideoItem.tsx`:

\`\`\`tsx
import { WebView } from 'react-native-webview';
import { StyleSheet, View } from 'react-native';

const topOffset = 60; // Mencegah tabrakan dengan header aplikasi
const playerHeight = containerHeight - topOffset;
const playerWidth = width;

const customYoutubeHtml = ytId ? \`
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
      body { margin: 0; background-color: #000; overflow: hidden; }
      .container { position: relative; width: 100vw; height: 100vh; }
      .video { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="video" id="player"></div>
    </div>
    <script src="https://www.youtube.com/iframe_api"></script>
    <script>
      var player;
      function onYouTubeIframeAPIReady() {
        player = new YT.Player('player', {
          width: '100%',
          height: '100%',
          videoId: '\${ytId}',
          playerVars: {
            playsinline: 1,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            fs: 0
          },
          events: {
            'onReady': function(event) {
               // Auto-play dengan suara!
               event.target.playVideo();
            }
          }
        });
      }
    </script>
  </body>
</html>
\` : null;

// RENDER:
<View style={{ width, height: containerHeight, backgroundColor: '#000', overflow: 'hidden' }}>
  {(isActive && ytId && customYoutubeHtml) && (
    <WebView
      style={{ position: 'absolute', top: topOffset, left: 0, width: playerWidth, height: playerHeight, backgroundColor: '#000' }}
      source={{ html: customYoutubeHtml, baseUrl: 'https://lonelycpp.github.io' }}
      javaScriptEnabled={true}
      allowsInlineMediaPlayback={true}
      mediaPlaybackRequiresUserAction={false}
      bounces={false}
      scrollEnabled={false}
    />
  )}
</View>
\`\`\`

Disimpan pada: **02 Oktober 2026**
Karya: Kawan & BedainNews Team 🍻
