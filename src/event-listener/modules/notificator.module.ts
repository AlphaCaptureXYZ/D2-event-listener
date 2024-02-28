import 'dotenv/config';

import * as rp from 'request-promise-native';

// quick test to notify the results of the event listener
const sendNotificationSlack = async <T>(
    params: {
        webhook: string,
        payload: {
            username: string;
            text: string;
            icon_emoji: string;
            attachments: Array<{
                color: string;
                fields: Array<{
                    title: string;
                    value: string;
                    short: boolean;
                }>;
                actions: Array<{
                    type: string;
                    text: string;
                    url: string;
                }>
            }>
        }
    }
) => {
    try {

        const {
            payload,
            webhook,
        } = params;
        // console.log('payload', payload);
        // console.log('process.env.SLACK_WEBHOOK_URL', process.env.SLACK_WEBHOOK_URL);

        const options = {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Request-Promise',
            },
            method: 'POST',
            uri:  webhook,
            json: true,
            body: payload
        };

        const response = await rp(options);
        // console.log('response', response);

    } catch (err) { }
};

// quick test to notify the results of the event listener
const sendNotificationTelegram = async <T>(
    params: {
        payload: {
            username: string;
            text: string;
            icon_emoji: string;
            attachments: Array<{
                color: string;
                fields: Array<{
                    title: string;
                    value: string;
                    short: boolean;
                }>;
                actions: Array<{
                    type: string;
                    text: string;
                    url: string;
                }>
            }>
        }
    }
) => {
    try {

        const {
            payload
        } = params;

        const options = {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Request-Promise',
            },
            method: 'POST',
            uri:  process.env.SLACK_WEBHOOK_URL,
            json: true,
            body: payload
        };

        await rp(options);

    } catch (err) { }
};

export const NotificatorModule = {
    sendNotificationSlack,
    sendNotificationTelegram,
}