import * as config from '../../config/config';

import { INotificationPayload } from '../../../event-listener/interfaces/notification.i';

import { NotificatorModule } from '../../modules/notificator.module';

export const notification = async (
    payload: INotificationPayload
) => {
    try {

        const {
            type,
            info,
        } = payload;

        if (type === 'NEW_ORDER') {

            const {
                credentialNftUUID,
                credentialOwner,
                balanceInfo,
                nftId,
                blockNumber,
                data,
                orderId,
            } = info;

            console.log(`Order placed successfully. OrderID: ${orderId}`);

            // just to test (will be removed)
            await NotificatorModule.sendNotification({
                url: process.env.SLACK_WEBHOOK_URL,
                payload: {
                    username: 'D2 Event Listener (Order)',
                    text: `A new order has been placed. Check the details to know more about it.`,
                    icon_emoji: ':page_with_curl:',
                    attachments: [
                        {
                            color: '#71BFF0',
                            fields: [
                                {
                                    title: 'Context',
                                    value: 'D2 Event Listener (Order)',
                                    short: false,
                                },
                                {
                                    title: 'Pkp Key',
                                    value: config.PKP_KEY,
                                    short: false
                                },
                                {
                                    title: 'Credential NFT (UUID)',
                                    value: credentialNftUUID,
                                    short: false
                                },
                                {
                                    title: 'Credential Owner',
                                    value: credentialOwner,
                                    short: false,
                                },
                                {
                                    title: 'Balance of Credential Owner',
                                    value: `${balanceInfo?.balance?.toFixed(4)} ${balanceInfo?.base}`,
                                    short: false,
                                },
                                {
                                    title: 'Idea NFT (ID)',
                                    value: nftId,
                                    short: false,
                                },
                                {
                                    title: 'BlockNumber',
                                    value: blockNumber,
                                    short: false,
                                },
                                {
                                    title: 'Strategy',
                                    value: `${data?.strategy?.name} (${data?.strategy?.reference})`,
                                    short: false
                                },
                                {
                                    title: 'Creator',
                                    value: `${data?.creator?.name} (${data?.creator?.walletAddress})`,
                                    short: false
                                },
                                {
                                    title: 'Company',
                                    value: data?.creator?.company,
                                    short: false,
                                },
                                {
                                    title: 'Ticker',
                                    value: data?.idea?.asset?.ticker,
                                    short: false
                                },
                                {
                                    title: 'Direction',
                                    value: data?.idea?.trade?.direction || 'none',
                                    short: false,
                                },
                                {
                                    title: 'Kind',
                                    value: data?.idea?.kind,
                                    short: false,
                                },
                                {
                                    title: 'Provider',
                                    value: data?.pricing?.provider,
                                    short: false,
                                },
                                {
                                    title: 'OrderID',
                                    value: orderId,
                                    short: false,
                                }
                            ],
                            actions: []
                        }
                    ],
                }
            });
        }

    } catch (err) {
        console.log('notification (error)', err.message);
    }
};