import { NextResponse } from 'next/server';

const locales = ['id', 'en', 'zh'];
const defaultLocale = 'id';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Exclude static files and api routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname.startsWith('/admin') // Admin dashboard shouldn't be localized via URL
  ) {
    return NextResponse.next();
  }

  // Privacy Policy aliases for app store review bots & direct links
  if (
    pathname === '/kebijakan-privasi' ||
    pathname === '/privacy-policy' ||
    pathname === '/privacy'
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/page/kebijakan-privasi';
    return NextResponse.redirect(url, 301);
  }

  // Check if pathname starts with a locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  let locale = defaultLocale;
  let newPathname = pathname;

  if (pathnameHasLocale) {
    const segments = pathname.split('/');
    const targetLocale = segments[1];
    
    // Remove the locale from the pathname
    segments.splice(1, 1);
    const cleanPath = segments.join('/') || '/';
    
    // Redirect cleanly to canonical path with locale cookie set
    const url = request.nextUrl.clone();
    url.pathname = cleanPath;
    const response = NextResponse.redirect(url);
    response.cookies.set('NEXT_LOCALE', targetLocale, { path: '/', maxAge: 31536000 });
    return response;
  }

  // If no locale in URL, check cookie
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && locales.includes(cookieLocale)) {
    locale = cookieLocale;
  } else {
    locale = defaultLocale;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-next-locale', locale);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return response;
}
