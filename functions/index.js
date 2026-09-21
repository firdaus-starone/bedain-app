const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

admin.initializeApp();

const API_KEY = "8ba0c00d03de79d9a8867ea2199231a1"; // Diletakkan di sini untuk MVP, di produksi gunakan Secret Manager
const API_HOST = "https://v3.football.api-sports.io";

exports.syncLiveMatch = onSchedule("every 5 minutes", async (event) => {
  try {
    // 1. Coba ambil pertandingan live
    let response = await axios.get(`${API_HOST}/fixtures?live=all`, {
      headers: {
        "x-apisports-key": API_KEY,
      },
    });

    let matchData = null;
    let fixtures = response.data.response || [];

    // Jika ada pertandingan live, ambil yang pertama
    if (fixtures.length > 0) {
      const liveMatch = fixtures[0];
      matchData = {
        id: liveMatch.fixture.id,
        league: liveMatch.league.name,
        status: liveMatch.fixture.status.short, // e.g., "1H", "HT", "2H"
        minute: liveMatch.fixture.status.elapsed || 0,
        homeTeam: {
          name: liveMatch.teams.home.name,
          shortName: liveMatch.teams.home.name.substring(0, 3).toUpperCase(),
          logo: liveMatch.teams.home.logo,
          score: liveMatch.goals.home || 0,
        },
        awayTeam: {
          name: liveMatch.teams.away.name,
          shortName: liveMatch.teams.away.name.substring(0, 3).toUpperCase(),
          logo: liveMatch.teams.away.logo,
          score: liveMatch.goals.away || 0,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
    } else {
      // Fallback: Jika tidak ada live match, gunakan data mock / statis terakhir (misal simulasi piala dunia)
      matchData = {
        id: "mock_123",
        league: "PIALA DUNIA 2026",
        status: "LIVE",
        minute: 75,
        homeTeam: {
          name: "Indonesia",
          shortName: "IDN",
          logo: "https://media.api-sports.io/football/teams/4260.png", // IDN
          score: 2,
        },
        awayTeam: {
          name: "Argentina",
          shortName: "ARG",
          logo: "https://media.api-sports.io/football/teams/26.png", // ARG
          score: 1,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
    }

    // Simpan ke Firestore
    await admin.firestore().collection("live_matches").doc("current").set(matchData);
    
    console.log("Successfully synced live match data.");
  } catch (error) {
    console.error("Error fetching live match:", error.message);
  }
});

// Fungsi untuk sinkronisasi jadwal (Berjalan 1x setiap hari jam 00:00 WIB)
exports.syncMatchSchedule = onSchedule({ schedule: "0 0 * * *", timeZone: "Asia/Jakarta" }, async (event) => {
  try {
    // Ambil 5 pertandingan berikutnya
    let response = await axios.get(`${API_HOST}/fixtures?next=5`, {
      headers: {
        "x-apisports-key": API_KEY,
      },
    });

    let fixtures = response.data.response || [];
    let schedule = [];

    if (fixtures.length > 0) {
      schedule = fixtures.map(f => ({
        id: f.fixture.id,
        league: f.league.name,
        date: f.fixture.date, // ISO string e.g. "2026-07-15T15:00:00+00:00"
        timestamp: f.fixture.timestamp,
        homeTeam: {
          name: f.teams.home.name,
          shortName: f.teams.home.name.substring(0, 3).toUpperCase(),
          logo: f.teams.home.logo
        },
        awayTeam: {
          name: f.teams.away.name,
          shortName: f.teams.away.name.substring(0, 3).toUpperCase(),
          logo: f.teams.away.logo
        }
      }));
    } else {
      // Fallback simulasi
      schedule = [
        {
          id: "sch_1", league: "PIALA DUNIA 2026", date: "2026-07-15T19:00:00Z", timestamp: 1784142000,
          homeTeam: { name: "Prancis", shortName: "FRA", logo: "https://media.api-sports.io/football/teams/17.png" },
          awayTeam: { name: "Inggris", shortName: "ENG", logo: "https://media.api-sports.io/football/teams/10.png" }
        },
        {
          id: "sch_2", league: "PIALA DUNIA 2026", date: "2026-07-16T19:00:00Z", timestamp: 1784228400,
          homeTeam: { name: "Spanyol", shortName: "ESP", logo: "https://media.api-sports.io/football/teams/9.png" },
          awayTeam: { name: "Jerman", shortName: "GER", logo: "https://media.api-sports.io/football/teams/25.png" }
        }
      ];
    }

    await admin.firestore().collection("live_matches").doc("schedule").set({
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      matches: schedule
    });

    console.log("Successfully synced match schedule.");
  } catch (error) {
    console.error("Error fetching match schedule:", error.message);
  }
});

// Fungsi untuk mengirim push notification secara manual via Admin Panel
exports.broadcastPushNotification = onCall(async (request) => {
  // Hanya user yang login yang bisa memanggil fungsi ini
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Harus login untuk mengirim notifikasi.");
  }
  
  // Idealnya cek juga apakah user memiliki role 'admin'
  
  const { title, body, click_action, image } = request.data;
  
  if (!title || !body) {
    throw new HttpsError("invalid-argument", "Title dan body wajib diisi.");
  }

  try {
    const subscribersSnapshot = await admin.firestore().collection("pushSubscribers").get();
    
    if (subscribersSnapshot.empty) {
      return { success: true, message: "Tidak ada subscriber.", count: 0 };
    }

    const tokens = [];
    subscribersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.token) tokens.push(data.token);
    });

    if (tokens.length === 0) {
      return { success: true, message: "Tidak ada token valid.", count: 0 };
    }

    const messagePayload = {
      notification: {
        title,
        body,
        ...(image && { image })
      },
      data: {
        click_action: click_action || "/"
      },
      tokens: tokens
    };

    // Mengirim multicast message
    const response = await admin.messaging().sendEachForMulticast(messagePayload);
    
    // Hapus token yang sudah tidak valid (unregistered)
    const tokensToRemove = [];
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        if (res.error.code === 'messaging/invalid-registration-token' ||
            res.error.code === 'messaging/registration-token-not-registered') {
          tokensToRemove.push(tokens[idx]);
        }
      }
    });

    if (tokensToRemove.length > 0) {
      const batch = admin.firestore().batch();
      tokensToRemove.forEach(token => {
        const ref = admin.firestore().collection("pushSubscribers").doc(token);
        batch.delete(ref);
      });
      await batch.commit();
      console.log(`Menghapus ${tokensToRemove.length} token tidak valid.`);
    }

    return { 
      success: true, 
      message: `Pesan dikirim ke ${response.successCount} perangkat. Gagal: ${response.failureCount}`, 
      successCount: response.successCount,
      failureCount: response.failureCount
    };
  } catch (error) {
    console.error("Error sending push notification:", error);
    throw new HttpsError("internal", error.message);
  }
});

