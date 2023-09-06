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
            result,
        } = payload;

        await WeaveDBModule.addData<any>(
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

    } catch (err) {
        console.log('orderStore (error)', err.message);
    }
};