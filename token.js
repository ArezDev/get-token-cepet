const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false }); // Set false biar bisa lihat alurnya
  const page = await browser.newPage();

  // Load cookies dari file
  const cookieString = fs.readFileSync('cokis.txt', 'utf8');
  const cookies = cookieString.split(';').map(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    return {
      name,
      value: rest.join('='),
      domain: '.facebook.com',
      path: '/',
      httpOnly: false,
      secure: true,
    };
  });
  await page.setCookie(...cookies);

  // Awasi navigasi yang mengandung access_token
  page.on('framenavigated', async (frame) => {
    const url = frame.url();
    if (url.includes('access_token=')) {
      const token = url.match(/access_token=([^&]+)/)?.[1];
      if (token) {
        console.log('[✓] Access Token:', token);
        fs.writeFileSync('access_token.txt', token);
        await browser.close();
        process.exit();
      }
    }
  });

  // Buka URL login Facebook App (Instagram)
  const oauthUrl = `https://www.facebook.com/v2.3/dialog/oauth?client_id=124024574287414&redirect_uri=https://www.instagram.com/&response_type=token&scope=email,public_profile`;
  await page.goto(oauthUrl, { waitUntil: 'networkidle2' });

  // Tunggu tombol "Lanjutkan" dan klik jika muncul
  try {
    await page.waitForSelector('button[name="__CONFIRM__"]', { timeout: 5000 });
    await page.click('button[name="__CONFIRM__"]');
    console.log('[✓] Tombol "Lanjutkan" ditekan.');
    
  } catch (e) {
    console.log('[!] Tombol "Lanjutkan" tidak ditemukan atau tidak perlu diklik.');
  }

  // Tunggu redirect terjadi
  await new Promise(r => setTimeout(r, 15000));
  console.log('[!] Token tidak ditemukan, kemungkinan user belum authorize app atau redirect gagal.');
  await browser.close();
  process.exit();
})();
