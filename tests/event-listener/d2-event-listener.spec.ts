import 'dotenv/config';

import { expect } from 'chai';
import { isNullOrUndefined } from '../../src/event-listener/helpers/helpers';

import {
    D2EventListener
} from '../../src/event-listener';

describe('D2EventListener Implementation', () => {

    it('Complete full test: Listen the idea nft, retrive info (trigger, credential, etc) and decrypt to place the order', async () => {

        const data: any[] = await D2EventListener({
            network: 'mumbai',
            privateKey: process.env.WALLET_PRIVATE_KEY,
            test: {
                enabled: true,
                // Block number linked to BTCUSDT test idea
                blockNumber: 39535294,
            }
        });

        const order = data.find(res => res);

        expect(isNullOrUndefined(order)).to.be.false;
        expect(order).to.be.an('object');
        expect(order).to.have.property('orderId');
        expect(order).to.have.property('status');
        expect(order.status).to.be.equal('FILLED');

    }).timeout(50000);

});
