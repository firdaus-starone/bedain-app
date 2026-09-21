const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1');
  await page.setViewport({ width: 375, height: 812, isMobile: true });

  page.on('console', msg => console.log('PROD LOG:', msg.text()));
  page.on('pageerror', error => console.log('PROD ERROR:', error.message));

  console.log('Navigating to prod...');
  try {
    await page.goto('https://pionirhouse.com/article/mtq-vs-korupsi-triliunan-bisakah-jadi-benteng-moral', { waitUntil: 'networkidle2' });
    console.log('Navigation done.');
  } catch(e) {
    console.log('Navigation error:', e.message);
  }
  
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
