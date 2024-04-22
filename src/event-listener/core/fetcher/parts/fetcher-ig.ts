import 'isomorphic-fetch';

import { FetcherSource, EnvType } from "../../../../event-listener/interfaces/shared.i";
import { LitModule } from "../../../modules/lit.module";


import { OrderCalcPre } from './calculation-ig';

const igUrlSelector = {
    demo: 'https://demo-api.ig.com',
    prod: 'https://api.ig.com',
};

const brokerName = 'IG Group';

const getApiUrl = (env: EnvType) => {
    return igUrlSelector[env] || igUrlSelector['demo'];
};

const authentication = async (
    network: string,
    pkpAuthSig: any,
    params: {
        credentials: {
            accountId: string,
            username: string,
            password: string,
            apiKey: string,
        },
        env: EnvType,
        source: FetcherSource,
    }
) => {
    const {
        credentials,
        env,
        source,
    } = params;

    const requestUrl = getApiUrl(env);

    let response = null as any;
    let selectedAccountId = '';

    if (source === 'fetch') {
        const url = `${requestUrl}/gateway/deal/session?fetchSessionTokens=true`;

        const options: any = {
            method: 'POST',
            body: JSON.stringify({
                identifier: credentials.username,
                password: credentials.password,
            }),
            headers: {
                'Version': '2',
                'X-IG-API-KEY': credentials.apiKey,
                'User-Agent': 'PostmanRuntime/7.29.2',
                'Accept': 'application/json; charset=UTF-8',
                'Content-Type': 'application/json; charset=UTF-8',
            },
            redirect: 'follow',
            mode: 'cors',
        };

        let error = null;

        try {
            response = await fetch(url, options);
            const data = await response.json();
            selectedAccountId = data.currentAccountId || '';
        } catch (err) {
            error = err?.error || err?.message;
        }

        const clientSessionToken = response.headers.get('cst');
        const activeAccountSessionToken = response.headers.get('x-security-token');

        // if the account id returned is different to our expected account, then we have to switch it
        if (credentials.accountId !== selectedAccountId) {

            const url = `${requestUrl}/gateway/deal/session`;

            const options: any = {
                method: 'PUT',
                body: JSON.stringify({
                    accountId: credentials.accountId,
                }),
                headers: {
                    'Version': '1',
                    'CST': clientSessionToken,
                    'X-IG-API-KEY': credentials.apiKey,
                    'X-SECURITY-TOKEN': activeAccountSessionToken,
                    'User-Agent': 'PostmanRuntime/7.29.2',
                    'Accept': 'application/json; charset=UTF-8',
                    'Content-Type': 'application/json; charset=UTF-8',
                },
                redirect: 'follow',
                mode: 'cors',
            };
    
            let error = null;
    
            try {
                response = await fetch(url, options);
                const data = await response.json();
                // console.log('IG switch account confirmation', data);
            } catch (err) {
                error = err?.error || err?.message;
            }            
        }

        response = {
            apiKey: credentials.apiKey,
            clientSessionToken,
            activeAccountSessionToken,
            error,
        };
    }

    if (source === 'lit-action') {
        const code = `
            const go = async () => {

                const username = credentials.username;
                const apiKey = credentials.apiKey;
                const password = credentials.password;

                const url = '${requestUrl}/gateway/deal/session?fetchSessionTokens=true';

                const options = {
                    method: 'POST',
                    body: JSON.stringify({
                        identifier: username,
                        password: password,
                    }),
                    headers: {
                        'Version': '2',
                        'X-IG-API-KEY': apiKey,
                        'User-Agent': 'PostmanRuntime/7.29.2',
                        'Accept': 'application/json; charset=UTF-8',
                        'Content-Type': 'application/json; charset=UTF-8',
                    },
                    redirect: 'follow',
                    mode: 'cors',
                };

                let response = null;
                let error = null;

                try {
                    response = await fetch(url, options);
                    const data = await response.json();
                    selectedAccountId = data.currentAccountId || '';        
                } catch (err) {
                    error = err?.error || err?.message;
                }

                const clientSessionToken = response.headers.get('cst');
                const activeAccountSessionToken = response.headers.get('x-security-token');

                if (credentials.accountId !== selectedAccountId) {
        
                    const url = '${requestUrl}/gateway/deal/session';
        
                    const options: any = {
                        method: 'PUT',
                        body: JSON.stringify({
                            accountId: credentials.accountId,
                        }),
                        headers: {
                            'Version': '1',
                            'CST': clientSessionToken,
                            'X-IG-API-KEY': credentials.apiKey,
                            'X-SECURITY-TOKEN': activeAccountSessionToken,
                            'User-Agent': 'PostmanRuntime/7.29.2',
                            'Accept': 'application/json; charset=UTF-8',
                            'Content-Type': 'application/json; charset=UTF-8',
                        },
                        redirect: 'follow',
                        mode: 'cors',
                    };
            
                    let error = null;
            
                    try {
                        response = await fetch(url, options);
                        // const data = await response.json();
                        // console.log('IG switch account confirmation', data);
                    } catch (err) {
                        error = err?.error || err?.message;
                    }            
                }

                Lit.Actions.setResponse({response: JSON.stringify({
                    apiKey,
                    clientSessionToken,
                    activeAccountSessionToken,
                    error,
                })});

            };

            go();
    `;

        const litActionCall = await LitModule().runLitAction({
            chain: network,
            litActionCode: code,
            listActionCodeParams: {
                credentials,
            },
            nodes: 1,
            showLogs: false,
            authSig: pkpAuthSig,
        });

        response = litActionCall?.response as any;
    }

    return response;
};

