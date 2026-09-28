const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message, error.stack));
  page.on('requestfailed', request =>
    console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText)
  );

  try {
    await page.goto('http://localhost:3000/en', { waitUntil: 'networkidle0', timeout: 30000 });
  } catch(e) {
    console.log('Navigation error:', e);
  }

  await browser.close();
})();
