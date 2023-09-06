import * as config from '../../src/event-listener/config/config';

import { expect } from 'chai';
import { isNullOrUndefined } from '../../src/event-listener/helpers/helpers';

import {
    D2EventListener
} from '../../src/event-listener';

describe('D2EventListener Implementation', () => {

    it('Full event listener test: Listen/Watch the idea nft flow (crypto), retrive info (trigger, credential, and decrypt, etc) and place the Binance order', async () => {

        const data: any[] = await D2EventListener({
            network: 'mumbai',
            privateKey: config.WALLET_PRIVATE_KEY,
            test: {
                enabled: true,
                // Block number linked to BTCUSDT test idea
                blockNumber: 39793282,
            }
        });

        const orderDetail = data.find(res => res);

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
