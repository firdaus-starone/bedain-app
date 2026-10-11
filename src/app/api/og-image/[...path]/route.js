export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const pathArray = resolvedParams.path;
    
    if (!pathArray || pathArray.length === 0) {
      return new Response('Missing image path', { status: 400 });
    }

    const pathString = pathArray.join('/'); // e.g. "articles/images/123.jpg"
    const encodedPath = encodeURIComponent(pathString);
    const firebaseUrl = `https://firebasestorage.googleapis.com/v0/b/bedain-eb6a6.firebasestorage.app/o/${encodedPath}?alt=media`;

    const res = await fetch(firebaseUrl, {
      next: { revalidate: 31536000 } // cache for a long time
    });

    if (!res.ok) {
      return new Response('Image not found', { status: 404 });
    }

    const arrayBuffer = await res.arrayBuffer();
    return new Response(arrayBuffer, {
      headers: {
        'Content-Type': res.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': arrayBuffer.byteLength.toString()
      }
    });
  } catch (err) {
    console.error('OG Image Proxy Error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
