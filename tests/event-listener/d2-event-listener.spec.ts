import * as config from '../../src/event-listener/config/config';

import { expect } from 'chai';
import { isNullOrUndefined } from '../../src/event-listener/helpers/helpers';

import {
    D2EventListener
} from '../../src/event-listener';

describe('D2EventListener Implementation', () => {

    it('Full event listener test: Listen/Watch the idea nft flow (crypto), retrive info (trigger, credential, and decrypt, etc) and place the order', async () => {

        // const data: any[] = await D2EventListener({
        //     network: 'polygon',
        //     privateKey: config.WALLET_PRIVATE_KEY,
        //     test: {
        //         enabled: true,
        //         // Block number linked to BTCUSDT test idea
        //         blockNumber: 55527197,
        //     }
        // });

        const data: any[] = await D2EventListener({
            network: 'polygon',
            privateKey: config.WALLET_PRIVATE_KEY,
            test: {
                enabled: true,
                // Block number linked to ETHUSDT test idea
                blockNumber: 56499314,
            }
        });

        // {
        //     "asset": "ETHUSDT",
        //     "nftId": 2171,
        //     "blockNumber": 56499314,
        //     "credentialNftUUID": "0xc93abb7261d76a2b0d0fed72a9ee42c5",
        //     "userWalletAddress": "0x2767441E044aCd9bbC21a759fB0517494875092d",
        //     "environment": "prod"
        //   }

        console.log('data', data);

        // const orderDetail = data.find(res => res);

        // console.log('orderDetail', orderDetail);

        // const orderRequest = orderDetail?.request;
        // const orderResponse = orderDetail?.response;

        // expect(isNullOrUndefined(orderRequest)).to.be.false;
        // expect(isNullOrUndefined(orderResponse)).to.be.false;
        // expect(orderResponse).to.be.an('object');
        // expect(orderResponse).to.have.property('orderId');
        // expect(orderResponse).to.have.property('status');
        // expect(orderResponse.status).to.be.equal('FILLED');

    }).timeout(50000);

});
