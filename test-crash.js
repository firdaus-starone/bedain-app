const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });

  console.log('Navigating...');
  await page.goto('http://localhost:3000/article/masyarakat-adat-kalimantan-gugat-presiden-dan-wapres', { waitUntil: 'networkidle0' });
  
  await browser.close();
})();
