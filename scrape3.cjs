const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message, error.stack));
  
  try {
    await page.goto('http://localhost:3002/en', { waitUntil: 'networkidle0', timeout: 15000 });
  } catch(e) {
    console.log('Navigation error:', e);
  }

  await browser.close();
})();
