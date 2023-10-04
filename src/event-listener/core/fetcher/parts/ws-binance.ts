import 'isomorphic-fetch';

import {
    EventEmitterModule as EventEmitter,
} from '../../../modules/event-emitter.module';

import { ICreateBasicIdea } from '../../../interfaces/shared.i';
import { getBoolean } from '../../../helpers/helpers';
import { wsLogger } from '../../../utils/utils';

import { WebSocket } from 'ws';

type EnvType = 'prod' | 'demo';

const connectionCheck: any = {};

const getApiUrl = (env: EnvType) => {
    const data = {
        prod: 'api.binance.com',
        demo: 'testnet.binance.vision',
    };
    return data[env] || null;
};

const getWSUrl = (env: EnvType) => {
    const data = {
        prod: 'stream.binance.com:9443',
        demo: 'testnet.binance.vision',
    };
    return data[env] || null;
};

export interface IExecutionReport {
    eventType: 'executionReport';
    eventTime: number;
    symbol: string;
    newClientOrderId: string;
    side: string;
    orderType: string;
    cancelType: string;
    quantity: number;
    price: number;
    stopPrice: number;
    icebergQuantity: number;
    orderListId: number;
    originalClientOrderId: string;
    executionType: string;
    orderStatus: string;
    rejectReason: string;
    orderId: number;
    lastTradeQuantity: number;
    accumulatedQuantity: number;
    lastTradePrice: number;
    commission: number;
    commissionAsset: string | null;
    tradeTime: number;
    tradeId: number;
    ignoreThis1: number;
    isOrderOnBook: false;
    isMaker: false;
    ignoreThis2: true;
    orderCreationTime: number;
    cummulativeQuoteAssetTransactedQty: number;
    lastQuoteAssetTransactedQty: number;
    orderQuoteQty: number;
}

const getListenKey = async (
    apiKey: string,
    env: EnvType,
) => {
    const options = {
        method: 'POST',
        headers: {
            'User-Agent': 'PostmanRuntime/7.29.2',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': '*/*',
            'X-MBX-APIKEY': apiKey,
        },
    };

    const urlPrefix = getApiUrl(env);
    const url = `https://${urlPrefix}/api/v3/userDataStream`;
    const res = await fetch(url, options);
    const data = await res.json();
    return data?.listenKey || null;
};

const keepAliveDataStream = async (params: {
    apiKey: string,
    listenKey: string,
    env: EnvType,
}
) => {
    try {
        const {
            apiKey,
            listenKey,
            env,
        } = params;

        const options = {
            method: 'PUT',
            headers: {
                'User-Agent': 'PostmanRuntime/7.29.2',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': '*/*',
                'X-MBX-APIKEY': apiKey,
            },
        };

        const urlPrefix = getApiUrl(env);
        const url = `https://${urlPrefix}/api/v3/userDataStream?listenKey=${listenKey}`;
        const res = await fetch(url, options);
        await res.json();
    } catch (err) {
        console.log('[ws binance] keepAliveDataStream error', err?.message);
    }
};

const responseParser = (response: any) => {
    try {
        if (response?.e === 'executionReport' && response?.X === 'FILLED') {
            response = {
                eventType: response?.e,
                eventTime: response?.E,
                symbol: response?.s,
                newClientOrderId: response?.c,
                side: response?.S,
                orderType: response?.o,
                cancelType: response?.x,
                quantity: response?.q,
                price: response?.p,
                stopPrice: response?.P,
                icebergQuantity: response?.F,
                orderListId: response?.g,
                originalClientOrderId: response?.C,
                executionType: response?.x,
                orderStatus: response?.X,
                rejectReason: response?.r,
                orderId: response?.i,
                lastTradeQuantity: response?.l,
                accumulatedQuantity: response?.z,
                lastTradePrice: response?.L,
                commission: response?.n,
                commissionAsset: response?.N,
                tradeTime: response?.T,
                tradeId: response?.t,
                ignoreThis1: response?.I,
                isOrderOnBook: response?.w,
                isMaker: response?.m,
                ignoreThis2: response?.M,
                orderCreationTime: response?.O,
                cummulativeQuoteAssetTransactedQty: response?.Z,
                lastQuoteAssetTransactedQty: response?.Y,
                orderQuoteQty: response?.Q,
            };
            const trade = response as IExecutionReport;
            wsLogger({
                message: `New order filled (Binance trade) | TradeID: ${trade.tradeId}, OrderID: ${trade.orderId}, ClientId: ${trade.newClientOrderId || 'none'}, Symbol: ${trade.symbol}, Side: ${trade.side}`,
                type: 'success',
                data: response,
            });

            // if the "newClientOrderId" include "_D2EL" (example: RBPCZLEPM_D2EL) it means that the order was created by the D2, so in this part we need to know when the order is generated via D2 or not (i.e. generated by the user directly)
            const d2OrderCheck = trade?.newClientOrderId?.split('_')?.[1] === 'D2EL';

            // idea generated by the user directly 
            if (!d2OrderCheck) {
                const sideToDirection = {
                    BUY: 'long',
                    SELL: 'short',
                };

                EventEmitter().emit('CREATE_IDEA', {
                    conviction: 100,
                    direction: sideToDirection[trade.side],
                    pricingProvider: 'Binance',
                    reference: trade.newClientOrderId,
                    ticker: trade.symbol,
                } as ICreateBasicIdea);
            }

        }
    } catch (err) {
        console.log('responseParser error', err?.message);
    }
    return response;
};

export const connect = async (params: {
    id: string,
    apiKey: string,
    apiSecret: string,
    env: EnvType,
}) => {
    const {
        id,
        apiKey,
        env,
    } = params;

    if (!getBoolean(connectionCheck[id])) {

        const listenKey = await getListenKey(apiKey, env);
        const urlPrefix = getWSUrl(env);

        const wsUrl = ` wss://${urlPrefix}/ws/ws/${listenKey}`;

        const connection = new WebSocket(wsUrl);

        setInterval(async () => {
            await keepAliveDataStream({
                apiKey,
                listenKey,
                env,
            });
        }, (1000 * 60) * 25);

        connection.onopen = () => {
            connectionCheck[id] = true;

            console.log(`The Binance WS connection has been established using this id credential "${id}"`);
        };

        connection.onerror = (error) => {
            console.log(`WebSocket error: ${error}`);
        };

        connection.onmessage = (e) => {
            const info = JSON.parse(e.data);
            responseParser(info);
        };


    }
}