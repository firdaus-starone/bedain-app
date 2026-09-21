import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useRouter } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { HelmetProvider } from 'react-helmet-async';
import { SplashScreen } from '@capacitor/splash-screen';
import HomePage from "./views/HomePage';
import AdminRoute from './components/AdminRoute';
import StickySideAds from './components/StickySideAds';
import GlobalAdsense from './components/GlobalAdsense';
import PushNotificationPrompt from './components/PushNotificationPrompt';
import CustomAlert from './components/CustomAlert';
import ErrorBoundary from './components/ErrorBoundary';


// Lazy load admin pages to dramatically reduce initial bundle size for public visitors
const AdminLogin = React.lazy(() => import("./views/AdminLogin'));
const AdminDashboard = React.lazy(() => import("./views/AdminDashboard'));
const ArticleEditor = React.lazy(() => import("./views/ArticleEditor'));
const AdminUsers = React.lazy(() => import("./views/AdminUsers'));
const AdminMedia = React.lazy(() => import("./views/AdminMedia'));
const AdminSettings = React.lazy(() => import("./views/AdminSettings'));
const AdminCategories = React.lazy(() => import("./views/AdminCategories'));
const AdminMenus = React.lazy(() => import("./views/AdminMenus'));
const AdminPages = React.lazy(() => import("./views/AdminPages'));
const AdminArticles = React.lazy(() => import("./views/AdminArticles'));
const AdminBanners = React.lazy(() => import("./views/AdminBanners'));
const AdminComments = React.lazy(() => import("./views/AdminComments'));
const AdminSubmissions = React.lazy(() => import("./views/AdminSubmissions'));
const AdminMessages = React.lazy(() => import("./views/AdminMessages'));

const StaticPageView = React.lazy(() => import("./views/StaticPageView'));
const ArticleDetail = React.lazy(() => import("./views/ArticleDetail'));
const SearchPage = React.lazy(() => import("./views/SearchPage'));
const SubmitArticle = React.lazy(() => import("./views/SubmitArticle'));
const Contact = React.lazy(() => import("./views/Contact'));


const AdminLoadingFallback = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#121214', color: '#fff' }}>
    <div className="spinner"></div>
  </div>
);

const CloudRedirectHandler = () => {
  const navigate = useRouter();
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const redirectArticle = params.get('redirect_article') || params.get('article_slug');
      if (redirectArticle) {
        const targetPath = `/article/${redirectArticle}`;
        navigate(targetPath, { replace: true });
      }
    } catch (e) {
      console.error("Error checking redirect_article param:", e);
    }
  }, [navigate]);
  return null;
};

function App() {
  useEffect(() => {
    // 1. Hide native splash screen on initial launch after 2 seconds
    const launchTimer = setTimeout(() => {
      SplashScreen.hide().catch(() => {});
    }, 2000);

    // 2. Removed app state listener that causes auto-reload when switching tabs.
    // If background data refreshing is needed in the future, it should be done
    // gracefully via API calls (e.g. SWR/React Query) without reloading the page.

    // 3. Handle Android hardware back button
    let backButtonListener;
    const setupBackButton = async () => {
      backButtonListener = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack || window.location.pathname === '/') {
          CapacitorApp.exitApp();
        } else {
          window.history.back();
        }
      });
    };
    setupBackButton();

    return () => {
      clearTimeout(launchTimer);

      if (backButtonListener) {
        backButtonListener.remove();
      }
    };
  }, []);

  return (
    <HelmetProvider>
    <BrowserRouter>
      <GlobalAdsense />
      <CloudRedirectHandler />
      <StickySideAds />
      <PushNotificationPrompt />
      <CustomAlert />
      <ErrorBoundary>
      <Suspense fallback={<AdminLoadingFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/article/:slug" element={<ArticleDetail />} />
          <Route path="/berita/:slug" element={<ArticleDetail />} />
          <Route path="/page/:slug" element={<StaticPageView />} />
          <Route path="/halaman/:slug" element={<StaticPageView />} />
          <Route path="/faq" element={<StaticPageView />} />
          <Route path="/cari" element={<SearchPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/kirim-tulisan" element={<SubmitArticle />} />
          <Route path="/kontak" element={<Contact />} />
          <Route path="/contact" element={<Contact />} />

          
          {/* Admin Login */}
          <Route path="/admin" element={<AdminLogin />} />
          
          {/* Protected Admin Routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/articles" element={<AdminArticles />} />
            <Route path="/admin/editor" element={<ArticleEditor />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/media" element={<AdminMedia />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/menus" element={<AdminMenus />} />
            <Route path="/admin/pages" element={<AdminPages />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/banners" element={<AdminBanners />} />
            <Route path="/admin/comments" element={<AdminComments />} />
            <Route path="/admin/submissions" element={<AdminSubmissions />} />
            <Route path="/admin/messages" element={<AdminMessages />} />
          </Route>
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
