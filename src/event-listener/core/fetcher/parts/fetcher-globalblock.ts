import 'isomorphic-fetch';

import {
    buildSignature,
    objectToQueryString,
} from '../../../helpers/helpers';

import { FetcherSource, EnvType } from "../../../../event-listener/interfaces/shared.i";
import { LitModule } from "../../../modules/lit.module";
import { DirectionType } from './shared/order-calculation';
import { rejects } from 'assert';

import { OrderCalcPre } from './calculation-globalblock';

const globalblockUrlSelector = {
    prod: 'https://api.globalblock.eu',
};

const brokerName = 'GlobalBlock';

const getApiUrl = (env: EnvType) => {
    return globalblockUrlSelector[env] || globalblockUrlSelector['demo'];
};

const getPositions = async (
    network: string,
    pkpAuthSig: any,
    params: {
        env: EnvType,
        source: FetcherSource,
        payload: {
            credentials: {
                publicKey: string,
                secretKey: string,
            },
            quote: string,
        },
    },
) => {
    const {
        env,
        payload,
        source,
    } = params;

    let requestUrl = getApiUrl(env);

    let response = null as any;

    const publicKey = payload.credentials?.publicKey
    const secretKey = payload?.credentials.secretKey;
    const quoteCurrency = payload?.quote;

    if (source === 'fetch') {

        requestUrl = requestUrl + '/v2/positions?base=' + quoteCurrency;
        // console.log('requestUrl', requestUrl);

        const options: any = {
            method: 'GET',
            headers: {
                'x-api-key': publicKey,
                'x-secret-key': secretKey,
                'Accept': 'application/json; charset=UTF-8',
                'Content-Type': 'application/json; charset=UTF-8',
            },
            redirect: 'follow',
            mode: 'cors',
        };
        // console.log('options', options);
        
        const res = await fetch(requestUrl, options);
        const data = await res.json();
        const info = data.data || [];
        const category = info.filter(res => res.product === 'TRADE');
        response = category[0].positions || [];

    } else if (source === 'lit-action') {

        const code = `
            const go = async () => {

                const url = '${requestUrl}/v2/positions?base=${quoteCurrency}';

                const options = {
                    method: 'GET',
                    headers: {
                        'x-api-key': '${publicKey}',
                        'x-secret-key': '${secretKey}',
                        'Accept': 'application/json; charset=UTF-8',
                        'Content-Type': 'application/json; charset=UTF-8',
                    },
                    redirect: 'follow',
                    mode: 'cors',
                };

                const response = await fetch(url, options);
                const data = await response.json();
    
                const info = data.data || [];
                const category = info.filter(res => res.product === 'TRADE');
                responseB = category[0].positions || [];
        
                Lit.Actions.setResponse({response: JSON.stringify(responseB)});

            };

            go();
        `;        
        // console.log('options', code);

        const litActionCall = await LitModule().runLitAction({
            chain: network,
            litActionCode: code,
            listActionCodeParams: {
                ...params?.payload,
                auth: {
                    publicKey,
                    secretKey,
                },
            },
            nodes: 1,
            showLogs: false,
            authSig: pkpAuthSig,
        });

        response = litActionCall?.response as any;        
        // console.log('litActionCall response', response);
    }

    return response;
};

