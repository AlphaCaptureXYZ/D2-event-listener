import 'dotenv/config';

import * as config from "../../config/config";

import { WeaveDBModule } from '../../modules/weavedb.module';
import { CompressorModule } from "../../modules/compressor.module";
import { LitModule } from '../../../event-listener/modules/lit.module';

import {
    EventEmitterModule as EventEmitter
} from '../../../event-listener/modules/event-emitter.module';

import { INewIdeaNFT } from '../../../event-listener/interfaces/new-idea-nft.i';

import { isNullOrUndefined, loop, retryFunctionHelper } from '../../../event-listener/helpers/helpers';

import { getBalance, wsLogger } from '../../../event-listener/utils/utils';

import * as fetcher from '../fetcher';

import {
    PkpAuthModule
} from '../../../event-listener/modules/pkp-auth.module';

import {
    PkpCredentialNftModule
} from '../../../event-listener/modules/pkp-credential-nft.module';

import {
    ILitActionResult,
    IPkpInfo
} from '../../../event-listener/interfaces/shared.i';

import {
    INotification,
    INotificationEventPayload,
    INotificationPayload
} from '../../../event-listener/interfaces/notification.i';

export const newIdeaNFTEvent = async (payload: INewIdeaNFT) => {
    let eventResult = [];

    try {

        const {
            blockNumber,
            network,
            data,
            nftId,
        } = await getIdeaNFTInfoWithRetry(payload);

        const pkpInfo = await config.getPKPInfo(network);

        const pkpKey = pkpInfo?.pkpPublicKey;

        const pkpAuthSig = await PkpAuthModule.getPkpAuthSig(
            network,
            pkpKey,
        );

        const triggers = await getTriggersByStrategy(
            network,
            pkpAuthSig,
            data?.strategy?.reference,
            pkpInfo,
        );

        eventResult = await orderProcess({
            network,
            pkpAuthSig,
            triggers,
            data,
            nftId,
            blockNumber,
            pkpInfo,
        });

    } catch (err) {
        console.log('newIdeaNFTEvent (error 3)', err?.message);
    }

    return eventResult;
};

