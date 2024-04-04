import axios from 'axios';

export type TQwilGroup = 'kyc' | 'orders' | 'deposits' | 'withdrawals' | 'gb10discussion';

import {
    INotification,
    INotificationEventPayload,
    INotificationPayload,
} from '../../interfaces/notification.i';
import { send } from 'process';

export const notificationQwil = async <T>(
    triggers: any[],
    payload: INotification<T>
) => {
    try {
        // PAYLOAD
        const baseURL = 'https://rosalind.qwil.io';

        const {
            type,
            info,
        } = payload;

        // console.log('weave data', triggers);
        // 
        // we only send the idea notifications here, not the trades
        if (type === 'NEW_IDEA_NFT') {

            const {
                nftId,
                provider,
                ticker,
                kind,
                direction,
                price,
                creator,
                company,
                strategy,
            } = info as INotificationEventPayload;

            const ideaStrategyReference = strategy?.reference;

            // loop through until we have our relevant docId
            for (const i in triggers) {
                if (i) {

                    // we need our strategy reference and the trigger type
                    const triggerStrategyReference = triggers[i].strategy.reference || '';
                    const triggerType = triggers[i].action || '';

                    if (triggerType === 'qwil-notification' && triggerStrategyReference === ideaStrategyReference) {
                        // console.log('Qwil trigger', triggers[i]);

                        // where to post
                        const masterApiKey = triggers[i].settings.qwilMasterApiKey;
                        const masterSecretKey = triggers[i].settings.qwilMasterSecretKey;
                        const chatId = triggers[i].settings.qwilChatId;
                        const senderId = triggers[i].settings.qwilSenderId;
                                                
                        let msgText = '';
                        // if this is a 
                        if (kind === 'open') {
                            msgText = 'New idea for ' + ticker + ' at ' + price + ' . See https://alphacapture.xyz/ideas/' + nftId;
                        } else if (kind === 'close') {
                            msgText = 'Idea closed for ' + ticker + ' at ' + price + ' . See https://alphacapture.xyz/ideas/' + nftId;
                        }

                        const qwilClient = axios.create({
                            baseURL,
                            headers: {
                                'X-MASTER-USER-API-KEY': masterApiKey,
                                'X-MASTER-USER-API-KEY-SECRET': masterSecretKey,
                                'Content-Type': 'application/json'
                            },
                        });

                        const data = {
                            chat_uuid: chatId,
                            text: msgText,
                        }

                        const rq = await qwilClient.post(
                            `/chat-service/api/chats/messages/send-text?on-behalf-of=${senderId}`, data,
                        );
                    
                    }

                }
            }
        }

    } catch (err) {
        console.log('Qwil notification (error)', err.message);
    }
};