import Link from 'next/link';

export const metadata = {
  title: '404 - Halaman Tidak Ditemukan | Bedain News',
  description: 'Halaman atau berita yang Anda cari tidak ditemukan atau telah dipindahkan.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-500/10 text-red-500 mb-2 border border-red-500/20">
          <span className="text-3xl font-extrabold font-mono">404</span>
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Halaman Tidak Ditemukan
        </h1>
        
        <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
          Maaf, artikel atau halaman yang Anda cari mungkin telah dihapus, dipindahkan, atau tautan yang Anda buka tidak valid.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-600/20"
          >
            ← Kembali ke Beranda
          </Link>
          <Link
            href="/video"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition-colors border border-zinc-700"
          >
            Tonton Video Berita
          </Link>
        </div>
      </div>
    </main>
  );
}
