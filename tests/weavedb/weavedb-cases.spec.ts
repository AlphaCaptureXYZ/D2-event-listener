import 'dotenv/config';

import { expect } from 'chai';

import * as config from '../../src/event-listener/config/config';

import { isNullOrUndefined } from '../../src/event-listener/helpers/helpers';

import { WeaveDBModule } from '../../src/event-listener/modules/weavedb.module';

import { PkpAuthModule } from '../../src/event-listener/modules/pkp-auth.module';

describe('WeaveDB Cases', () => {

    xit('Store/Add info (orders)', async () => {

        const chain = 'mumbai';

        const provider = 'Binance';

        const userWalletAddress = '0xaB31A127b112CcF2e97fC54A842A6a3b7070BEa9';

        const request = {
            symbol: 'BTCUSDT',
            side: 'BUY',
            quantity: '0.00044',
            type: 'MARKET',
            timestamp: 1694011298763,
            recvWindow: 60000
        };

        const response = {
            symbol: 'BTCUSDT',
            orderId: 1038,
            orderListId: -1,
            clientOrderId: 'CDMYgOYYxHlRvsF1SG6A7a',
            transactTime: 1694011299455,
            price: '0.00000000',
            origQty: '0.00044000',
            executedQty: '0.00044000',
            cummulativeQuoteQty: '11.42904840',
            status: 'FILLED',
            timeInForce: 'GTC',
            type: 'MARKET',
            side: 'BUY',
            workingTime: 1694011299455,
            fills: [
                {
                    price: '25975.11000000',
                    qty: '0.00044000',
                    commission: '0.00000000',
                    commissionAsset: 'BTC',
                    tradeId: 650
                }
            ],
            selfTradePreventionMode: 'NONE'
        };

        const result = {
            request,
            response,
        };

        const data = await WeaveDBModule.addData<any>(
            chain,
            {
                jsonData: {
                    provider,
                    result,
                },
                pkpKey: config.PKP_KEY,
                type: 'order',
                userWallet: userWalletAddress,
            }
        );

        expect(isNullOrUndefined(data)).to.be.false;
        expect(data?.success).to.be.true;

    }).timeout(50000);

    xit('Get info (orders)', async () => {

        const chain = 'mumbai';

        const data = await WeaveDBModule.getAllData<any>(
            chain,
            {
                type: 'order',
                dataIsCompressed: true,
                byUserWalletFilter: true,
            }
        );

        console.log(data);

        expect(isNullOrUndefined(data)).to.be.false;

    }).timeout(50000);

    xit('Get trigger info by pkp', async () => {

        const chain = 'mumbai';

        const authSigh = await PkpAuthModule.getPkpAuthSig(
            chain,
            config.PKP_KEY,
        );

        const data = await WeaveDBModule.getAllData<any>(
            chain,
            {
                type: 'trigger',
            },
            authSigh
        );

        expect(isNullOrUndefined(data)).to.be.false;

    }).timeout(50000);

    xit('Delete info by document Id', async () => {

        const docID = 'acb81c9d9fc5d14e0909f19d22c552af';

        const data = await WeaveDBModule.deleteData(docID);

        expect(isNullOrUndefined(data)).to.be.false;
        expect(data?.success).to.be.true;

    }).timeout(50000);

    xit('Delete all the info (orders)', async () => {

        const chain = 'mumbai';

        const data = await WeaveDBModule.getAllData<any>(
            chain,
            {
                type: 'order',
                dataIsCompressed: true,
                byUserWalletFilter: true,
            }
        );

        console.log('Data to delete', data?.length);

        for (const item of data) {
            const docId = item.docId;
            console.log('Deleting docId', docId);
            await WeaveDBModule.deleteData(docId);
            console.log('Deleted docId', docId);
        }

        const dataPostDelete = await WeaveDBModule.getAllData<any>(
            chain,
            {
                type: 'order',
                dataIsCompressed: true,
                byUserWalletFilter: true,
            }
        );

        console.log('Data post delete', dataPostDelete?.length);

        expect(isNullOrUndefined(data)).to.be.false;
        expect(data?.length > 0).to.be.true;
        expect(isNullOrUndefined(dataPostDelete)).to.be.false;
        expect(dataPostDelete?.length <= 0).to.be.true;

    }).timeout(50000);

});