const placeOrder = async (
    network: string,
    pkpAuthSig: any,
    params: {
        env: EnvType,
        source: FetcherSource,
        payload: {
            auth: {
                apiKey: string,
                clientSessionToken: string
                activeAccountSessionToken: string,
            },
            form: {
                epic: string,
                direction: string,
                expiry: string,
                quantity: number,
                currencyCode: string,
            },
        }
    }
) => {

    const {
        env,
        source,
        payload,
    } = params;

    const requestUrl = getApiUrl(env);

    let response = null as any;

    const apiKey =
        payload?.auth?.apiKey;

    const clientSessionToken =
        payload?.auth?.clientSessionToken;

    const activeAccountSessionToken =
        payload?.auth?.activeAccountSessionToken;

    if (source === 'fetch') {

        const url = `${requestUrl}/gateway/deal/positions/otc`;

        const dealReferenceGenerator = () =>
            Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);

        const body = {
            currencyCode: payload.form.currencyCode,
            dealReference: dealReferenceGenerator(),
            direction: payload.form.direction.toUpperCase(),
            epic: payload.form.epic,
            expiry: payload.form.expiry,
            orderType: 'MARKET',
            size: payload.form.quantity,
            guaranteedStop: false,
            forceOpen: true,
        };
        // console.log('body submitted to IG', body);

        let globalResponse = null;

        // only make the post IF the size > 0
        if (Number(payload.form.quantity) > 0) {

            const options: any = {
                method: 'POST',
                body: JSON.stringify(body),
                headers: {
                    'Version': '2',
                    'CST': clientSessionToken,
                    'X-IG-API-KEY': apiKey,
                    'X-SECURITY-TOKEN': activeAccountSessionToken,
                    'User-Agent': 'PostmanRuntime/7.29.2',
                    'Accept': 'application/json; charset=UTF-8',
                    'Content-Type': 'application/json; charset=UTF-8',
                },
                redirect: 'follow',
                mode: 'cors',
            };

            response = await fetch(url, options);
            const data = await response.json();

            const dealReference = data?.dealReference || null;

            if (dealReference) {
                const orderDetailsReq = await fetch(
                    `${requestUrl}/gateway/deal/confirms/` + dealReference,
                    {
                        method: 'GET',
                        headers: {
                            'Version': '1',
                            'CST': clientSessionToken,
                            'X-IG-API-KEY': apiKey,
                            'X-SECURITY-TOKEN': activeAccountSessionToken,
                            'User-Agent': 'PostmanRuntime/7.29.2',
                            'Accept': 'application/json; charset=UTF-8',
                            'Content-Type': 'application/json; charset=UTF-8',
                        },
                        redirect: 'follow',
                        mode: 'cors',
                    }
                );

                const orderDetails = await orderDetailsReq.json();
                globalResponse = orderDetails;
            } else {
                globalResponse = data;
            }
        } else {
            globalResponse = {
                error: 'Order quanity was zero so no request was made to IG Group',
            }
        }

        response = {
            response: globalResponse,
            request: body,
        };

    }

    if (source === 'lit-action') {

        const body = {
            currencyCode: payload.form.currencyCode,
            direction: payload.form.direction.toUpperCase(),
            epic: payload.form.epic,
            expiry: payload.form.expiry,
            orderType: 'MARKET',
            size: payload.form.quantity,
            guaranteedStop: false,
            forceOpen: true,
        };
        // console.log('lit-action body', body);

        // only make the post IF the size > 0
        if (Number(payload.form.quantity) > 0) {

            // console.log('currencyCode', payload.form.currencyCode);
            // console.log('dealReference', dealReferenceGenerator());
            // console.log('direction', payload.form.direction.toUpperCase());
            // console.log('epic', payload.form.epic);
            // console.log('expiry', payload.form.expiry);
            // console.log('size:', payload.form.quantity);

            const code = `
                const go = async () => {

                    const url = '${requestUrl}/gateway/deal/positions/otc';

                    const dealReferenceGenerator = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

                    const body = {
                        currencyCode: form.currencyCode,
                        dealReference: dealReferenceGenerator(),
                        direction: form.direction.toUpperCase(),
                        epic: form.epic,
                        expiry: form.expiry,
                        orderType: 'MARKET',
                        size: form.quantity,
                        guaranteedStop: false,
                        forceOpen: true,
                    };

                    const options = {
                        method: 'POST',
                        body: JSON.stringify(body),
                        headers: {
                            'Version': '2',
                            'CST': auth.clientSessionToken,
                            'X-IG-API-KEY': auth.apiKey,
                            'X-SECURITY-TOKEN': auth.activeAccountSessionToken,
                            'User-Agent': 'PostmanRuntime/7.29.2',
                            'Accept': 'application/json; charset=UTF-8',
                            'Content-Type': 'application/json; charset=UTF-8',
                        },
                        redirect: 'follow',
                        mode: 'cors',
                    };

                    const response = await fetch(url, options);
                    const data = await response.json();

                    const dealReference = data?.dealReference || null;

                    let globalResponse = null;

                    if(dealReference){
                        const orderDetailsReq = await fetch(
                            '${requestUrl}/gateway/deal/confirms/' + dealReference,
                            {
                                method: 'GET',
                                headers: {
                                    'Version': '1',
                                    'CST': auth.clientSessionToken,
                                    'X-IG-API-KEY': auth.apiKey,
                                    'X-SECURITY-TOKEN': auth.activeAccountSessionToken,
                                    'User-Agent': 'PostmanRuntime/7.29.2',
                                    'Accept': 'application/json; charset=UTF-8',
                                    'Content-Type': 'application/json; charset=UTF-8',
                                },
                                redirect: 'follow',
                                mode: 'cors',
                            }
                        );
            
                        const orderDetails = await orderDetailsReq.json();
                        globalResponse = orderDetails;
                    } else {
                        globalResponse = data;
                    }

                    Lit.Actions.setResponse({response: JSON.stringify({
                        response: globalResponse,
                        request: body,
                    })});

                };

                go();
            `;
            // console.log('code submitted to Lit Action', code);
            // console.log('auth submitted to Lit Action', apiKey);
            // console.log('auth submitted to Lit Action', clientSessionToken);
            // console.log('auth submitted to Lit Action', activeAccountSessionToken);

            const litActionCall = await LitModule().runLitAction({
                chain: network,
                litActionCode: code,
                listActionCodeParams: {
                    ...params?.payload,
                    auth: {
                        apiKey,
                        clientSessionToken,
                        activeAccountSessionToken,
                    },
                },
                nodes: 1,
                showLogs: false,
                authSig: pkpAuthSig,
            });

            // console.log('track 1', litActionCall)

            response = litActionCall?.response as any;

        } else {

            const globalResponse = {
                error: 'Order quanity was zero so no request was made to IG Group',
            }

            response = {
                response: globalResponse,
                request: body,
            };
    
        }
        
    }

    return response;

};

