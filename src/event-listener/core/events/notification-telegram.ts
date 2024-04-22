const TelegramBot = require('node-telegram-bot-api');
// import {TelegramBot} from  'node-telegram-bot-api';

import {
    INotification,
    INotificationEventPayload,
    INotificationPayload,
} from '../../interfaces/notification.i';

export const notificationTelegram = async <T>(
    triggers: any[],
    payload: INotification<T>
) => {
    try {
        // PAYLOAD

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

                    if (triggerType === 'telegram-notification' && triggerStrategyReference === ideaStrategyReference) {
                        // console.log('Telegram trigger', triggers[i]);

                        // where to post
                        const chatId = triggers[i].settings.chatId || '';
                        const chatToken = triggers[i].settings.chatToken || '';
                        const threadId = Number(triggers[i].settings.threadId) || 0;

                        const bot = new TelegramBot(chatToken);

                        let msgText = '';
                        // if this is a 
                        if (kind === 'open') {
                            msgText = 'New idea for ' + ticker + ' at ' + price + ' . See https://alphacapture.xyz/ideas/' + nftId;
                        } else if (kind === 'close') {
                            msgText = 'Idea closed for ' + ticker + ' at ' + price + ' . See https://alphacapture.xyz/ideas/' + nftId;
                        }

                        // if we have a thread id (topic) then we need to pass an additional param
                        // console.log('msgText', msgText);
                        if (threadId > 0) {
                            // await bot.sendMessage(chatId, msgText, {message_thread_id: threadId, link_preview_options: {is_disabled: true}});
                            await bot.sendMessage(chatId, msgText, {message_thread_id: threadId, disable_web_page_preview: true});
                            
                            // await bot.sendMessage(chatId, msgText);
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