const getSingleAsset = async (
    network: string,
    pkpAuthSig: any,
    params: {
        env: EnvType,
        source: FetcherSource,
        payload: {
            credentials: {
                publicKey: string,
                secretKey: string,
            },
            asset: {
                baseCurrency: string,
                quoteCurrency: string
            }
        },
    },
) => {
    const {
        env,
        payload,
        source,
    } = params;

    let requestUrl = getApiUrl(env);

    let response = null as any;

    const publicKey = payload.credentials?.publicKey
    // console.log('publicKey', publicKey);
    const secretKey = payload?.credentials.secretKey;
    // console.log('secretKey', secretKey);
    const baseCurrency = payload?.asset.baseCurrency;
    const quoteCurrency = payload?.asset.quoteCurrency;

    // console.log('source', source);
    if (source === 'fetch') {

        requestUrl = requestUrl + '/v2/markets/' + baseCurrency + '/' + quoteCurrency;
        // console.log('requestUrl', requestUrl);

        const options: any = {
            method: 'GET',
            headers: {
                'x-api-key': publicKey,
                'x-secret-key': secretKey,
                'Accept': 'application/json; charset=UTF-8',
                'Content-Type': 'application/json; charset=UTF-8',
            },
            redirect: 'follow',
            mode: 'cors',
        };
        // console.log('options', options);
        
        const res = await fetch(requestUrl, options);
        // console.log('res', res);
        const data = await res.json();
        // console.log('data', data);
        response = data;

    } else if (source === 'lit-action') {

        const code = `
            const go = async () => {

                const url = '${requestUrl}/v2/markets/${baseCurrency}/${quoteCurrency}';

                const options = {
                    method: 'GET',
                    headers: {
                        'x-api-key': '${publicKey}',
                        'x-secret-key': '${secretKey}',
                        'Accept': 'application/json; charset=UTF-8',
                        'Content-Type': 'application/json; charset=UTF-8',
                    },
                    redirect: 'follow',
                    mode: 'cors',
                };

                const res = await fetch(requestUrl, options);
                const data = await res.json();        
                Lit.Actions.setResponse({response: JSON.stringify(data)});
            };

            go();
        `;        
        // console.log('options', code);

        const litActionCall = await LitModule().runLitAction({
            chain: network,
            litActionCode: code,
            listActionCodeParams: {
                ...params?.payload,
                auth: {
                    publicKey,
                    secretKey,
                },
            },
            nodes: 1,
            showLogs: false,
            authSig: pkpAuthSig,
        });

        response = litActionCall?.response as any;        
        // console.log('litActionCall response', response);
    }

    return response;
};

const postPlaceMarketOrder = async (
    network: string,
    pkpAuthSig: any,
    params: {
        env: EnvType,
        source: FetcherSource,
        payload: {
            credentials: {
                publicKey: string,
                secretKey: string,
            },
            data: {
                baseCurrency: string,
                quoteCurrency: string
                direction: DirectionType,
                quantity: number,
            }
        },
    },
) => {
    const {
        env,
        payload,
        source,
    } = params;

    let requestUrl = getApiUrl(env);

    let response = null as any;

    const publicKey = payload.credentials?.publicKey
    // console.log('publicKey', publicKey);
    const secretKey = payload?.credentials.secretKey;
    // console.log('secretKey', secretKey);
    const baseCurrency = payload?.data.baseCurrency;
    const quoteCurrency = payload?.data.quoteCurrency;
    const direction = payload?.data.direction;
    // console.log('direction', direction);
    const quantity = payload?.data.quantity;
    // console.log('quantity', quantity);

    if (source === 'fetch') {

        requestUrl = requestUrl + '/v1/order';
        // console.log('requestUrl', requestUrl);

        const body = {
            "baseAsset": baseCurrency,
            "quoteAsset": quoteCurrency,
            "side": direction,
            "baseQty": quantity
        };
        // console.log('body', body);

        let globalResponse = null;

        // only make the post IF the size > 0
        if (Number(payload.data.quantity) > 0) {

            const options: any = {
                method: 'POST',
                headers: {
                    'x-api-key': publicKey,
                    'x-secret-key': secretKey,
                    'Accept': 'application/json; charset=UTF-8',
                    'Content-Type': 'application/json; charset=UTF-8',
                },
                redirect: 'follow',
                mode: 'cors',
                body: JSON.stringify(body)
            };
            // console.log('options', options);
            
            const res = await fetch(requestUrl, options);
            // console.log('res', res);
            const data = await res.json();
            // const data = '';
            // console.log('data', data);
            // response = data;
            // const data = 'this is the GB response';
            globalResponse = data;

        } else {
            globalResponse = {
                error: 'Order quanity was zero so no request was made to IG Group',
            }
        }

        response = {
            response: globalResponse,
            request: body,
        };


    } else if (source === 'lit-action') {

        let globalResponse = null;

        const body = {
            baseAsset: baseCurrency,
            quoteAsset: quoteCurrency,
            side: direction,
            baseQty: quantity,
        };

        // only make the post IF the size > 0
        if (Number(payload.data.quantity) > 0) {

            const code = `
                const go = async () => {

                    const url = '${requestUrl}/v1/order';

                    const body = {
                        "baseAsset": '${baseCurrency}',
                        "quoteAsset": '${quoteCurrency}',
                        "side": '${direction}',
                        "baseQty": ${quantity},
                    };
            
                    const options = {
                        method: 'POST',
                        headers: {
                            'x-api-key': '${publicKey}',
                            'x-secret-key': '${secretKey}',
                            'Accept': 'application/json; charset=UTF-8',
                            'Content-Type': 'application/json; charset=UTF-8',
                        },
                        redirect: 'follow',
                        mode: 'cors',
                        body: JSON.stringify(body)     
                    };

                    const res = await fetch(requestUrl, options);
                    const data = await res.json();        
                    Lit.Actions.setResponse({response: JSON.stringify(data)});
                };

                go();
            `;        
            // console.log('options', code);

            const litActionCall = await LitModule().runLitAction({
                chain: network,
                litActionCode: code,
                listActionCodeParams: {
                    ...params?.payload,
                    auth: {
                        publicKey,
                        secretKey,
                    },
                },
                nodes: 1,
                showLogs: false,
                authSig: pkpAuthSig,
            });

            globalResponse = litActionCall?.response as any;        
            // console.log('litActionCall response', response);

            response = {
                response: globalResponse,
                request: body,
            };

        } else {

            const globalResponse = {
                error: 'Order quanity was zero so no request was made to IG Group',
            }

            response = {
                response: globalResponse,
                request: body,
            };

        }        
        
    } else if (source === 'testing') {

        const code = `
            const go = async () => {

                const url = '${requestUrl}/v1/order';

                const options = {
                    method: 'POST',
                    headers: {
                        'x-api-key': '${publicKey}',
                        'x-secret-key': '${secretKey}',
                        'Accept': 'application/json; charset=UTF-8',
                        'Content-Type': 'application/json; charset=UTF-8',
                    },
                    redirect: 'follow',
                    mode: 'cors',
                    body: {
                        "baseAsset": '${baseCurrency}',
                        "quoteAsset": '${quoteCurrency}',
                        "side": '${direction}',
                        "quoteQty": ${quantity},
                    }        
                };

                const res = await fetch(requestUrl, options);
                const data = await res.json();        
                Lit.Actions.setResponse({response: JSON.stringify(data)});
            };

            go();
        `;        
        response = code;
        // console.log('options', code);        
    }

    return response;
};