const orderProcess = async (
    payload: {
        network: string,
        pkpAuthSig: any,
        triggers: any[],
        data: any,
        nftId: number,
        blockNumber: number,
        pkpInfo: IPkpInfo,
    }
) => {
    const {
        network,
        pkpAuthSig,
        triggers,
        data,
        nftId,
        blockNumber,
        pkpInfo,
    } = payload;

    let pricingProvider = data?.pricing?.provider;

    let credentials = await Promise.all(triggers?.map(async (triggerInfo: any) => {
        try {

            const credentialNftUUID = triggerInfo?.account?.reference;

            const credentialInfo =
                await PkpCredentialNftModule.getFullCredential<any>({
                    chain: network,
                    credentialNftUUID,
                    authSig: pkpAuthSig,
                    pkpKey: pkpInfo.pkpPublicKey,
                });

            triggerInfo.credentialInfo = credentialInfo;

        } catch (err) { }

        return triggerInfo;
    }));

    credentials = credentials?.filter((credential) => {
        pricingProvider = pricingProvider === 'IG Group' ? 'IG' : pricingProvider;
        return credential?.credentialInfo?.provider === pricingProvider;
    });

    const orderResults = await Promise.all(credentials?.map(async (triggerInfo: any) => {

        const credentialNftUUID = triggerInfo?.account?.reference;

        let result: ILitActionResult = null as any;

        let orderId: any = null;

        try {
            const action = triggerInfo?.action;

            const credentialInfo = triggerInfo?.credentialInfo;

            const credentialOwner = credentialInfo?.owner;

            // const balanceInfo = await getBalance({
            //     network,
            //     walletAddress: credentialOwner,
            // });

            const asset = data?.idea?.asset?.ticker;

            const environment = credentialInfo.environment;

            if (action === 'copy-trade') {

                let error = null;
                let litActionResult = null;

                const kind = data?.idea?.kind?.toUpperCase();

                switch (pricingProvider) {
                    case 'Binance':

                        const settings = triggerInfo?.settings || null;

                        const userSetting = await getUserSettings(
                            network,
                            credentialOwner,
                            pkpInfo,
                        );

                        const proxyUrl =
                            userSetting?.proxy_url ||
                            'https://ixily.io/api/proxy';

                        const portfolioAccount =
                            await fetcher.binance.getPortfolioAccount(
                                network,
                                pkpAuthSig,
                                {
                                    proxyUrl,
                                    env: environment as any,
                                    source: 'fetch',
                                    payload: {
                                        credentials: credentialInfo.decryptedCredential,
                                        defaultBaseCurrency: 'USDT',
                                    }
                                },
                            );

                        const userTotalBalance = portfolioAccount?.baseCurrencyTotal || 0;

                        const orderSize = settings?.orderSize || 0;

                        const usdtAmount = userTotalBalance * (orderSize / 100);

                        const qtyWithSymbolPrecisionResult =
                            await fetcher.binance.getQtyWithSymbolPrecision(
                                network,
                                pkpAuthSig,
                                {
                                    env: environment as any,
                                    source: 'fetch',
                                    symbol: asset,
                                    usdtAmount,
                                    proxyUrl,
                                }
                            );

                        error = qtyWithSymbolPrecisionResult?.error || null;
                        const quantity = qtyWithSymbolPrecisionResult?.quantity || 0;

                        // this is SPOT and we can just buy or sell (this is not furture to use short orders, etc)
                        const directionByKind = {
                            'open': 'BUY',
                            'adjust': 'BUY',
                            'close': 'SELL',
                        };

                        const direction = directionByKind[kind?.toLowerCase()];

                        if (isNullOrUndefined(error)) {
                            litActionResult =
                                await fetcher.binance.placeOrder(
                                    network,
                                    pkpAuthSig,
                                    {
                                        env: environment as any,
                                        source: 'fetch',
                                        proxyUrl,
                                        payload: {
                                            credentials: credentialInfo.decryptedCredential,
                                            form: {
                                                asset,
                                                direction,
                                                quantity,
                                            },
                                        }
                                    }
                                );

                            orderId =
                                litActionResult?.response?.orderId || null;
                        }
                        break;

                    case 'IG':
                    case 'IG Group':

                        const igDirectionByKind = {
                            'open': 'Buy',
                            // 'adjust': 'Buy',
                            'close': 'Sell',
                        };

                        const igDirection = igDirectionByKind[kind?.toLowerCase()];

                        // hard  coding here means that we 
                        const igExpiry = '';

                        // these are our order settings
                        const triggerSettings = triggerInfo;

                        if (isNullOrUndefined(error)) {

                            const igAuth = await fetcher.ig.authentication(network, pkpAuthSig, {
                                env: environment as any,
                                source: 'fetch',
                                credentials: {
                                    accountId: 
                                        credentialInfo.decryptedCredential?.accountId,
                                    apiKey:
                                        credentialInfo.decryptedCredential?.apiKey,
                                    username:
                                        credentialInfo.decryptedCredential?.username,
                                    password:
                                        credentialInfo.decryptedCredential?.password,
                                },
                            });

                            if (igDirection === 'Buy') {
                                litActionResult =
                                    await fetcher.ig.placeManagedOrder(
                                        network,
                                        pkpAuthSig,
                                        {
                                            env: environment as any,
                                            source: 'fetch',
                                            payload: {
                                                auth: {
                                                    apiKey:
                                                        igAuth?.apiKey,
                                                    clientSessionToken:
                                                        igAuth?.clientSessionToken,
                                                    activeAccountSessionToken:
                                                        igAuth?.activeAccountSessionToken,
                                                    accountId:
                                                        igAuth?.accountId,
                                                },
                                                form: {
                                                    direction: igDirection,
                                                    epic: asset,
                                                    expiry: igExpiry,
                                                },
                                            },
                                            trigger: triggerSettings
                                        },
                                    );

                                orderId =
                                    litActionResult?.response?.dealId || null;
                            }

                            if (igDirection === 'Sell') {

                                // add to an array even though it is only one here
                                const epics = [];
                                epics.push(asset);

                                const testing = false;

                                litActionResult =
                                    await fetcher.ig.closePosition(
                                        network,
                                        pkpAuthSig,
                                        testing,
                                        {
                                            env: environment as any,
                                            source: 'fetch',
                                            payload: {
                                                auth: {
                                                    apiKey:
                                                        igAuth?.apiKey,
                                                    clientSessionToken:
                                                        igAuth?.clientSessionToken,
                                                    activeAccountSessionToken:
                                                        igAuth?.activeAccountSessionToken,
                                                    accountId:
                                                        igAuth?.accountId,
                                                },
                                                form: {
                                                    epics,
                                                },
                                            }
                                        }
                                    );

                                orderId =
                                    litActionResult?.response?.find(res => res)?.dealId || null;
                            }

                            error =
                                litActionResult?.response?.dealStatus === 'REJECTED' || null;
                        }
                        break;
                }

                result = {
                    additionalInfo: {
                        asset,
                        nftId,
                        blockNumber,
                        credentialNftUUID,
                        userWalletAddress: credentialOwner,
                        environment,
                        orderId,

                    },
                    request: litActionResult?.request || null,
                    response: litActionResult?.response || null,
                    error: error || litActionResult?.response?.error || null,
                };

            }

        } catch (err) {
            console.log('newIdeaNFTEvent (error (listener logic))', {
                credentialNftUUID,
                err: err?.message,
            });
        }

        return result;
    }));

    // save the order results (1 by 1 - weaveDB is not working with Promise.all)
    for (const orderResult of orderResults) {
        if (orderResult) {

            const ticker = orderResult?.additionalInfo?.asset;
            const userWalletAddress = orderResult?.additionalInfo?.userWalletAddress;
            const credentialNftUUID = orderResult?.additionalInfo?.credentialNftUUID;
            const credentialOwner = orderResult?.additionalInfo?.userWalletAddress;
            const environment = orderResult?.additionalInfo?.environment;

            const error = orderResult?.error || orderResult?.response?.error || null;

            const orderId = orderResult?.additionalInfo?.orderId || null;

            const dataStored = await WeaveDBModule.addData<any>(
                network,
                {
                    jsonData: {
                        provider: pricingProvider,
                        result: orderResult,
                    },
                    pkpKey: pkpInfo.pkpPublicKey,
                    type: 'order',
                    userWallet: userWalletAddress,
                    isCompressed: true,
                    additionalInfo: {
                        accountReference: credentialNftUUID,
                        strategyReference: data?.strategy?.reference,
                    },
                },
                pkpAuthSig,
            );

            const docID = dataStored?.docID;

            console.log('==================================================');
            console.log('Order stored (weaver id):', docID);
            console.log('Order stored (order id):', orderId);
            console.log('User wallet address:', userWalletAddress);
            console.log('Credential NFT UUID:', credentialNftUUID);
            console.log('Asset:', ticker);
            console.log('==================================================');

            if (isNullOrUndefined(docID) || isNullOrUndefined(orderId)) {
                wsLogger({
                    type: 'error',
                    message: `Order stored error [${JSON.stringify(error) || 'unknown'}] | (BlockNumber: ${blockNumber}, NftId: ${nftId}, Ticker: ${ticker}, UserWallet: ${userWalletAddress}, CredentialNFTUUID: ${credentialNftUUID}, Env: ${environment})`,
                    data: {
                        docID,
                        orderId,
                        userWalletAddress,
                        credentialNftUUID,
                        orderResult,
                    }
                });
            }

            if (!isNullOrUndefined(docID) && !isNullOrUndefined(orderId)) {
                wsLogger({
                    type: 'success',
                    message: `Order stored success (OrderID: ${orderId}, WeaverID: ${docID}, NftId: ${nftId}, Ticker: ${ticker}, UserWallet: ${userWalletAddress}, CredentialNFTUUID: ${credentialNftUUID}, Env: ${environment})`,
                    data: {
                        docID,
                        orderId,
                        userWalletAddress,
                        credentialNftUUID,
                        orderResult,
                    }
                });
            }

            EventEmitter().emit<INotification<INotificationPayload>>('NOTIFICATION', {
                type: 'NEW_ORDER',
                info: {
                    credentialNftUUID,
                    credentialOwner,
                    nftId: nftId.toString(),
                    blockNumber,
                    data,
                    orderId,
                    docID,
                    error,
                    environment,
                    pkpInfo,
                },
            });

        }
    }

    return orderResults;
}