const placeBasicOrder = async (
    network: string,
    pkpAuthSig: any,
    params: {
        env: EnvType,
        source: FetcherSource,
        payload: {
            auth: {
                accountId: string,
                apiKey: string,
                clientSessionToken: string
                activeAccountSessionToken: string,
            },
            form: {
                epic: string,
                direction: string,
                expiry: string,
                quantity: number,
            },
        }
        trigger: any,
    }
) => {

    const ideaType = 'manual';

    const calc = await OrderCalcPre(
        ideaType,
        network,
        pkpAuthSig,
        {
            env: params?.env,
            source: params?.source,
            payload: {
                auth: {
                    accountId: params?.payload?.auth?.accountId,
                    apiKey: params?.payload?.auth?.apiKey,
                    clientSessionToken: params?.payload?.auth?.clientSessionToken,
                    activeAccountSessionToken: params?.payload?.auth?.activeAccountSessionToken,
                },
                direction: params?.payload?.form?.direction as any,
                epic: params?.payload?.form?.epic,
            },
            trigger: params?.trigger
        }
    );

    const currencyCode = calc?.account?.currencyCode;

    const response = await placeOrder(
        network,
        pkpAuthSig,
        {
            env: params?.env,
            source: params?.source,
            payload: {
                auth: {
                    activeAccountSessionToken: params?.payload?.auth?.activeAccountSessionToken,
                    apiKey: params?.payload?.auth?.apiKey,
                    clientSessionToken: params?.payload?.auth?.clientSessionToken,
                },
                form: {
                    epic: params?.payload?.form?.epic,
                    direction: params?.payload?.form?.direction,
                    expiry: params?.payload?.form?.expiry,
                    quantity: params?.payload?.form?.quantity,
                    currencyCode,
                }
            }
        }
    )

    response.request = {
        ...response?.request,
        calc,
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
            auth: {
                accountId: string,
                apiKey: string,
                clientSessionToken: string
                activeAccountSessionToken: string,
            },
            form: {
                epic: string,
                direction: string,
                expiry: string,
            },
        },
        trigger: any,
    }
) => {

    const ideaType = 'manual';

    const calc = await OrderCalcPre(
        ideaType,
        network,
        pkpAuthSig,
        {
            env: params?.env,
            source: params?.source,
            payload: {
                auth: {
                    accountId: params?.payload?.auth?.accountId,
                    apiKey: params?.payload?.auth?.apiKey,
                    clientSessionToken: params?.payload?.auth?.clientSessionToken,
                    activeAccountSessionToken: params?.payload?.auth?.activeAccountSessionToken,
                },
                direction: params?.payload?.form?.direction as any,
                epic: params?.payload?.form?.epic,
            },
            trigger: params?.trigger,
        }
    );

    // console.log('calc?.account?', calc.account);
    const currencyCode = calc?.account?.currencyCode;

    // console.log('this should be our final calc', calc);

    // console.log('this should be our final order', calc.order.final.order);
    // console.log('this should be our final portfolio', calc.order.final.portfolio);
    // console.log('this should be our final price', calc.order.final.price);

    // console.log('epic: params?.payload?.form?.epic', params?.payload?.form?.epic);
    // console.log('direction: params?.payload?.form?.direction', params?.payload?.form?.direction);
    // console.log('expiry: params?.payload?.form?.expiry', params?.payload?.form?.expiry);
    // console.log('quantity: calc?.order?.final?.order?.quantity?.rounded', calc?.order?.final?.order?.quantity?.rounded);
    // console.log('currencyCode', currencyCode);

    // console.log('activeAccountSessionToken', params?.payload?.auth?.activeAccountSessionToken);
    // console.log('apiKey', params?.payload?.auth?.apiKey);
    // console.log('clientSessionToken', params?.payload?.auth?.clientSessionToken);

    // console.log('env:', params?.env);
    // console.log('source:', params?.source);

    // we use the asset expiry data from the orderPre calc as it saves calling twice
    // was is passed in, is just blank for the moment
    const expiry = params?.payload?.form?.expiry || calc.asset.expiry || 'DFB';

    const response = await placeOrder(
        network,
        pkpAuthSig,
        {
            env: params?.env,
            source: params?.source,
            payload: {
                auth: {
                    activeAccountSessionToken: params?.payload?.auth?.activeAccountSessionToken,
                    apiKey: params?.payload?.auth?.apiKey,
                    clientSessionToken: params?.payload?.auth?.clientSessionToken,
                },
                form: {
                    epic: params?.payload?.form?.epic,
                    direction: params?.payload?.form?.direction,
                    expiry,
                    quantity: calc?.order?.final?.order?.quantity?.rounded,
                    currencyCode: currencyCode,
                }
            }
        }
    )

    response.request = {
        ...response?.request,
        calc,
    }
    // const response = calc;

    return response;

};

