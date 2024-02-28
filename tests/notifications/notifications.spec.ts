import 'dotenv/config';

import { expect } from 'chai';

import {
    INotification,
    INotificationPayload
} from '../../src/event-listener/interfaces/notification.i';


import { notificationSlack } from "../../src/event-listener/core/events/notification-slack";
import { notificationTelegram } from "../../src/event-listener/core/events/notification-telegram";

import { weaveTriggers } from "../../src/event-listener/core/events/triggers";

const info = {
    network: 'polygon',
    nftId: 1337,
    blockNumber: 53870198,
    provider: 'IG Group',
    ticker: 'SG.D.SNOWUS.DAILY.IP',
    kind: 'open',
    direction: 'long',
    price: 23094,
    creator: {
        name: 'Cynan Rhodes',
        walletAddress: '0x2767441E044aCd9bbC21a759fB0517494875092d',
    },
    company: 'Mawson Capital',
    strategy: {
        reference: 'f218a176db4e1d07d27ba6',
        name: 'US Tech Momentum',
    },
}

describe('Notifications', () => {

    xit('Send a notification to a Slack group', async () => {
        const triggers = await weaveTriggers();

        const notification = await notificationSlack(triggers, {
            type: 'NEW_IDEA_NFT',
            info,
        } as INotification<any>);

        // add the assertion and the expectation to complete the test like you prefer
    }).timeout(50000);

    xit('Send a notification to a Telegram group', async () => {
        const triggers = await weaveTriggers();

        const notification = await notificationTelegram(triggers, {
            type: 'NEW_IDEA_NFT',
            info,
        } as INotification<any>);

        // add the assertion and the expectation to complete the test like you prefer
    }).timeout(50000);


});