const getIdeaNFTInfoWithRetry = async (
    payload: INewIdeaNFT
) => {
    return retryFunctionHelper({
        maxRetries: 3,
        retryCallback: async () => {

            const data = await getIdeaNFTInfo(payload);

            // if we can't decrypt the idea (access denied) we will retry
            // there are 2 cases: 
            // 1. we haven't access to decrypt the idea then is expected
            // 2. we have access but the decrypt process failed then we need to retry
            if (!data?.withAccess) {
                throw new Error('We can\'t decrypt the idea (access denied)');
            }

            return data;
        },
        rejectOnMaxRetries: false,
    });
}

const getIdeaNFTInfo = async (
    payload: INewIdeaNFT
) => {

    const {
        network,
        blockNumber,
        contract,
    } = payload;

    let ipfsMetadataId: any = null;
    let withAccess = false;
    let nftId = -1;

    let info: {
        blockNumber: number,
        nftId: number,
        data: any,
        cid: string,
        ipfsUrl: string,
        withAccess: boolean,
        network: string,
    } = null;

    await loop(
        async () => {
            const nftIdeaUrl = `https://ipfs.io/ipfs/${ipfsMetadataId}`;

            const nftIdeaString = await getJsonContent(
                nftIdeaUrl,
            );

            const nftObject = JSON.parse(nftIdeaString);

            withAccess = nftObject?.idea?.kind === 'close' ? true : false;

            try {
                if (
                    nftObject.access?.encryption?.key !== undefined &&
                    nftObject.idea !== '' &&
                    typeof nftObject.idea === 'string'
                ) {

                    const encryptedData = nftObject.idea;
                    const encryptedSymmetricKey = nftObject.access.encryption.key;

                    const contractRecipe = config.getContractRecipe(network);

                    const acConditions = [
                        {
                            contractAddress: contractRecipe.coreContractAddress,
                            standardContractType: 'ERC1155',
                            method: 'balanceOf',
                            parameters: [':userAddress', nftId.toString()],
                            returnValueTest: {
                                comparator: '>',
                                value: '0',
                            },
                            chain: network,
                        },
                    ];

                    const restoredStringIdea =
                        await LitModule().decryptString(
                            encryptedData,
                            encryptedSymmetricKey,
                            acConditions,
                        );

                    const restoredIdea = JSON.parse(restoredStringIdea);

                    nftObject.idea = restoredIdea;
                    withAccess = true;

                }
                // in this point we can't decrypt the idea (access denied)
            } catch (err) {
                console.log('newIdeaNFTEvent (error 1)', err?.message);
            }

            info = {
                blockNumber,
                nftId,
                data: nftObject,
                cid: ipfsMetadataId,
                ipfsUrl: nftIdeaUrl,
                withAccess,
                network,
            };

        },
        async () => {
            let isPassed = false

            const metadataIdByBlockId = await contract.getMetadataIdByBlockId(
                payload.blockNumber,
            );

            nftId = metadataIdByBlockId[1]?.toNumber();
            ipfsMetadataId = metadataIdByBlockId[2];

            if ([null, undefined, 'none'].includes(ipfsMetadataId)) {
                throw new Error('NFT MODULE ERROR: No metadata found for this block')
            };

            if (ipfsMetadataId) {
                isPassed = true
            }

            return isPassed
        },
        {
            loopTimeInMs: 10000,
            limitTimeSecond: 240,
        },
        async (err: any) => {
            console.log('newIdeaNFTEvent (error 2)', err?.message);
        },
    );

    if (withAccess) {
        console.log('');
        console.log('=================================================================');
        console.log(`New idea NFT event received!`);
        console.log(`network: ${network}`);
        console.log(`nftId: ${nftId}`);
        console.log(`blockNumber: ${blockNumber}`);
        console.log(`Provider: ${info?.data?.pricing?.provider}`);
        console.log(`Ticker: ${info?.data?.idea?.asset?.ticker}`);
        console.log(`Kind: ${info?.data?.idea?.kind}`);
        console.log(`Direction: ${info?.data?.idea?.trade?.direction}`);
        console.log(`Price: $${info?.data?.idea?.priceInfo?.price?.globalPrice}`);
        console.log(`Creator: ${info?.data?.creator?.name} (${info?.data?.creator?.walletAddress})`);
        console.log(`Company: ${info?.data?.creator?.company}`);
        console.log(`Strategy: ${info?.data?.strategy?.name} (${info?.data?.strategy?.reference})`);
        console.log('=================================================================');
        console.log('');

        EventEmitter().emit<INotification<INotificationEventPayload>>('NOTIFICATION', {
            type: 'NEW_IDEA_NFT',
            info: {
                network,
                nftId: nftId.toString(),
                blockNumber,
                provider: info?.data?.pricing?.provider,
                ticker: info?.data?.idea?.asset?.ticker,
                kind: info?.data?.idea?.kind,
                direction: info?.data?.idea?.trade?.direction,
                price: info?.data?.idea?.priceInfo?.price?.globalPrice,
                creator: {
                    name: info?.data?.creator?.name,
                    walletAddress: info?.data?.creator?.walletAddress,
                },
                company: info?.data?.creator?.company,
                strategy: {
                    reference: info?.data?.strategy?.reference,
                    name: info?.data?.strategy?.name,
                },
            },
        });

        wsLogger({
            type: 'info',
            message: `New idea NFT event received! (nftID: ${nftId}, BlockNumber: ${blockNumber}, Ticker: ${info?.data?.idea?.asset?.ticker}, Direction: ${info?.data?.idea?.trade?.direction}, Kind: ${info?.data?.idea?.kind}, Provider: ${info?.data?.pricing?.provider}, Strategy: ${info?.data?.strategy?.name} (${info?.data?.strategy?.reference}))`,
            data: {
                network,
                nftId,
                blockNumber,
                provider: info?.data?.pricing?.provider,
                ticker: info?.data?.idea?.asset?.ticker,
                kind: info?.data?.idea?.kind,
                direction: info?.data?.idea?.trade?.direction,
                price: info?.data?.idea?.priceInfo?.price?.globalPrice,
                creator: {
                    name: info?.data?.creator?.name,
                    walletAddress: info?.data?.creator?.walletAddress,
                },
                company: info?.data?.creator?.company,
                strategy: {
                    reference: info?.data?.strategy?.reference,
                    name: info?.data?.strategy?.name,
                },
            }
        });
    };

    return info;
}

