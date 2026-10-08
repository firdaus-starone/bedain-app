import { NextResponse } from 'next/server';

const FB_PAGE_ID = process.env.FB_PAGE_ID || '1348238751700643';
const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN || 'EAAY0JDZCwjrMBSp3zv8bJV3k4WZCGZC3zPtGFghUqjGVGrqIpb3fNMAo5bKKx9lQsxZBZBoBeMWhwBjkDgb7gF37fASMgfhC6ysoqmsYnKuObSR2TXrlKXtlgUZAIfiwQWfm2fp628HaMH4SZCFAU8Tz3x10th8pexoUql1kv31ZBDj9Q85zCKZBNPS8u3o7ZAVZA6tHxZB2ZBIkZA7Gnkmwh7GJAaY5n6UHLdxKZA4NCkWcAkffSTLT7SZAzlnhba0h';

export async function POST(request) {
  try {
    const { message, link } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
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
