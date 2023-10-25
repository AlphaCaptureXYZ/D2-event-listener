import {
    INotification,
    INotificationEventPayload,
    INotificationPayload,
} from '../../../event-listener/interfaces/notification.i';

import { NotificatorModule } from '../../modules/notificator.module';

export const notification = async <T>(
    payload: INotification<T>
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
                nftId,
                blockNumber,
                data,
                orderId,
                docID,
                error,
                environment,
                pkpInfo,
            } = info as INotificationPayload;

            const fields: any[] = [
                {
                    title: 'Context',
                    value: 'D2 Event Listener (Order)',
                    short: false,
                },
                {
                    title: 'Pkp Key',
                    value: pkpInfo?.pkpPublicKey,
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
                    title: 'Environment',
                    value: environment,
                    short: false,
                },
            ];

            if (orderId) {
                fields.push({
                    title: 'OrderID',
                    value: orderId,
                    short: false,
                });
            }

            if (docID) {
                fields.push({
                    title: 'DocumentID (weavedb)',
                    value: docID,
                    short: false,
                });
            }

            if (error) {
                fields.push({
                    title: 'Error',
                    value: error,
                    short: false,
                });
            }

            if (data?.idea?.asset?.ticker && orderId && !error) {
                await NotificatorModule.sendNotification({
                    payload: {
                        username: 'D2 Event Listener (Order)',
                        text: `A new order has been placed. Check the details to know more about it.`,
                        icon_emoji: ':page_with_curl:',
                        attachments: [
                            {
                                color: '#71BFF0',
                                fields,
                                actions: []
                            }
                        ],
                    }
                });
            }

            if (error) {
                await NotificatorModule.sendNotification({
                    payload: {
                        username: 'D2 Event Listener (Order)',
                        text: `An error occurred while processing the order. Check the details to know more about it.`,
                        icon_emoji: ':page_with_curl:',
                        attachments: [
                            {
                                color: '#71BFF0',
                                fields,
                                actions: []
                            }
                        ],
                    }
                });
            }

        }

        if (type === 'NEW_IDEA_NFT') {

            const {
                network,
                nftId,
                blockNumber,
                provider,
                ticker,
                kind,
                direction,
                price,
                creator,
                company,
                strategy,
            } = info as INotificationEventPayload;

            const fields: any[] = [
                {
                    title: 'Context',
                    value: 'D2 Event Listener (New Idea NFT)',
                    short: false,
                },
                {
                    title: 'Network',
                    value: network,
                    short: false
                },
                {
                    title: 'Idea NFT (ID)',
                    value: nftId,
                    short: false
                },
                {
                    title: 'BlockNumber',
                    value: blockNumber,
                    short: false,
                },
                {
                    title: 'Strategy',
                    value: `${strategy?.name} (${strategy?.reference})`,
                    short: false
                },
                {
                    title: 'Creator',
                    value: `${creator?.name} (${creator?.walletAddress})`,
                    short: false
                },
                {
                    title: 'Company',
                    value: company,
                    short: false,
                },
                {
                    title: 'Ticker',
                    value: ticker,
                    short: false
                },
                {
                    title: 'Direction',
                    value: direction || 'none',
                    short: false,
                },
                {
                    title: 'Kind',
                    value: kind,
                    short: false,
                },
                {
                    title: 'Provider',
                    value: provider,
                    short: false,
                },
                {
                    title: 'Price',
                    value: `$${price}`,
                    short: false,
                },
            ];

            await NotificatorModule.sendNotification({
                payload: {
                    username: 'D2 Event Listener (Idea created)',
                    text: `A new idea has been created. Check the details to know more about it.`,
                    icon_emoji: ':page_with_curl:',
                    attachments: [
                        {
                            color: '#71BFF0',
                            fields,
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