const closePosition = async (
    network: string,
    pkpAuthSig: any,
    testing: boolean,
    params: {
        env: EnvType,
        source: FetcherSource,
        payload: {
            auth: {
                accountId: string,
                apiKey: string,
                clientSessionToken: string
                activeAccountSessionToken: string,
            },
            form: {
                epics: string[],
            },
        }
    }
) => {

    const {
        env,
        source,
        payload,
    } = params;

    const positions = await getPositions(
        network,
        pkpAuthSig,
        {
            env: params?.env,
            source: params?.source,
            payload: {
                auth: {
                    apiKey: params?.payload?.auth?.apiKey,
                    clientSessionToken: params?.payload?.auth?.clientSessionToken,
                    activeAccountSessionToken: params?.payload?.auth?.activeAccountSessionToken,
                },
            }
        }
    );

    const epics = params?.payload?.form?.epics;
    const responses = []; 

    for (const i in epics) {
        if (i) {

            const epic = epics[i];

            const positionsByEpic = positions?.filter((res: any) => {
                return res?.market?.epic === epic;
            });
            
            const dealIdsWithSize: Array<{
                dealId: string,
                size: number,
                direction: string,
            }> = positionsByEpic?.map((res: any) => {
                const response = {
                    dealId: res?.position?.dealId,
                    size: res?.position?.dealSize,
                    direction: res?.position?.direction === 'BUY' ? 'SELL' : 'BUY',
                };
                return response;
            });
        
            const closePositionProcess = async (dealId: string, size: number, direction: string) => {
                let response = null as any;
                let error = null as any;
        
                try {
        
                    const requestUrl = getApiUrl(env);
        
                    const apiKey =
                        payload?.auth?.apiKey;
        
                    const clientSessionToken =
                        payload?.auth?.clientSessionToken;
        
                    const activeAccountSessionToken =
                        payload?.auth?.activeAccountSessionToken;

                    if (source === 'testing') {
                        
                    } else if (source === 'fetch') {
        
                        const url = `${requestUrl}/gateway/deal/positions/otc`;
        
                        const body = {
                            dealId,
                            direction,
                            orderType: 'MARKET',
                            size: size.toString(),
                        }
        
                        const options: any = {
                            method: 'POST',
                            body: JSON.stringify(body),
                            headers: {
                                'Version': '1',
                                'CST': clientSessionToken,
                                'X-IG-API-KEY': apiKey,
                                'X-SECURITY-TOKEN': activeAccountSessionToken,
                                'User-Agent': 'PostmanRuntime/7.29.2',
                                'Accept': 'application/json; charset=UTF-8',
                                'Content-Type': 'application/json; charset=UTF-8',
                                '_method': 'DELETE',
                            },
                            redirect: 'follow',
                            mode: 'cors',
                        };
        
                        error = {
                            url,
                            body,
                            options,
                        }
        
                        response = await fetch(url, options);
                        const data = await response.json();
        
                        const dealReference = data?.dealReference || null;
        
                        let globalResponse = null;
        
                        if (dealReference) {
                            const orderDetailsReq = await fetch(
                                `${requestUrl}/gateway/deal/confirms/` + dealReference,
                                {
                                    method: 'GET',
                                    headers: {
                                        'Version': '1',
                                        'CST': clientSessionToken,
                                        'X-IG-API-KEY': apiKey,
                                        'X-SECURITY-TOKEN': activeAccountSessionToken,
                                        'User-Agent': 'PostmanRuntime/7.29.2',
                                        'Accept': 'application/json; charset=UTF-8',
                                        'Content-Type': 'application/json; charset=UTF-8',
                                    },
                                    redirect: 'follow',
                                    mode: 'cors',
                                }
                            );
        
                            const orderDetails = await orderDetailsReq.json();
        
                            globalResponse = orderDetails;
                        } else {
                            globalResponse = data;
                        }
        
                        response = {
                            response: globalResponse,
                            request: body,
                        };
        
                    } else if (source === 'lit-action') {
        
                        const code = `
                            const go = async () => {
                
                                const url = '${requestUrl}/gateway/deal/positions/otc';
                
                                const body = {
                                    dealId: '${dealId}',
                                    direction: '${direction}',
                                    orderType: 'MARKET',
                                    size: '${size.toString()}',
                                };
                
                                const options = {
                                    method: 'POST',
                                    body: JSON.stringify(body),
                                    headers: {
                                        'Version': '1',
                                        'CST': auth.clientSessionToken,
                                        'X-IG-API-KEY': auth.apiKey,
                                        'X-SECURITY-TOKEN': auth.activeAccountSessionToken,
                                        'User-Agent': 'PostmanRuntime/7.29.2',
                                        'Accept': 'application/json; charset=UTF-8',
                                        'Content-Type': 'application/json; charset=UTF-8',
                                        '_method': 'DELETE',
                                    },
                                    redirect: 'follow',
                                    mode: 'cors',
                                };
                
                                const response = await fetch(url, options);
                                const data = await response.json();
                
                                const dealReference = data?.dealReference || null;
                
                                let globalResponse = null;
                
                                if(dealReference){
                                    const orderDetailsReq = await fetch(
                                        '${requestUrl}/gateway/deal/confirms/' + dealReference,
                                        {
                                            method: 'GET',
                                            headers: {
                                                'Version': '1',
                                                'CST': auth.clientSessionToken,
                                                'X-IG-API-KEY': auth.apiKey,
                                                'X-SECURITY-TOKEN': auth.activeAccountSessionToken,
                                                'User-Agent': 'PostmanRuntime/7.29.2',
                                                'Accept': 'application/json; charset=UTF-8',
                                                'Content-Type': 'application/json; charset=UTF-8',
                                            },
                                            redirect: 'follow',
                                            mode: 'cors',
                                        }
                                    );
                        
                                    const orderDetails = await orderDetailsReq.json();
                                    globalResponse = orderDetails;
        
                                } else {
                                    globalResponse = data;
                                }
                
                                Lit.Actions.setResponse({response: JSON.stringify({
                                    response: globalResponse,
                                    request: body,
                                })});
                
                            };
                
                            go();
                        `;
        
                        const litActionCall = await LitModule().runLitAction({
                            chain: network,
                            litActionCode: code,
                            listActionCodeParams: {
                                ...params?.payload,
                                auth: {
                                    apiKey,
                                    clientSessionToken,
                                    activeAccountSessionToken,
                                },
                            },
                            nodes: 1,
                            showLogs: false,
                            authSig: pkpAuthSig,
                        });
        
                        response = litActionCall?.response as any;

                    }
        
                } catch (err: any) {
                    error = {
                        ...error,
                        message: err?.message,
                    }
                    console.log('closePositionProcess ERR', error)
                }            
            
            }

            const data = await Promise.all(dealIdsWithSize?.map(async ({ dealId, size, direction }) => {
                const response = await closePositionProcess(dealId, size, direction);
                return response;
            }));
        
            const response = {
                request: data.map((res: any) => res?.request),
                response: data.map((res: any) => res?.response),
            }
            // add to the collective response
            responses.push(response);

        }
    }

    return responses;

};

