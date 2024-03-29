import 'dotenv/config';

import { expect } from 'chai';

import {
    INotification,
    INotificationPayload
} from '../../src/event-listener/interfaces/notification.i';


import { notificationSlack } from "../../src/event-listener/core/events/notification-slack";
import { notificationTelegram } from "../../src/event-listener/core/events/notification-telegram";
import { notificationTwitter } from "../../src/event-listener/core/events/notification-twitter";

import { weaveTriggers } from "../../src/event-listener/core/events/triggers";


describe('Notifications', () => {

    it('Send a notification to Twitter', async () => {
        const triggers = await weaveTriggers();

        // const info = {
        //     network: 'polygon',
        //     nftId: 1337,
        //     blockNumber: 53870198,
        //     provider: 'IG Group',
        //     ticker: 'SG.D.SNOWUS.DAILY.IP',
        //     kind: 'close',
        //     direction: 'long',
        //     price: 23094,
        //     creator: {
        //         name: 'Cynan Rhodes',
        //         walletAddress: '0x2767441E044aCd9bbC21a759fB0517494875092d',
        //     },
        //     company: 'Mawson Capital',
        //     strategy: {
        //         reference: 'f218a176db4e1d07d27ba6',
        //         name: 'US Tech Momentum',
        //     },
        // }

        const info = {
            network: 'polygon',
            nftId: 1757,
            blockNumber: 55222431,
            provider: 'Binance',
            ticker: 'CHZUSDT',
            kind: 'close',
            direction: 'long',
            price: 0.14737,
            creator: {
                name: 'Cynan Rhodes',
                walletAddress: '0x2767441E044aCd9bbC21a759fB0517494875092d',
            },
            company: 'Mawson Capital',
            strategy: {
                reference: 'ce23cd4cf56ce46c0eef2c',
                name: 'Crypto Momentum',
            },
        }

        // const info = {};        
        const notification = await notificationTwitter(triggers, {
            type: 'NEW_IDEA_NFT',
            info,
        } as INotification<any>);

        // const notification = await notificationSlack(triggers, {
        //     type: 'NEW_IDEA_NFT',
        //     info,
        // } as INotification<any>);

        // add the assertion and the expectation to complete the test like you prefer
    }).timeout(50000);
});
