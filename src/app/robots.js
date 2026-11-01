export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/api/'
        ],
      },
      {
        userAgent: 'Mediapartners-Google',
        allow: '/',
      },
      {
        userAgent: 'Googlebot-News',
        allow: '/',
      }
    ],
    sitemap: 'https://bedainnews.com/sitemap.xml',
  }
}
