import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request, { params }) {
  const resolvedParams = await params;
  const fileArray = resolvedParams?.file || [];
  const fileName = Array.isArray(fileArray) ? fileArray.join('/') : fileArray;

  // 1. Coba baca file langsung dari public/assets/ di storage server/container
  try {
    const filePath = path.join(process.cwd(), 'public', 'assets', fileName);
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(fileName).toLowerCase();
      const mimeTypes = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.gif': 'image/gif'
      };

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mimeTypes[ext] || 'application/octet-stream',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
    }
  } catch (err) {
    console.error('Error reading asset from disk:', err);
  }

  // 2. Fallback otomatis ke GitHub raw content jika file di container tidak ter-copy
  try {
    const rawUrl = `https://raw.githubusercontent.com/firdaus-starone/bedain-app/main/public/assets/${fileName}`;
    const res = await fetch(rawUrl);
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': res.headers.get('content-type') || 'image/png',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }
  } catch (err) {
    console.error('Error fetching fallback asset:', err);
  }

  return new NextResponse('Asset not found', { status: 404 });
}
