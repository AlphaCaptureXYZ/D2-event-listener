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

import { PkpAuthModule } from '../../../event-listener/modules/pkp-auth.module';
import { PkpCredentialNftModule } from '../../../event-listener/modules/pkp-credential-nft.module';
import { INotificationPayload } from '../../../event-listener/interfaces/notification.i';
import { ILitActionResult, IPkpInfo } from '../../../event-listener/interfaces/shared.i';

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

    const pricingProvider = data?.pricing?.provider;

    const orderResults = await Promise.all(triggers?.map(async (triggerInfo: any) => {

        const credentialNftUUID = triggerInfo?.account?.reference;

        let result: ILitActionResult = null as any;

        try {
            const action = triggerInfo?.action;

            const credentialInfo =
                await PkpCredentialNftModule.getFullCredential<any>({
                    chain: network,
                    credentialNftUUID,
                    authSig: pkpAuthSig,
                    pkpKey: pkpInfo.pkpPublicKey,
                });

            const credentialOwner = credentialInfo?.owner;

            // const balanceInfo = await getBalance({
            //     network,
            //     walletAddress: credentialOwner,
            // });

            const asset = data?.idea?.asset?.ticker;

            const environment = credentialInfo.environment;

            if (action === 'copy-trade') {

                const temporalCheck = pricingProvider === 'Binance';

                if (temporalCheck) {
                    let error = null;
                    let litActionResult = null;

                    switch (pricingProvider) {
                        case 'Binance':

                            // 10 USDT (temporal)
                            // so, the idea is get this usdt amount based on the balance of the user, etc (i.e. the order calc)
                            // settings to apply the calc order 
                            const settings = triggerInfo?.settings || null;

                            const usdtAmount = 11;

                            const userSetting = await WeaveDBModule.getAllData<any>(
                                network,
                                {
                                    type: 'setting',
                                    byUserWalletFilter: true,
                                    wallet: credentialOwner,
                                }
                            );

                            const proxyUrl =
                                userSetting?.find(res => res)?.proxy_url ||
                                'https://ixily.io/api/proxy';

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

                            const kind = data?.idea?.kind?.toUpperCase();

                            // this is SPOT and we can just buy or sell (this is not furture to use short orders, etc)
                            const directionByKind = {
                                'open': 'BUY',
                                'adjust': 'BUY',
                                'close': 'SELL',
                            };

                            const direction = directionByKind[kind?.toLowerCase()];

                            console.log('orderProcess (direction)', direction);

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
                        },
                        request: litActionResult?.request || null,
                        response: litActionResult?.response || null,
                        error: error || litActionResult?.response?.error || null,
                    };

                }

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

            const orderId = orderResult?.response?.orderId || null;
            const error = orderResult?.error || orderResult?.response?.error || null;

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
                },
                pkpAuthSig,
            );

            const docID = dataStored?.docID;

            console.log('==================================================');
            console.log('Order stored (weaver id):', docID);
            console.log('Order stored (order id):', orderId);
            console.log('User wallet address:', userWalletAddress);
            console.log('Credential NFT UUID:', credentialNftUUID);
            console.log('Asset:', orderResult?.additionalInfo?.asset);
            console.log('==================================================');

            if (isNullOrUndefined(docID) || isNullOrUndefined(orderId)) {
                wsLogger({
                    type: 'error',
                    message: `Order stored error (${JSON.stringify(error) || 'unknown'})})`,
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

            EventEmitter().emit<INotificationPayload>('NOTIFICATION', {
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

                    const acConditions = [
                        {
                            contractAddress: config.IDEA_NFT_CONFIG.coreContractAddress,
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
                console.log('getJsonContent (error)', err?.message);
            },
        );

    }

    return decompressDataStr(result);
}