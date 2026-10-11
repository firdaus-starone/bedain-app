import { NextResponse } from 'next/server';

const FB_PAGE_ID = process.env.FB_PAGE_ID || '1348238751700643';
const FB_ACCESS_TOKEN = 'EAAY0JDZCwjrMBSl9VhKokEzoobMZC8R3az5nIkQjBr1aurJanRHZCDTIneoFOHZAogKzhHVsDitc7rJTKGsH2qsHOPheemds3jJAWjpjh2YzprgC8Hl4ca9sJl25GlJslcU5QVFygV4lRrZCjRtth3jn3WILvGMM37JScxFRObZBI02UvjJXpyZAmv00hJKBwv2T9Errf4o8DiS3y61wwZDZD';

// In-memory deduplication cache to prevent concurrent or rapid duplicate shares
const recentPostsCache = new Map();

export async function POST(request) {
  try {
    const { message, link, scheduledTime } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 1. Check deduplication to prevent double-sharing within 5 minutes
    const dedupeKey = link ? link.trim().toLowerCase() : message.trim();
    const nowMs = Date.now();
    
    // Clean up cache entries older than 10 minutes
    for (const [key, val] of recentPostsCache.entries()) {
      if (nowMs - val.timestamp > 10 * 60 * 1000) {
        recentPostsCache.delete(key);
      }
    }

    if (recentPostsCache.has(dedupeKey)) {
      const existing = recentPostsCache.get(dedupeKey);
      if (nowMs - existing.timestamp < 5 * 60 * 1000) {
        console.warn(`[Facebook API] Mencegah posting duplikat untuk: ${dedupeKey}`);
        return NextResponse.json({
          success: true,
          id: existing.id,
          duplicateBlocked: true,
          message: 'Postingan sudah pernah dikirim ke Facebook beberapa saat lalu. Duplikasi dicegah.'
        });
      }
    }

    if (link) {
      // Tunggu 4 detik agar sinkronisasi/propagasi Firestore selesai
      // (karena Next.js fetch API membaca dari replika Firestore yang butuh waktu)
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      // Force Facebook to scrape the URL first so the Link Preview is perfect
      try {
        const scrapeParams = new URLSearchParams({
          id: link,
          scrape: 'true',
          access_token: FB_ACCESS_TOKEN,
        });
        await fetch('https://graph.facebook.com/v21.0/', {
          method: 'POST',
          body: scrapeParams,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
      } catch (scrapeErr) {
        console.error('Facebook scrape error (ignored):', scrapeErr);
      }
    }

    const fbUrl = `https://graph.facebook.com/v21.0/${FB_PAGE_ID}/feed`;
    const fbParams = new URLSearchParams({
      access_token: FB_ACCESS_TOKEN,
      message: message,
    });

    if (link) {
      fbParams.append('link', link);
    }
    
    // Fitur Penjadwalan Facebook (Tayang Otomatis)
    if (scheduledTime) {
      const nowSec = Math.floor(Date.now() / 1000);
      let scheduleAt = parseInt(scheduledTime, 10);
      
      // Facebook API requires scheduled_publish_time to be between 10 mins and 6 months
      // Jika waktu penjadwalan lebih dari 10 menit ke depan, jadwalkan di Facebook.
      // Jika waktu sudah lewat atau kurang dari 10 menit, publikasikan langsung (immediate).
      if (scheduleAt > nowSec + 600) {
        const maxTime = nowSec + (6 * 30 * 24 * 60 * 60) - 86400; // 6 months minus 1 day
        if (scheduleAt > maxTime) scheduleAt = maxTime;
        fbParams.append('published', 'false');
        fbParams.append('scheduled_publish_time', scheduleAt.toString());
      }
    }

    const response = await fetch(fbUrl, {
      method: 'POST',
      body: fbParams,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Facebook API error:', data);
      return NextResponse.json({ error: data.error?.message || 'Failed to post to Facebook' }, { status: response.status });
    }

    // Catat ke cache deduplikasi
    recentPostsCache.set(dedupeKey, { timestamp: Date.now(), id: data.id });

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error('Facebook API exception:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