let cachedBaseHtml = null;
let lastFetchTime = 0;

exports.renderArticleOG = onRequest({ cors: true, maxInstances: 10 }, async (req, res) => {
  try {
    const cleanPath = req.path.replace(/^\/(article|berita)\//, '');
    const slug = cleanPath.split('/')[0].split('?')[0].trim();
    if (!slug) {
      return res.redirect('/');
    }

    let articleData = null;
    const qSnap = await admin.firestore().collection("articles").where("slug", "==", slug).limit(1).get();
    if (!qSnap.empty) {
      articleData = qSnap.docs[0].data();
    } else {
      const docSnap = await admin.firestore().collection("articles").doc(slug).get();
      if (docSnap.exists) {
        articleData = docSnap.data();
      }
    }

    let baseHtml = null;
    const now = Date.now();
    const host = req.get('host') || 'pionirhouse.com';
    const targetUrls = [
      `https://${host}/index.html?og_bypass=${now}`,
      `https://pionirhouse.com/index.html?og_bypass=${now}`
    ];
    
    // 1. Prioritize fetching from the live site so we always get the latest JS bundle hashes
    for (const url of targetUrls) {
      try {
        const htmlRes = await axios.get(url, { timeout: 3500 });
        if (htmlRes.data && typeof htmlRes.data === 'string' && htmlRes.data.includes('<!-- DEFAULT_OG_START -->')) {
          baseHtml = htmlRes.data;
          break;
        }
      } catch (err) {
        console.warn(`Gagal mengambil index.html dari ${url}:`, err.message);
      }
    }

    // 2. Fallback to local functions/index.html if HTTP fails
    if (!baseHtml) {
      try {
        const localHtmlPath = path.join(__dirname, 'index.html');
        if (fs.existsSync(localHtmlPath)) {
          const localHtml = fs.readFileSync(localHtmlPath, 'utf8');
          if (localHtml && typeof localHtml === 'string' && localHtml.includes('<!-- DEFAULT_OG_START -->')) {
            baseHtml = localHtml;
          }
        }
      } catch (fsErr) {
        console.warn('Gagal membaca index.html lokal:', fsErr.message);
      }
    }

    let htmlToServe = baseHtml;
    if (!htmlToServe) {
      const safeRedirectUrl = `/?redirect_article=${encodeURIComponent(slug)}`;
      htmlToServe = `<!doctype html><html><head><meta charset="UTF-8"><title>Pionir House</title><meta http-equiv="refresh" content="0;url=${safeRedirectUrl}"><!-- DEFAULT_OG_START --><!-- DEFAULT_OG_END --></head><body style="background:#121214;color:#fff;font-family:sans-serif;text-align:center;padding:40px;"><div id="root">Memuat berita...<script>window.location.replace("${safeRedirectUrl}");</script></div></body></html>`;
    }

    if (!articleData) {
      return res.status(200).send(htmlToServe);
    }

    const titleString = typeof articleData.title === 'string' ? articleData.title : 'Berita Pionir House';
    const title = titleString.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const content = typeof articleData.content === 'string' ? articleData.content : '';
    const rawExcerpt = (typeof articleData.seoDescription === 'string' && articleData.seoDescription) || (typeof articleData.excerpt === 'string' && articleData.excerpt) || content.replace(/<[^>]+>/g, '').slice(0, 160) || 'Baca selengkapnya di Pionir House.';
    const excerpt = rawExcerpt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    
    let rawImageUrl = articleData.coverImage || articleData.imageUrl || '';
    if (!rawImageUrl) {
      const getYouTubeId = (input) => {
        if (!input || typeof input !== 'string') return null;
        const iframeMatch = input.match(/src=["']([^"']+)["']/i);
        const targetUrl = iframeMatch ? iframeMatch[1] : input;
        const match = targetUrl.match(/(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
        return match ? match[1] : null;
      };
      const videoId = getYouTubeId(articleData.videoUrl || articleData.youtubeUrl || articleData.video || content);
      if (videoId) {
        rawImageUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
    }
    if (!rawImageUrl) {
      rawImageUrl = 'https://pionirhouse.com/logo.png';
    }

    const imageUrl = rawImageUrl.startsWith('http') ? rawImageUrl : `https://pionirhouse.com${rawImageUrl.startsWith('/') ? '' : '/'}${rawImageUrl}`;
    const escapedImageUrl = imageUrl.replace(/&/g, '&amp;');
    const imageMimeType = imageUrl.includes('.webp') ? 'image/webp' : imageUrl.includes('.png') ? 'image/png' : 'image/jpeg';
    const articleUrl = `https://pionirhouse.com/article/${slug}`;

    const ogTags = `
    <!-- Dynamic Article Open Graph & Twitter Card via Cloud Function -->
    <meta property="og:title" content="${title} - Pionir House" />
    <meta property="og:description" content="${excerpt}" />
    <meta property="og:image" content="${escapedImageUrl}" />
    <meta property="og:image:secure_url" content="${escapedImageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="${imageMimeType}" />
    <meta property="og:url" content="${articleUrl}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Pionir House" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@pionirhouse" />
    <meta name="twitter:title" content="${title} - Pionir House" />
    <meta name="twitter:description" content="${excerpt}" />
    <meta name="twitter:image" content="${escapedImageUrl}" />
`;

    const customHtml = htmlToServe
      .replace(/<title>.*?<\/title>/i, `<title>${title} - Pionir House</title>`)
      .replace(/<!-- DEFAULT_OG_START -->[\s\S]*?<!-- DEFAULT_OG_END -->/, ogTags);

    res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
    return res.status(200).send(customHtml);
  } catch (error) {
    console.error("Error rendering article OG:", error);
    if (baseHtml) return res.status(200).send(baseHtml);
    return res.redirect('/');
  }
});


const { onDocumentWritten } = require("firebase-functions/v2/firestore");


