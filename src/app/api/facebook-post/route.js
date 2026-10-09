import { NextResponse } from 'next/server';

const FB_PAGE_ID = process.env.FB_PAGE_ID || '1348238751700643';
const FB_ACCESS_TOKEN = 'EAAY0JDZCwjrMBSgOfA2c962rwedH5QnbZACXkFhlbASD9L9FUxExuQ70MF4ZAV1Pnkev10XtH7TQGaCltQnmDSb6j6o8RZBfMb3OZCboeh3ZAOalRY70bOlkKGqHi57r5HMpDgnYNcZAs9ISZBJGXyOc8SqKbyD70pVI4ojf3MgdZAfa9ZBYm2UCPtTNQYNPoQLNY4bDNadRwTEBJjZCOYROqhVc9SN0BmnW4shp7Pb93wNVBJHT3Vb1GjKCNUk';

export async function POST(request) {
  try {
    const { message, link } = await request.json();

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