const getPositions = async (
    network: string,
    pkpAuthSig: any,
    params: {
        env: EnvType,
        source: FetcherSource,
        payload: {
            auth: {
                apiKey: string,
                clientSessionToken: string
                activeAccountSessionToken: string,
            },
        }
    }
) => {

    const {
        env,
        source,
        payload,
    } = params;

    const requestUrl = getApiUrl(env);

    let response = null as any;

    const apiKey =
        payload?.auth?.apiKey;

    const clientSessionToken =
        payload?.auth?.clientSessionToken;

    const activeAccountSessionToken =
        payload?.auth?.activeAccountSessionToken;

    if (source === 'fetch') {

        const url = `${requestUrl}/gateway/deal/positions`;

        const options: any = {
            method: 'GET',
            headers: {
                'Version': '1',
                'CST': clientSessionToken,
                'X-IG-API-KEY': apiKey,
                'X-SECURITY-TOKEN': activeAccountSessionToken,
                'User-Agent': 'PostmanRuntime/7.29.2',
                'Accept': 'application/json; charset=UTF-8',
                'Content-Type': 'application/json; charset=UTF-8',
            },
            redirect: 'follow',
            mode: 'cors',
        };

        response = await fetch(url, options);
        const data = await response.json();

        response = data?.positions || [];

    }

    if (source === 'lit-action') {

        const code = `
            const go = async () => {

                const url = '${requestUrl}/gateway/deal/positions';

                const options = {
                    method: 'GET',
                    headers: {
                        'Version': '1',
                        'CST': auth.clientSessionToken,
                        'X-IG-API-KEY': auth.apiKey,
                        'X-SECURITY-TOKEN': auth.activeAccountSessionToken,
                        'User-Agent': 'PostmanRuntime/7.29.2',
                        'Accept': 'application/json; charset=UTF-8',
                        'Content-Type': 'application/json; charset=UTF-8',
                    },
                    redirect: 'follow',
                    mode: 'cors',
                };

                const response = await fetch(url, options);
                const data = await response.json();
    
                const info = data?.positions || [];
    
                Lit.Actions.setResponse({response: JSON.stringify(info)});

            };

            go();
        `;

        const litActionCall = await LitModule().runLitAction({
            chain: network,
            litActionCode: code,
            listActionCodeParams: {
                ...params?.payload,
                auth: {
                    apiKey,
                    clientSessionToken,
                    activeAccountSessionToken,
                },
            },
            nodes: 1,
            showLogs: false,
            authSig: pkpAuthSig,
        });

        response = litActionCall?.response as any;
    }

    return response;

};

