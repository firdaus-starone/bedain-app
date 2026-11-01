import StaticPageView from '../../views/StaticPageView';

export const metadata = {
  title: 'Pertanyaan Umum (FAQ) & Bantuan Pembaca - Bedain News',
  description: 'Temukan jawaban atas pertanyaan umum seputar cara membaca, mengirim tulisan, serta layanan portal berita Bedain News.',
  alternates: {
    canonical: 'https://bedainnews.com/faq',
  },
};

export default function FAQPage() {
  const faqPage = {
    id: 'faq',
    slug: 'faq',
    title: 'Pertanyaan Umum (FAQ) & Bantuan Pembaca',
    content: '',
    status: 'published'
  };
  return <StaticPageView initialPage={faqPage} />;
}
