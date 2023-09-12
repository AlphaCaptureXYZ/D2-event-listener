import 'dotenv/config';

import * as config from "../../config/config";

import { WeaveDBModule } from '../../modules/weavedb.module';
import { CompressorModule } from "../../modules/compressor.module";
import { LitModule } from '../../../event-listener/modules/lit.module';

import {
    EventEmitterModule as EventEmitter
} from '../../../event-listener/modules/event-emitter.module';

import { INewIdeaNFT } from '../../../event-listener/interfaces/new-idea-nft.i';

import { isNullOrUndefined, loop } from '../../../event-listener/helpers/helpers';
import { getBalance } from '../../../event-listener/utils/utils';

import * as litActions from '../lit-actions';

import { PkpAuthModule } from '../../../event-listener/modules/pkp-auth.module';
import { PkpCredentialNftModule } from '../../../event-listener/modules/pkp-credential-nft.module';
import { INotificationPayload } from '../../../event-listener/interfaces/notification.i';
import { ILitActionResult } from '../../../event-listener/interfaces/shared.i';

export const newIdeaNFTEvent = async (payload: INewIdeaNFT) => {
    let eventResult = [];

    try {

        const {
            blockNumber,
            network,
            data,
            nftId,
        } = await getIdeaNFTInfo(payload);

        const pkpAuthSig = await PkpAuthModule.getPkpAuthSig(
            network,
            config.PKP_KEY,
        );

        const triggers = await getTriggersByStrategy(
            network,
            pkpAuthSig,
            data?.strategy?.reference,
        );

        eventResult = await orderProcess({
            network,
            pkpAuthSig,
            triggers,
            data,
            nftId,
            blockNumber,
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
    }
) => {
    const {
        network,
        pkpAuthSig,
        triggers,
        data,
        nftId,
        blockNumber,
    } = payload;

    const pricingProvider = data?.pricing?.provider;

    const orderResults = await Promise.all(triggers?.map(async (triggerInfo: any) => {

        const credentialNftUUID = triggerInfo?.account?.reference;

        let result: ILitActionResult = null as any;

        try {
            const action = triggerInfo?.action;

            // settings to apply the calc order 
            const settings = triggerInfo?.settings || null;

            const credentialInfo =
                await PkpCredentialNftModule.getFullCredential<any>({
                    chain: network,
                    credentialNftUUID,
                    authSig: pkpAuthSig,
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
                    let litActionCode = null;
                    let listActionCodeParams = null;
                    let error = null;

                    switch (pricingProvider) {
                        case 'Binance':

                            // 12 USDT (temporal)
                            // so, the idea is get this usdt amount based on the balance of the user, etc (i.e. the order calc)
                            const usdtAmount = 12;

                            const litActionQtyCode = litActions.binance.getQtyWithSymbolPrecision(
                                environment as any,
                                asset,
                                usdtAmount,
                            );

                            const litActionCallQty = await LitModule().runLitAction({
                                chain: network,
                                litActionCode: litActionQtyCode,
                                listActionCodeParams: {},
                                nodes: 1,
                                showLogs: false,
                                authSig: pkpAuthSig,
                            });

                            const litActionCallQtyResponse = litActionCallQty?.response as any;

                            error = litActionCallQtyResponse?.error || null;
                            const quantity = litActionCallQtyResponse?.quantity || 0;

                            litActionCode = litActions.binance.placeOrder(environment as any);

                            const kind = data?.idea?.kind?.toUpperCase();

                            // this is SPOT and we can just buy or sell (this is not furture to use short orders, etc)
                            const directionByKind = {
                                'open': 'BUY',
                                'adjust': 'BUY',
                                'close': 'SELL',
                            };

                            const direction = directionByKind[kind?.toLowerCase()];

                            listActionCodeParams = {
                                credentials: credentialInfo.decryptedCredential,
                                form: {
                                    asset,
                                    direction,
                                    quantity,
                                },
                            };
                            break;
                    }

                    try {
                        const litActionCall = await LitModule().runLitAction({
                            chain: network,
                            litActionCode,
                            listActionCodeParams,
                            nodes: 1,
                            showLogs: false,
                            authSig: pkpAuthSig,
                        });

                        const litActionResult = litActionCall?.response as any;

                        result = {
                            additionalInfo: {
                                asset,
                                nftId,
                                credentialNftUUID,
                                userWalletAddress: credentialOwner,
                                environment,
                            },
                            request: litActionResult?.request || null,
                            response: litActionResult?.response || null,
                            error,
                        };

                    } catch (err) {
                        console.log('orderProcess (error)', credentialNftUUID, err?.message);
                    }
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

            const userWalletAddress = orderResult?.additionalInfo?.userWalletAddress;

            const credentialNftUUID = orderResult?.additionalInfo?.credentialNftUUID;
            const credentialOwner = orderResult?.additionalInfo?.userWalletAddress;

            const orderId = orderResult?.response?.orderId || null;
            const error = orderResult?.response?.error || null;

            const dataStored = await WeaveDBModule.addData<any>(
                network,
                {
                    jsonData: {
                        provider: pricingProvider,
                        result: orderResult,
                    },
                    pkpKey: config.PKP_KEY,
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
                },
            });

        }
    }

    return orderResults;
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

    if (!withAccess) {
        console.log('');
        console.log('=================================================================');
        console.log(`New idea NFT event received!`);
        console.log(`network: ${network}`);
        console.log(`blockNumber: ${blockNumber}`);
        console.log(`We can't decrypt the idea (access denied)`);
        console.log('=================================================================');
        console.log('');
    };

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
    };

    return info;
}

const getTriggersByStrategy = async (
    network: string,
    pkpAuthSig: any,
    strategyReference: string,
) => {
    const triggers =
        await WeaveDBModule.getAllData<any>(network, {
            type: 'trigger',
            isCompressed: false,
        }, pkpAuthSig);

    const triggersFiltered = triggers?.filter((item) => {
        return item?.strategy?.reference === strategyReference;
    });

    return triggersFiltered;
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