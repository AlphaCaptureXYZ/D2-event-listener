import 'dotenv/config';

import { expect } from 'chai';

import * as config from '../../src/event-listener/config/config';

import { EnvType } from '../../src/event-listener/interfaces/shared.i';

import { WeaveDBModule } from '../../src/event-listener/modules/weavedb.module';

import { PkpAuthModule } from '../../src/event-listener/modules/pkp-auth.module';

// import { notificationTelegram } from '../../src/event-listener/core/events/notification-telegram';

import { isNullOrUndefined } from '../../src/event-listener/helpers/helpers';

import {
    D2EventListener
} from '../../src/event-listener';

describe('Send a notification to a Telegram group', () => {

    it('Get trigger and send the notification', async () => {


        const data: any[] = await D2EventListener({
            network: 'mumbai',
            privateKey: config.WALLET_PRIVATE_KEY,
            test: {
                enabled: true,
                // Block number linked to BTCUSDT test idea
                blockNumber: 41969920,
            }
        });

        console.log('data', data);

        const orderDetail = data.find(res => res);

        console.log('orderDetail', orderDetail);

        const orderRequest = orderDetail?.request;
        const orderResponse = orderDetail?.response;

        expect(isNullOrUndefined(orderRequest)).to.be.false;
        expect(isNullOrUndefined(orderResponse)).to.be.false;
        expect(orderResponse).to.be.an('object');
        expect(orderResponse).to.have.property('orderId');
        expect(orderResponse).to.have.property('status');
        expect(orderResponse.status).to.be.equal('FILLED');

 
    }).timeout(50000);


});