const closePosition = async (
    network: string,
    pkpAuthSig: any,
    params: {
        env: EnvType,
        source: FetcherSource,
        payload: {
            credentials: {
                publicKey: string,
                secretKey: string,
            },
            data: {
                baseCurrency: string,
                quoteCurrency: string
            }
        }
    }
) => {

    // if currencyA is the same as currencyB then there is nothing to close
    if (params.payload.data.baseCurrency === params.payload.data.quoteCurrency) {
        const msg = 'The base and quote currencies must differ';
        return msg;
    }

    const {
        env,
        source,
        payload,
    } = params;


    const paramsPos = {
        env: params?.env,
        source: params?.source,
        payload: {
            credentials: {
                publicKey: payload.credentials.publicKey,
                secretKey: payload.credentials.secretKey,
            },
            quote: payload.data.quoteCurrency,
        }
    };    
    // console.log('paramsPos', paramsPos);
    const positions = await getPositions(
        network,
        pkpAuthSig,
        paramsPos
    );
    // console.log('positions', positions);

    // get the position that we want to close
    const positionToClose = positions.filter(res => res.currency === payload.data.baseCurrency);

    // get the qty
    // console.log('positionToClose', positionToClose);
    const closeqty = positionToClose[0].available;
    // console.log('closeqty', closeqty);

    // now instruct the close
    let response;
    if (closeqty > 0) {

        const paramsClose = {
            env: params?.env,
            source: params?.source,
            payload: {
                credentials: {
                    publicKey: payload.credentials.publicKey,
                    secretKey: payload.credentials.secretKey,
                },
                data: {
                    baseCurrency: payload.data.baseCurrency,
                    quoteCurrency: payload.data.quoteCurrency,
                    direction: 'sell' as DirectionType,
                    quantity: closeqty,
                }
            }
        };    
        // console.log('paramsclose', paramsClose);
    
        response = await postPlaceMarketOrder (
            network,
            pkpAuthSig,
            paramsClose
        );
        // console.log('response', response);
    } else {
        response = 'Quantity to close is zero';
    }

    return response;

};

