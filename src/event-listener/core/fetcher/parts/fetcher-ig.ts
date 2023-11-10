import 'isomorphic-fetch';

import { FetcherSource, EnvType } from "../../../../event-listener/interfaces/shared.i";
import { LitModule } from "../../../modules/lit.module";

const igUrlSelector = {
    demo: 'https://demo-api.ig.com',
    prod: 'https://api.ig.com',
};

const getApiUrl = (env: EnvType) => {
    return igUrlSelector[env] || igUrlSelector['demo'];
};

const authentication = async (
    network: string,
    pkpAuthSig: any,
    params: {
        credentials: {
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
        } catch (err) {
            error = err?.error || err?.message;
        }

        const clientSessionToken = response.headers.get('cst');
        const activeAccountSessionToken = response.headers.get('x-security-token');

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
                } catch (err) {
                    error = err?.error || err?.message;
                }

                const clientSessionToken = response.headers.get('cst');
                const activeAccountSessionToken = response.headers.get('x-security-token');

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
                epic,
                direction,
                quantity,
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
            currencyCode: 'USD',
            dealReference: dealReferenceGenerator(),
            direction: payload.form.direction.toUpperCase(),
            epic: payload.form.epic,
            expiry: 'DFB',
            orderType: 'MARKET',
            size: payload.form.quantity,
            guaranteedStop: false,
            forceOpen: true,
        };

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

    }

    if (source === 'lit-action') {

        const code = `
            const go = async () => {

                const url = '${requestUrl}/gateway/deal/positions/otc';

                const dealReferenceGenerator = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

                const body = {
                    currencyCode: 'USD',
                    dealReference: dealReferenceGenerator(),
                    direction: form.direction.toUpperCase(),
                    epic: form.epic,
                    expiry: 'DFB',
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

const placeBasicOrder = async (
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
                epic,
                direction,
                quantity,
            },
        }
    }
) => {

    const response = await placeOrder(
        network,
        pkpAuthSig,
        params
    )

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
                apiKey: string,
                clientSessionToken: string
                activeAccountSessionToken: string,
            },
            form: {
                epic,
                direction,
                quantity,
            },
        }
    }
) => {

    const response = await placeOrder(
        network,
        pkpAuthSig,
        params
    )

    return response;

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

    const {
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

    if (source === 'fetch') {

        const url = `${requestUrl}/gateway/deal/markets/${epic}`;

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

        response = data || null;

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

export {
    authentication,
    placeBasicOrder,
    placeManagedOrder,
    getPositions,
    getAccounts,
    getMarketInfoByEpic,
}