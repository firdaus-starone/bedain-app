import { Poppins, Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import GlobalAdsense from '../components/GlobalAdsense';
import StickySideAds from '../components/StickySideAds';
import PushNotificationPrompt from '../components/PushNotificationPrompt';
import CustomAlert from '../components/CustomAlert';
import { headers } from 'next/headers';
import { I18nProvider } from '../hooks/useI18n';

const poppins = Poppins({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-heading',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

export const metadata = {
  title: 'Bedain News',
  description: 'Portal berita terkini dan terpercaya.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' },
    ]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Bedain News',
    startupImage: [
      '/splash.png',
    ],
  },
};

export const viewport = {
  themeColor: '#121214',
};

export default async function RootLayout({ children }) {
  const headersList = await headers();
  const locale = headersList.get('x-next-locale') || 'id';

  return (
    <html lang={locale}>
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-1YDVGEPDH6"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-1YDVGEPDH6', {
              page_path: window.location.pathname,
            });
          `}
        </Script>
        <Script id="organization-schema" type="application/ld+json" strategy="afterInteractive">
          {`
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Bedain News",
              "url": "https://bedainnews.com",
              "logo": "https://bedainnews.com/logo-bundar.png",
              "sameAs": [
                "https://www.facebook.com/bedainnews",
                "https://twitter.com/bedainnews",
                "https://www.instagram.com/bedainnews"
              ]
            }
          `}
        </Script>
      </head>
      <body className={`bg-[#121214] text-white ${poppins.variable} ${inter.variable}`}>
        <GlobalAdsense />
        <I18nProvider initialLang={locale}>
          <StickySideAds />
          <PushNotificationPrompt />
          <CustomAlert />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
