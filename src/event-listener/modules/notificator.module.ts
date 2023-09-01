import 'dotenv/config';

import * as rp from 'request-promise-native';

// quick test to notify the results of the event listener
const sendNotification = async <T>(
    params: {
        url: string,
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
            url,
            payload
        } = params;

        const options = {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Request-Promise',
            },
            method: 'POST',
            uri: url,
            json: true,
            body: payload
        };

        await rp(options);

    } catch (err) { }
};

export const NotificatorModule = {
    sendNotification,
}