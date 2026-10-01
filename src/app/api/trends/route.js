import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://trends.google.com/trending/rss?geo=ID', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Google Trends API responded with status: ${response.status}`);
    }

    const xml = await response.text();
    
    // Simple Regex-based XML parsing to extract titles and traffic
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    
    while ((match = itemRegex.exec(xml)) !== null && items.length < 10) {
      const itemXml = match[1];
      const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
      const trafficMatch = itemXml.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/);
      const newsMatch = itemXml.match(/<ht:news_item>[\s\S]*?<ht:news_item_title><!\[CDATA\[(.*?)\]\]><\/ht:news_item_title>/);
      
      if (titleMatch) {
        items.push({
          title: titleMatch[1],
          traffic: trafficMatch ? trafficMatch[1] : '',
          relatedNews: newsMatch ? newsMatch[1] : ''
        });
      }
    }

    return NextResponse.json({ trends: items });
  } catch (error) {
    console.error('Error fetching Google Trends:', error);
    return NextResponse.json({ error: 'Failed to fetch trends' }, { status: 500 });
  }
}