const getAccounts = async (
    network: string,
    pkpAuthSig: any,
    params: {
        env: EnvType,
        source: FetcherSource,
        payload: {
            auth: {
                apiKey: string,
                clientSessionToken: string
                activeAccountSessionToken: string,
            },
        }
    }
) => {

    const {
        env,
        source,
        payload,
    } = params;

    const requestUrl = getApiUrl(env);

    let response = null as any;

    const apiKey =
        payload?.auth?.apiKey;

    const clientSessionToken =
        payload?.auth?.clientSessionToken;

    const activeAccountSessionToken =
        payload?.auth?.activeAccountSessionToken;

    if (source === 'fetch') {

        const url = `${requestUrl}/gateway/deal/accounts`;

        const options: any = {
            method: 'GET',
            headers: {
                'Version': '1',
                'CST': clientSessionToken,
                'X-IG-API-KEY': apiKey,
                'X-SECURITY-TOKEN': activeAccountSessionToken,
                'User-Agent': 'PostmanRuntime/7.29.2',
                'Accept': 'application/json; charset=UTF-8',
                'Content-Type': 'application/json; charset=UTF-8',
            },
            redirect: 'follow',
            mode: 'cors',
        };

        response = await fetch(url, options);
        const data = await response.json();

        response = data?.accounts || [];

    }

    if (source === 'lit-action') {

        const code = `
            const go = async () => {

                const url = '${requestUrl}/gateway/deal/accounts';

                const options = {
                    method: 'GET',
                    headers: {
                        'Version': '1',
                        'CST': auth.clientSessionToken,
                        'X-IG-API-KEY': auth.apiKey,
                        'X-SECURITY-TOKEN': auth.activeAccountSessionToken,
                        'User-Agent': 'PostmanRuntime/7.29.2',
                        'Accept': 'application/json; charset=UTF-8',
                        'Content-Type': 'application/json; charset=UTF-8',
                    },
                    redirect: 'follow',
                    mode: 'cors',
                };

                const response = await fetch(url, options);
                const data = await response.json();
    
                const info = data?.accounts || [];
    
                Lit.Actions.setResponse({response: JSON.stringify(info)});

            };

            go();
        `;

        const litActionCall = await LitModule().runLitAction({
            chain: network,
            litActionCode: code,
            listActionCodeParams: {
                ...params?.payload,
                auth: {
                    apiKey,
                    clientSessionToken,
                    activeAccountSessionToken,
                },
            },
            nodes: 1,
            showLogs: false,
            authSig: pkpAuthSig,
        });

        response = litActionCall?.response as any;
    }

    return response;

};

