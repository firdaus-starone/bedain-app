const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR LOG:', msg.text());
    } else {
      console.log('PAGE LOG:', msg.text());
    }
  });
  
  page.on('pageerror', error => console.log('PAGE EXCEPTION:', error.message));

  try {
    await page.goto('http://localhost:5173/article/pdip-buru-kader-proyek-makan-bergizi-gratis', { waitUntil: 'networkidle2' });
  } catch (e) {
    console.log("Nav error:", e);
  }

  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
