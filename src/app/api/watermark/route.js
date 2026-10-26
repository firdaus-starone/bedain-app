import { NextResponse } from 'next/server';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

export async function POST(request) {
  try {
    let inputBuffer = null;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      if (!file) {
        return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
      }
      const arrayBuffer = await file.arrayBuffer();
      inputBuffer = Buffer.from(arrayBuffer);
    } else {
      const arrayBuffer = await request.arrayBuffer();
      inputBuffer = Buffer.from(arrayBuffer);
    }

    if (!inputBuffer || inputBuffer.length === 0) {
      return NextResponse.json({ error: 'Data gambar kosong' }, { status: 400 });
    }

    // 1. Baca metadata gambar asli
    let img = sharp(inputBuffer);
    let meta = await img.metadata();
    let width = meta.width || 1200;
    let height = meta.height || 800;

    // 2. Resize ke maks 1200px jika gambar terlalu besar
    const maxDimension = 1200;
    if (width > maxDimension || height > maxDimension) {
      if (width >= height) {
        height = Math.round(height * (maxDimension / width));
        width = maxDimension;
      } else {
        width = Math.round(width * (maxDimension / height));
        height = maxDimension;
      }
      img = img.resize(width, height, { fit: 'inside' });
    }

    // 3. Siapkan Logo Watermark
    const logoPath = path.join(process.cwd(), 'public', 'logo-no-latar.png');
    let composites = [];

    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      
      // Lebar logo = 12% dari lebar gambar
      const logoWidth = Math.max(40, Math.round(width * 0.12));
      
      // Resize logo dan beri transparansi (alpha ~0.65)
      const processedLogo = await sharp(logoBuffer)
        .resize({ width: logoWidth })
        .ensureAlpha()
        .composite([{
          input: Buffer.from([255, 255, 255, Math.round(255 * 0.65)]),
          raw: { width: 1, height: 1, channels: 4 },
          tile: true,
          blend: 'dest-in'
        }])
        .toBuffer();

      const logoMeta = await sharp(processedLogo).metadata();
      const logoHeight = logoMeta.height || logoWidth;

      const fontSize = Math.max(13, Math.round(width * 0.024));
      const gap = Math.max(4, Math.round(width * 0.01));
      const totalHeight = logoHeight + gap + fontSize;

      const padding = Math.round(width * 0.05);
      const left = width - logoWidth - padding;
      const top = height - totalHeight - padding;

      const textLeft = left + (logoWidth / 2);
      const textTop = top + logoHeight + gap;

      // SVG Text bayangan "bedainnews"
      const svgText = Buffer.from(`
        <svg width="${width}" height="${height}">
          <defs>
            <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="1" dy="1" stdDeviation="2" flood-color="#000000" flood-opacity="0.85"/>
            </filter>
          </defs>
          <text x="${textLeft}" y="${textTop + fontSize * 0.82}" 
            font-family="system-ui, -apple-system, Roboto, sans-serif" 
            font-size="${fontSize}px" 
            font-weight="bold" 
            fill="rgba(255,255,255,0.8)" 
            text-anchor="middle" 
            filter="url(#shadow)">bedainnews</text>
        </svg>
      `);

      composites.push({ input: processedLogo, left, top });
      composites.push({ input: svgText, left: 0, top: 0 });
    }

    // 4. Gabungkan watermark ke gambar dan kompres JPEG
    const finalBuffer = await img
      .composite(composites)
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();

    return new NextResponse(finalBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': finalBuffer.length.toString(),
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Watermark API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
