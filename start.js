const axios = require('axios');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const readline = require('readline');
const waktu = () => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `[ ${hh}:${mm} ]`;
};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function relogCokis(email, password, cookies, allowIG) {
    const browser = await puppeteer.launch({
        executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
        headless: true,
        defaultViewport: null,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--ignore-certificate-errors'
        ],
        ignoreDefaultArgs: ['--enable-automation']
    });
    const page = await browser.newPage();

    // Parse cookies string to array of cookie objects
    let cookieArr = cookies.split(';').map(cookie => {
        const [name, ...rest] = cookie.trim().split('=');
        return {
            name,
            value: rest.join('='),
            domain: '.facebook.com',
            path: '/',
            httpOnly: false,
            secure: true
        };
    });

    // Find datr and sb cookies
    const datrCookie = cookieArr.find(c => c.name === 'datr' && c.value);
    const sbCookie = cookieArr.find(c => c.name === 'sb' && c.value);

    // If datr found, always include it. If sb not found, use only datr.
    if (datrCookie) {
        if (sbCookie) {
            cookieArr = [sbCookie, datrCookie];
        } else {
            cookieArr = [datrCookie];
        }
    } else {
        // fallback: use sb if present, else empty
        cookieArr = sbCookie ? [sbCookie] : [];
    }

    await page.browserContext().setCookie(...cookieArr);

    await page.goto('https://facebook.com/', { waitUntil: 'networkidle2' });
    await delay(5000);

    if (!email || !password) {
        throw new Error(`${waktu()}[${email}] : Email and password not found in cokis.txt`);
    }

    await page.waitForSelector('#email', { timeout: 10000 });
    await page.type('#email', email, { delay: 50 });
    await page.type('#pass', password, { delay: 50 });
    await Promise.all([
        page.click('button[name="login"], #loginbutton'),
        page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);
    await delay(15000);

    // Dismiss
    // Read and inject dismiss script from tools/dismiss.js
    if (page.url().includes('601051028565049')) {
        console.log(`${waktu()}[${email}] : Akun dismiss wait...`);
        const dismissScriptPath = path.join(__dirname, 'tools', 'dismiss.js');
        const dismissScript = fs.readFileSync(dismissScriptPath, 'utf8');
        await page.evaluate(dismissScript);
        await new Promise(r => setTimeout(r, 15000));
    } else if (page.url().includes('confirmemail.php')) {
        //get new cookies after login
        const newCoks = newCookies.map(c => `${c.name}=${c.value}`).join('; ');
	    await new Promise(r => setTimeout(r, 2000));
        console.log(`${waktu()}[${email}] : Akun not confirm!`);
        fs.writeFileSync('not-confirm.txt', `${email}|${password}| ;${newCoks};\n`, { flag: 'a' });
        await delay(5000);
        await browser.close();
        return;
    }

    // === ALLOW Instagram Connect === //
    if (allowIG === 'y') {
        const oauthUrl = 'https://facebook.com/dialog/oauth?scope=user_about_me,user_actions.books,user_actions.fitness,user_actions.music,user_actions.news,user_actions.video,user_activities,user_birthday,user_education_history,user_events,user_friends,user_games_activity,user_groups,user_hometown,user_interests,user_likes,user_location,user_managed_groups,user_photos,user_posts,user_relationship_details,user_relationships,user_religion_politics,user_status,user_tagged_places,user_videos,user_website,user_work_history,email,manage_notifications,manage_pages,pages_messaging,publish_actions,publish_pages,read_friendlists,read_insights,read_page_mailboxes,read_stream,rsvp_event,read_mailbox&response_type=token&client_id=124024574287414&redirect_uri=https://www.instagram.com/';
        await page.goto(oauthUrl, { waitUntil: 'networkidle2' });
        // Click "Lanjutkan" button if present
        try {
            await page.waitForSelector('button[type="submit"], [name="__CONFIRM__"]', { timeout: 5000 });
            await page.click('button[type="submit"], [name="__CONFIRM__"]');
        } catch (e) {
            // Button not found, continue
        }
        // Wait for 5 seconds
        await new Promise(r => setTimeout(r, 8000));
    }

    const newCookies = await page.browserContext().cookies();
    //await browser.close();

    // Convert cookies array to string
    const cokisStr = newCookies.map(c => `${c.name}=${c.value}`).join('; ');
	await new Promise(r => setTimeout(r, 2000));

    // Save cookies to file
	fs.writeFileSync('saved-cokis.txt',  `${email}|${password}| ;${cokisStr};\n` , { flag: 'a' });
	await new Promise(r => setTimeout(r, 5000));
    //return cokisStr;
    const genResponse = await axios.post(
                "https://generator.darkester.online/",
                `cookie=${encodeURIComponent(cokisStr)}`,
                {
                    headers: {
                        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                        "content-type": "application/x-www-form-urlencoded",
                    }
                }
            );
            const eaabMatch = genResponse.data.match(/(EAAB\w+)/);
            if (eaabMatch) {
                console.log(`${waktu()}[${email}] : `, eaabMatch[1]);
                const tokenPath = path.join(__dirname, 'token.txt');
                try {
                    fs.writeFileSync(tokenPath, eaabMatch[1] + '\n', { flag: 'a' });
                    //console.log(`[✓] ${tokenPath}`);
                } catch (writeErr) {
                    console.error(`${waktu()}[${email}] : Failed to write token: ${writeErr.message}`);
                }
            } else {
                console.log(`${waktu()}[${email}] : token not found in response!`);
            }
    await delay(2000);

    await browser.close();
    await delay(5000);
}

