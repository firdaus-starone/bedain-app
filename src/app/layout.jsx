import './globals.css';
import GlobalAdsense from '../components/GlobalAdsense';
import StickySideAds from '../components/StickySideAds';
import PushNotificationPrompt from '../components/PushNotificationPrompt';
import CustomAlert from '../components/CustomAlert';

export const metadata = {
  title: 'BEDAINAPP',
  description: 'Portal berita terkini dan terpercaya.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="bg-[#121214] text-white">
        <GlobalAdsense />
        <StickySideAds />
        <PushNotificationPrompt />
        <CustomAlert />
        {children}
      </body>
    </html>
  );
}