const placeManagedOrder = async (
    network: string,
    pkpAuthSig: any,
    params: {
        env: EnvType,
        source: FetcherSource,
        payload: {
            credentials: {
                publicKey: string,
                secretKey: string,
            },
            data: {
                baseCurrency: string,
                quoteCurrency: string
            }
        },
        trigger: any,
    }
) => {

    const ideaType = 'manual';
    const direction = 'buy' as DirectionType;
    console.log('pre calc trigger', params?.trigger);

    const calc = await OrderCalcPre(
        ideaType,
        network,
        pkpAuthSig,
        {
            env: params?.env,
            source: params?.source,
            payload: {
                credentials: {
                    publicKey: params.payload.credentials.publicKey,
                    secretKey: params.payload.credentials.secretKey,
                  },
                  asset: {
                    baseCurrency: params.payload.data.baseCurrency,
                    quoteCurrency: params.payload.data.quoteCurrency,
                  },         
                  base: params.payload.data.quoteCurrency,
            },
            trigger: params?.trigger,
        }
    );

    // console.log('calc?.account?', calc);
    const currencyCode = calc?.account?.currencyCode;

    console.log('this should be our final calc', calc);
    // console.log('this should be our final order', calc.order);

    // console.log('this should be our final order', calc.order.final);
    // console.log('this should be our final portfolio', calc.order.final.portfolio);
    // console.log('this should be our final price', calc.order.final.price);
    // console.log('this should be our final qty', calc.order.final.order.quantity.rounded);

    let response;
    if (calc.order.final.order.quantity.rounded === 0) {
        response = 'Order quantity was zero';
    } else {
        response = await postPlaceMarketOrder(
            network,
            pkpAuthSig,
            {
                env: params?.env,
                source: params?.source,
                payload: {
                    credentials: {
                        publicKey: params.payload.credentials.publicKey,
                        secretKey: params.payload.credentials.secretKey,
                    },
                    data: {
                        baseCurrency: params.payload.data.baseCurrency,
                        quoteCurrency: params.payload.data.quoteCurrency,
                        direction,
                        quantity: Number(calc.order.final.order.quantity.rounded),
                    }
                }
            }
        )     
        
        response.request = {
            ...response?.request,
            calc,
        }            
    }

    // const response = calc;
    console.log('response', response);

    return response;

};

const getTicker = (data: any) => {

    const ticker = {
      baseCurrency: '',
      quoteCurrency: '',
    }

    const ideaTicker = data?.idea?.asset.ticker;
    // console.log('asset', data?.idea?.asset);
    // get the GlobalBlock alt ticker
    const alternativetickers = data?.idea?.asset.alternativeProviderSymbols || [];
    // console.log('alternativetickers', alternativetickers);

    // if there is GB ticker, then we can use that
    const assetGB = alternativetickers.filter(res => res.provider === brokerName);
    if (assetGB.length > 0 && assetGB.indexOf("/") > 0) {
      // this will come in the form iof ETH/USDT

      const pair = assetGB[0];

      const pairSplit = pair.split('/');
      ticker.baseCurrency = pairSplit[0];
      ticker.quoteCurrency = pairSplit[1];
    } else {

      const pair = ideaTicker;
      console.log('pair', pair);
      const last3 = pair.slice(-3);
      const last4 = pair.slice(-4);

      // we're only handling USDT for now but we can add here if we need to
      if (last4 === 'USDT') {

        const str = 'USDT';
        const splitted = pair.split(str); 
        ticker.baseCurrency = splitted[0];
        ticker.quoteCurrency = str;
      
      } else if (last3 === 'GBP') {
        //
      }
    
    }

    console.log('final ticker', ticker);
    return ticker;
}


export {
    getPositions,
    getSingleAsset,
    postPlaceMarketOrder,
    closePosition,
    placeManagedOrder,
    getTicker,
};