const searchToken = async (cookies) => {
    try {
        const genResponse = await axios.post(
                "https://generator.darkester.online/",
                `cookie=${encodeURIComponent(cookies)}`,
                {
                    headers: {
                        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                        "content-type": "application/x-www-form-urlencoded",
                    }
                }
            );
            const eaabMatch = genResponse.data.match(/(EAAB\w+)/);
            if (eaabMatch) {
                console.log('[✓] ', eaabMatch[1]);
                const tokenPath = path.join(__dirname, 'token.txt');
                try {
                    fs.writeFileSync(tokenPath, eaabMatch[1] + '\n', { flag: 'a' });
                    console.log(`[✓] Token written to ${tokenPath}`);
                } catch (writeErr) {
                    console.error(`[!] Failed to write token: ${writeErr.message}`);
                }
            } else {
                console.log('[!] token not found in response!');
            }
    } catch (error) {
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Headers:', error.response.headers);
            console.log('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
};

(async () => {
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    const cookiesFile = path.join(__dirname, 'cokis.txt');
    const credentialsListRaw = fs.readFileSync(cookiesFile, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    const credentialsList = credentialsListRaw
        .map(line => {
            const [uid, password] = line.split('|');
            const sbMatch = line.match(/sb=([^;]+)/);
            const datrMatch = line.match(/datr=([^;]+)/);
            const cUserMatch = line.match(/c_user=([^;]+)/);
            const xsMatch = line.match(/xs=([^;]+)/);
            const frMatch = line.match(/fr=([^;]+)/);

            if (sbMatch && datrMatch) {
                // If sb exists, require uid, pass, datr, sb
                return {
                    uid: uid ? uid.trim() : '',
                    password: password ? password.trim() : '',
                    sb: sbMatch[1],
                    datr: datrMatch[1],
                    c_user: cUserMatch ? cUserMatch[1] : '',
                    xs: xsMatch ? xsMatch[1] : '',
                    fr: frMatch ? frMatch[1] : ''
                };
            } else if (!sbMatch && uid && password && datrMatch && cUserMatch && frMatch) {
                // If no sb, require uid, pass, datr, c_user, fr
                return {
                    uid: uid.trim(),
                    password: password.trim(),
                    sb: '',
                    datr: datrMatch[1],
                    c_user: cUserMatch[1],
                    xs: xsMatch ? xsMatch[1] : '',
                    fr: frMatch[1]
                };
            }
            return null;
        })
        .filter(Boolean);

    // Ask only once
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const askAllowIG = () => {
        return new Promise(resolve => {
            rl.question('Allow Instagram? (y/n): ', answer => {
                resolve(answer.trim().toLowerCase() === 'y' ? 'y' : 'n');
            });
        });
    };

    const allowIG = await askAllowIG();
    rl.close();

    const concurrency = 1; // Set your desired concurrency
    let index = 0;

    // const runBatch = async () => {
    //     while (index < credentialsList.length) {
    //         const batch = [];
    //         for (let i = 0; i < concurrency && index < credentialsList.length; i++, index++) {
    //             const { sb, datr, uid, password } = credentialsList[index];
    //             batch.push(
    //                 (async () => {
    //                     await delay(i * 2000);
    //                     try {
    //                         let cookiesStr = '';
    //                         if (sb && datr) {
    //                             cookiesStr = `sb=${sb}; datr=${datr};`;
    //                         } else if (!sb && datr) {
    //                             cookiesStr = `datr=${datr};`;
    //                         } else {
    //                             console.error(`[!] Skipping: No valid sb or datr for uid=${uid}`);
    //                             return;
    //                         }
    //                         await relogCokis(uid, password, cookiesStr, allowIG);
    //                     } catch (err) {
    //                         console.error(`[!] Error for uid=${uid} sb=${sb} datr=${datr}:`, err.message);
    //                     }
    //                 })()
    //             );
    //         }
    //         await Promise.all(batch);
    //     }
    // };

    const runBatch = async () => {
        while (index < credentialsList.length) {
            const { sb, datr, uid, password } = credentialsList[index];
            index++;

            await delay(5000); // delay antar akun
            try {
                let cookiesStr = '';
                if (sb && datr) {
                    cookiesStr = `sb=${sb}; datr=${datr};`;
                } else if (!sb && datr) {
                    cookiesStr = `datr=${datr};`;
                } else {
                    console.error(`[!] Skipping: No valid sb or datr for uid=${uid}`);
                    continue;
                }

                await relogCokis(uid, password, cookiesStr, allowIG);

            } catch (err) {
                if (err.code === 'EBUSY') {
                    console.error(`[!] File locked for uid=${uid}, retry later`);
                } else {
                    console.error(`[!] Error for uid=${uid}:`, err.message);
                }
            }
        }
    };

    await runBatch();
})();