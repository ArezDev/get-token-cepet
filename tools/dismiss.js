const myHeaders = new Headers();
myHeaders.append('content-type','application/x-www-form-urlencoded');
const data_payloads = {
    'fb_api_caller_class': 'RelayModern',
    'fb_api_req_friendly_name': 'FBScrapingWarningMutation',
    'variables': '{}',
    'server_timestamps': true,
    'doc_id': '6339492849481770',
    ...require('getAsyncParams')('POST')
};
const requestOptions = {
    headers: myHeaders,
    method: "POST",
    body: new URLSearchParams(data_payloads)
};
fetch("/api/graphql/", requestOptions).then(async(r) =>{
        let a = await r.json();
        if(a.data.fb_scraping_warning_clear.success==true){
            window.location.replace("https://facebook.com/?sk=welcome");
        }
});