const getTriggersByStrategy = async (
    network: string,
    pkpAuthSig: any,
    strategyReference: string,
    pkpInfo: IPkpInfo,
) => {
    let triggers =
        await WeaveDBModule.getAllData<any>(network, {
            type: 'trigger',
        }, pkpAuthSig);

    const pkpWalletAddress = pkpInfo?.pkpWalletAddress;

    // triggers linked to the pkp
    triggers = triggers?.filter((trigger) => {
        const check = trigger?.pkpWalletAddress?.toLowerCase() === pkpWalletAddress?.toLowerCase();
        return check;
    });

    // triggers linked to the strategy
    triggers = triggers?.filter((item) => {
        return item?.strategy?.reference === strategyReference;
    });

    return triggers;
}

const getUserSettings = async (
    network: string,
    userWalletAddress: string,
    pkpInfo: IPkpInfo,
) => {
    let response = null;
    try {
        let userSetting = await WeaveDBModule.getAllData<any>(
            network,
            {
                type: 'setting',
                byUserWalletFilter: true,
                wallet: userWalletAddress,
            }
        );

        const pkpWalletAddress = pkpInfo?.pkpWalletAddress;

        // triggers linked to the pkp
        userSetting = userSetting?.filter((trigger) => {
            const check = trigger?.pkpWalletAddress?.toLowerCase() === pkpWalletAddress?.toLowerCase();
            return check;
        });

        response = userSetting?.find(res => res) || null;

    } catch (err) {
        console.log('getUserSettings (error)', err?.message);
        console.log('getUserSettings... using default settings');
    }

    return response;
}

const getJsonContent = async (
    url: string,
): Promise<string> => {

    const decompressDataStr = async <T>(dt: T): Promise<T> => {
        if (typeof dt !== 'string') return dt;
        return CompressorModule.decompressData(dt) as T;
    }

    let result: any = null;

    result = await fetch(url);

    if (result?.status === 200) {
        const jsonContent = await result.text();
        result = jsonContent;
    } else {
        await loop(
            async () => {
                const jsonContent = await result.text();
                result = jsonContent;
            },
            async () => {
                let isPassed = false;

                try {
                    result = await fetch(url);

                    if (result.status === 200) {
                        isPassed = true;
                    }
                } catch (e: any) {
                    isPassed = false;
                }

                return decompressDataStr(isPassed);
            },
            {
                loopTimeInMs: 10000,
                limitTimeSecond: 240,
            },
            async (err: any) => {
                // console.log('getJsonContent (error)', err?.message);
            },
        );

    }

    return decompressDataStr(result);
}