const getMarketInfoByEpic = async (
    network: string,
    pkpAuthSig: any,
    params: {
        env: EnvType,
        source: FetcherSource,
        payload: {
            epic: string,
            auth: {
                apiKey: string,
                clientSessionToken: string
                activeAccountSessionToken: string,
            },
        }
    }
) => {

    let {
        env,
        source,
        payload,
    } = params;

    const requestUrl = getApiUrl(env);

    let response = null as any;

    const epic =
        payload?.epic;

    const apiKey =
        payload?.auth?.apiKey;

    const clientSessionToken =
        payload?.auth?.clientSessionToken;

    const activeAccountSessionToken =
        payload?.auth?.activeAccountSessionToken;

    // console.log('IG source', source);
    source = 'fetch';
    if (source === 'fetch') {

        const url = `${requestUrl}/gateway/deal/markets/${epic}`;
        // console.log('url', url);
        // console.log('CST', clientSessionToken);
        // console.log('X-SECURITY-TOKEN', activeAccountSessionToken);

        const options: any = {
            method: 'GET',
            headers: {
                'Version': '3',
                'CST': clientSessionToken,
                'X-IG-API-KEY': apiKey,
                'X-SECURITY-TOKEN': activeAccountSessionToken,
                'User-Agent': 'PostmanRuntime/7.29.2',
                'Accept': 'application/json; charset=UTF-8',
                'Content-Type': 'application/json; charset=UTF-8',
            },
            redirect: 'follow',
            mode: 'cors',
        };

        response = await fetch(url, options);
        const data = await response.json();

        response = data || null;

    }

    else if (source === 'lit-action') {

        const code = `
            const go = async () => {

                const url = '${requestUrl}/gateway/deal/markets/${epic}';

                const options = {
                    method: 'GET',
                    headers: {
                        'Version': '3',
                        'CST': auth.clientSessionToken,
                        'X-IG-API-KEY': auth.apiKey,
                        'X-SECURITY-TOKEN': auth.activeAccountSessionToken,
                        'User-Agent': 'PostmanRuntime/7.29.2',
                        'Accept': 'application/json; charset=UTF-8',
                        'Content-Type': 'application/json; charset=UTF-8',
                    },
                    redirect: 'follow',
                    mode: 'cors',
                };

                const response = await fetch(url, options);
                const data = await response.json();
    
                const info = data || null;

                Lit.Actions.setResponse({response: JSON.stringify(info)});

            };

            go();
        `;

        const litActionCall = await LitModule().runLitAction({
            chain: network,
            litActionCode: code,
            listActionCodeParams: {
                ...params?.payload,
                auth: {
                    apiKey,
                    clientSessionToken,
                    activeAccountSessionToken,
                },
            },
            nodes: 1,
            showLogs: false,
            authSig: pkpAuthSig,
        });

        response = litActionCall?.response as any;
    }

    return response;

};

const getTicker = (data: any) => {

    const ideaTicker = data?.idea?.asset.ticker;
    // console.log('asset', data?.idea?.asset);

    // default this for now
    let epic = ideaTicker;

    // get the GlobalBlock alt ticker
    const alternativetickers = data?.idea?.asset.alternativeProviderSymbols || [];
    // console.log('alternativetickers', alternativetickers);

    // if there is GB ticker, then we can use that
    const assetIG = alternativetickers.filter(res => res.provider === brokerName);
    if (assetIG.length > 0) {
      epic = assetIG[0];    
    }

    return epic;
}

export {
    authentication,
    placeBasicOrder,
    placeManagedOrder,
    closePosition,
    getPositions,
    getAccounts,
    getMarketInfoByEpic,
    getTicker,
}