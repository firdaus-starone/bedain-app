import { Poppins, Inter } from 'next/font/google';
import './globals.css';
import GlobalAdsense from '../components/GlobalAdsense';
import StickySideAds from '../components/StickySideAds';
import PushNotificationPrompt from '../components/PushNotificationPrompt';
import CustomAlert from '../components/CustomAlert';

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

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={`bg-[#121214] text-white ${poppins.variable} ${inter.variable}`}>
        <GlobalAdsense />
        <StickySideAds />
        <PushNotificationPrompt />
        <CustomAlert />
        {children}
      </body>
    </html>
  );
}
