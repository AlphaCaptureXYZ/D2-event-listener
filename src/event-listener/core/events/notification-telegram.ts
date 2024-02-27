const TelegramBot = require('node-telegram-bot-api');
// import {TelegramBot} from  'node-telegram-bot-api';

import {
    INotification,
    INotificationEventPayload,
    INotificationPayload,
} from '../../interfaces/notification.i';

import * as config from '../../../event-listener/config/config';

import { EnvType } from '../../../event-listener/interfaces/shared.i';

import { WeaveDBModule } from '../../../event-listener/modules/weavedb.module';

import { PkpAuthModule } from '../../../event-listener/modules/pkp-auth.module';


// import { NotificatorModule } from '../../modules/notificator.module';

export const notificationTelegram = async <T>(
    payload: INotification<T>
) => {
    try {

        // PAYLOAD

        const {
            type,
            info,
        } = payload;
        console.log('this is the payload in the telegram not', payload);

        // TELEGRAM

        // const chain = 'mumbai';
        const chain = config.WEAVEDB_CHAIN;

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
            for (const i in data) {
                if (i) {

                    // we need our strategy reference and the trigger type
                    const triggerStrategyReference = data[i].strategy.reference || '';
                    const triggerType = data[i].action || '';

                    if (triggerType === 'telegram-notification' && triggerStrategyReference === ideaStrategyReference) {
                        // console.log('Telegram trigger', data[i]);

                        // where to post
                        const chatId = data[i].settings.chatId || '';
                        const chatToken = data[i].settings.chatToken || '';
                        const threadId = data[i].settings.threadId || 0;

                        const bot = new TelegramBot(chatToken);

                        let msgText = '';
                        // if this is a 
                        if (kind === 'open') {
                            msgText = 'New idea for ' + ticker + ' at ' + price + ' . See https://alphacapture.xyz/ideas/' + nftId;
                        } else if (kind === 'close') {
                            msgText = 'Idea closed for ' + ticker + ' at ' + price + ' . See https://alphacapture.xyz/ideas/' + nftId;
                        }

                        // if we have a thread id (topic) then we need to pass an additional param
                        if (threadId > 0) {
                            await bot.sendMessage(chatId, msgText, {message_thread_id: threadId});
                        } else {
                            await bot.sendMessage(chatId, msgText);
                        }
                    }

                }
            }
        }

    } catch (err) {
        console.log('Telegram notification (error)', err.message);
    }
};