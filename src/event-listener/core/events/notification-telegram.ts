const TelegramBot = require('node-telegram-bot-api');
// import {TelegramBot} from  'node-telegram-bot-api';

import {
    INotification,
    INotificationEventPayload,
    INotificationPayload,
} from '../../interfaces/notification.i';

// import { NotificatorModule } from '../../modules/notificator.module';

export const notificationTelegram = async <T>(
    payload: INotification<T>
) => {
    try {

        // this need
        const token = '6699019551:AAEnKU6nSTjAyV6E7PEnaBo9bMvUZEg4ZCE';
        
        const bot = new TelegramBot(token);
        const chatId = '-4163709012';

        await bot.sendMessage(chatId, 'Testing 2');
        // console.log('test', test);

        const {
            type,
            info,
        } = payload;
        console.log('this is the payload in the telegram not', payload);

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

        console.log('fields', fields);

        // await NotificatorModule.sendNotificationTelegram({
        //     payload: {
        //         username: 'D2 Event Listener (Idea created)',
        //         text: `A new idea has been created. Check the details to know more about it.`,
        //         icon_emoji: ':page_with_curl:',
        //         attachments: [
        //             {
        //                 color: '#71BFF0',
        //                 fields,
        //                 actions: []
        //             }
        //         ],
        //     }
        // });


    } catch (err) {
        console.log('Telegram notification (error)', err.message);
    }
};