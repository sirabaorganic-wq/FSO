const puppeteer = require('puppeteer');

async function check() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log('--- Checking Producer Profile ---');
  await page.goto('http://localhost:3000/producers/pahadi-amrut-forest-collective', { waitUntil: 'networkidle2' });
  const prodHtml = await page.content();
  console.log('Producer page title:', await page.title());
  console.log('Contains Pahadi Amrut:', prodHtml.includes('Pahadi Amrut'));
  console.log('Sample body text:', await page.$eval('body', el => el.innerText.slice(0, 500)));

  console.log('\n--- Checking Collection Page ---');
  await page.goto('http://localhost:3000/shop/collection/himalayan-morning-rituals-box', { waitUntil: 'networkidle2' });
  const colHtml = await page.content();
  console.log('Collection page title:', await page.title());
  console.log('Contains Himalayan Morning:', colHtml.includes('Himalayan Morning'));
  console.log('Sample body text:', await page.$eval('body', el => el.innerText.slice(0, 500)));

  await browser.close();
}

check();
