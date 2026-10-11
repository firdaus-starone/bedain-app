export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/cari',
        '/admin',
        '/api/'
      ],
    },
    sitemap: 'https://bedainnews.com/sitemap.xml',
  }
}
