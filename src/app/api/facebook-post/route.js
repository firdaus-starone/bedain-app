import { NextResponse } from 'next/server';

const FB_PAGE_ID = process.env.FB_PAGE_ID || '1348238751700643';
const FB_ACCESS_TOKEN = 'EAAY0JDZCwjrMBSl9VhKokEzoobMZC8R3az5nIkQjBr1aurJanRHZCDTIneoFOHZAogKzhHVsDitc7rJTKGsH2qsHOPheemds3jJAWjpjh2YzprgC8Hl4ca9sJl25GlJslcU5QVFygV4lRrZCjRtth3jn3WILvGMM37JScxFRObZBI02UvjJXpyZAmv00hJKBwv2T9Errf4o8DiS3y61wwZDZD';

export async function POST(request) {
  try {
    const { message, link, scheduledTime } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (link) {
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
      const now = Math.floor(Date.now() / 1000);
      let scheduleAt = parseInt(scheduledTime, 10);
      
      // Facebook API requires scheduled_publish_time to be between 10 mins and 6 months
      const minTime = now + 660; // 11 mins from now to be safe
      const maxTime = now + (6 * 30 * 24 * 60 * 60) - 86400; // 6 months minus 1 day
      
      if (scheduleAt < minTime) {
        scheduleAt = minTime; // Force minimum 11 minutes
      } else if (scheduleAt > maxTime) {
        scheduleAt = maxTime;
      }
      
      fbParams.append('published', 'false');
      fbParams.append('scheduled_publish_time', scheduleAt.toString());
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

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error('Facebook API exception:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
