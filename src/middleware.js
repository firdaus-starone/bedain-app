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

  // Check if pathname starts with a locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  let locale = defaultLocale;
  let newPathname = pathname;

  if (pathnameHasLocale) {
    const segments = pathname.split('/');
    locale = segments[1];
    
    // Remove the locale from the pathname for rewriting to actual components
    segments.splice(1, 1);
    newPathname = segments.join('/') || '/';
    
    if (locale === defaultLocale) {
      // If user visits /id/..., redirect to /...
      const url = request.nextUrl.clone();
      url.pathname = newPathname;
      return NextResponse.redirect(url);
    }
  } else {
    // If no locale in URL, we check the cookie, otherwise defaultLocale ('id')
    const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
    if (cookieLocale && locales.includes(cookieLocale)) {
      locale = cookieLocale;
    } else {
      locale = defaultLocale;
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-next-locale', locale);

  const response = pathnameHasLocale 
    ? NextResponse.rewrite(new URL(newPathname, request.url), {
        request: {
          headers: requestHeaders,
        },
      })
    : NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
  
  // Set the locale in a cookie for client components (if needed as fallback)
  response.cookies.set('NEXT_LOCALE', locale, { path: '/', maxAge: 31536000 });

  return response;
}
