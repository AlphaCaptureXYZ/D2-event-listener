import 'dotenv/config';

import { expect } from 'chai';

import * as config from '../../src/event-listener/config/config';

import { EnvType } from '../../src/event-listener/interfaces/shared.i';

import { WeaveDBModule } from '../../src/event-listener/modules/weavedb.module';

import { PkpAuthModule } from '../../src/event-listener/modules/pkp-auth.module';

import { notificationTelegram } from '../../src/event-listener/core/events/notification-telegram';

import {
    D2EventListener
} from '../../src/event-listener';

describe('Send a notification to a Telegram group', () => {

    it('Get trigger and send the notification', async () => {

        // const chain = 'mumbai';
        const chain = 'polygon';

        //
        const testWeave = false;

        if (testWeave) {
            const mode = config.APP_ENV as EnvType;

            // doc Id for our trigger
            const docId = '059d50b6123376bdbb792cc12ee99cc7';

            const pkpInfo = await config.getPKPInfo(chain);
            // console.log('pkpInfo', pkpInfo);

            const authSigh = await PkpAuthModule.getPkpAuthSig(
                chain,
                pkpInfo.pkpPublicKey,
            );

            const data = await WeaveDBModule.getAllData<any>(
                chain,
                {
                    type: 'trigger',
                },
                authSigh
            );
            // console.log('weave data', data);

            // loop through until we have our relevant docId
            for (const i in data) {
                if (i) {
                    if (data[i].docId === docId) {
                        console.log('send the telegram bot');
                        // await notification();
                    }
                }
            }
        }

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

        // const orderRequest = orderDetail?.request;
        // console.log('orderRequest', orderRequest);
        // const orderResponse = orderDetail?.response;        
        // console.log('orderResponse', orderResponse);
        
 
    }).timeout(50000);


});
