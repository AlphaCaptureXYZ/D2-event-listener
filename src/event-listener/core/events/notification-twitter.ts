import {
    INotification,
    INotificationEventPayload,
    INotificationPayload,
} from '../../interfaces/notification.i';

const { TwitterApi } = require('twitter-api-v2');

// import got from 'got';
// const got = require('got');
// const crypto = require('crypto');
// const OAuth = require('oauth-1.0a');
// const qs = require('querystring');

// const readline = require('readline').createInterface({
//   input: process.stdin,
//   output: process.stdout
// });


// The code below sets the consumer key and consumer secret from your environment variables
// To set environment variables on macOS or Linux, run the export commands below from the terminal:
// export CONSUMER_KEY='YOUR-KEY'
// export CONSUMER_SECRET='YOUR-SECRET'
// const consumer_key = process.env.CONSUMER_KEY;
// const consumer_secret = process.env.CONSUMER_SECRET;


// // Be sure to add replace the text of the with the text you wish to Tweet.
// // You can also add parameters to post polls, quote Tweets, Tweet with reply settings, and Tweet to Super Followers in addition to other features.
// const data = {
//   "text": "Hello world!"
// };

// const endpointURL = `https://api.twitter.com/2/tweets`;

// // this example uses PIN-based OAuth to authorize the user
// const requestTokenURL = 'https://api.twitter.com/oauth/request_token?oauth_callback=oob&x_auth_access_type=write';
// const authorizeURL = new URL('https://api.twitter.com/oauth/authorize');
// const accessTokenURL = 'https://api.twitter.com/oauth/access_token';
// const oauth = OAuth({
//   consumer: {
//     key: consumer_key,
//     secret: consumer_secret
//   },
//   signature_method: 'HMAC-SHA1',
//   hash_function: (baseString, key) => crypto.createHmac('sha1', key).update(baseString).digest('base64')
// });

// async function input(prompt) {
//   return new Promise(async (resolve, reject) => {
//     readline.question(prompt, (out) => {
//       readline.close();
//       resolve(out);
//     });
//   });
// }

// async function requestToken() {
//   const authHeader = oauth.toHeader(oauth.authorize({
//     url: requestTokenURL,
//     method: 'POST'
//   }));

//   const req = await got.post(requestTokenURL, {
//     headers: {
//       Authorization: authHeader["Authorization"]
//     }
//   });
//   if (req.body) {
//     return qs.parse(req.body);
//   } else {
//     throw new Error('Cannot get an OAuth request token');
//   }
// }


// async function accessToken({
//   oauth_token,
//   oauth_token_secret
// }, verifier) {
//   const authHeader = oauth.toHeader(oauth.authorize({
//     url: accessTokenURL,
//     method: 'POST'
//   }));
//   const path = `https://api.twitter.com/oauth/access_token?oauth_verifier=${verifier}&oauth_token=${oauth_token}`
//   const req = await got.post(path, {
//     headers: {
//       Authorization: authHeader["Authorization"]
//     }
//   });
//   if (req.body) {
//     return qs.parse(req.body);
//   } else {
//     throw new Error('Cannot get an OAuth request token');
//   }
// }


// // post the tweet
// async function getRequest({
//   oauth_token,
//   oauth_token_secret
// }) {

//   const token = {
//     key: oauth_token,
//     secret: oauth_token_secret
//   };

//   const authHeader = oauth.toHeader(oauth.authorize({
//     url: endpointURL,
//     method: 'POST'
//   }, token));

//   const req = await got.post(endpointURL, {
//     json: data,
//     responseType: 'json',
//     headers: {
//       Authorization: authHeader["Authorization"],
//       'user-agent': "v2CreateTweetJS",
//       'content-type': "application/json",
//       'accept': "application/json"
//     }
//   });
//   if (req.body) {
//     return req.body;
//   } else {
//     throw new Error('Unsuccessful request');
//   }
// }

// -----

// (async () => {
//   try {
//     // Get request token
//     const oAuthRequestToken = await requestToken();
//     // Get authorization
//     authorizeURL.searchParams.append('oauth_token', oAuthRequestToken.oauth_token);
//     console.log('Please go here and authorize:', authorizeURL.href);
//     const pin = await input('Paste the PIN here: ');
//     // Get the access token
//     const oAuthAccessToken = await accessToken(oAuthRequestToken, pin.trim());
//     // Make the request
//     const response = await getRequest(oAuthAccessToken);
//     console.dir(response, {
//       depth: null
//     });
//   } catch (e) {
//     console.log(e);
//     process.exit(-1);
//   }
//   process.exit();
// })();

export const notificationTwitter = async <T>(
    triggers: any[],
    payload: INotification<T>
) => {
    try {
        // PAYLOAD

        const {
            type,
            info,
        } = payload;

        // console.log('weave data', triggers);
        // 
        // we only send the idea notifications here, not the trades
        if (type === 'NEW_IDEA_NFT') {

            const {
                nftId,
                provider,
                ticker,
                kind,
                direction,
                price,
                creator,
                company,
                strategy,
            } = info as INotificationEventPayload;

            const ideaStrategyReference = strategy?.reference;
            const ideaStrategyName = strategy?.name;

            // loop through until we have our relevant docId
            for (const i in triggers) {
                if (i) {

                    // we need our strategy reference and the trigger type
                    const triggerStrategyReference = triggers[i].strategy.reference || '';
                    const triggerType = triggers[i].action || '';

                    if (triggerType === 'twitter-post' && triggerStrategyReference === ideaStrategyReference) {
                        // console.log('Twitter trigger', triggers[i]);

                        // TWITTER_CONSUMER_KEY
                        const appKey = triggers[i].settings.appKey || '';
                        // TWITTER_CONSUMER_SECRET
                        const appSecret = triggers[i].settings.appSecret || '';
                        // TWITTER_ACCESS_TOKEN,
                        const accessToken = triggers[i].settings.accessToken || '';
                        // TWITTER_ACCESS_TOKEN_SECRET,
                        const accessSecret = triggers[i].settings.accessSecret || '';

                        if (appKey.length > 0 && appSecret.length > 0 && accessToken.length > 0 && accessSecret.length > 0) {

                            const client = new TwitterApi({
                                appKey,
                                appSecret,
                                accessToken,
                                accessSecret,
                            });

                            // console.log('client', client);

                            let msgText = '';
                            // if this is a 
                            if (kind === 'open') {
                                // do nothing for the open
                            } else if (kind === 'close') {
                                msgText = 'For the ' + ideaStrategyName + ' strategy, a position in ' + ticker + ' has now been closed. Verify performance on-chain at https://alphacapture.xyz/ideas/' + nftId;

                                try {
                                    const tweet = await client.v2.tweet(msgText);
                                    // console.log(`Tweet posted with ID ${tweet.data.id}`);
                                } catch (error) {
                                    // console.error(`Failed to post tweet: ${error}`);
                                }                            
                            }

                            // console.log('send a message to twitter', msgText);
                        }
                        
                    }

                }
            }
        }

    } catch (err) {
        console.log('Twitter notification (error)', err.message);
    }
};


