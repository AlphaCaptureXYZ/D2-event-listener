import * as config from '../../config/config';

import { IOrderStorePayload } from '../../../event-listener/interfaces/order.i';

import { WeaveDBModule } from '../../modules/weavedb.module';

export const orderStore = async (
    payload: IOrderStorePayload,
) => {
    try {
        const {
            chain,
            provider,
            userWalletAddress,
            response,
        } = payload;

        const orderStored = await WeaveDBModule.addData<any>(
            chain,
            {
                jsonData: {
                    provider,
                    response,
                },
                pkpKey: config.PKP_KEY,
                type: 'order',
                userWallet: userWalletAddress,
            }
        );

        console.log('orderStore (success)', orderStored);

    } catch (err) {
        console.log('orderStore (error)', err.message);
    }
};