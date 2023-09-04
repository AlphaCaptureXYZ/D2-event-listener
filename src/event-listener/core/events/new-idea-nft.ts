import 'dotenv/config';

import * as config from "../../config/config";

import { WeaveDBModule } from '../../modules/weavedb.module';
import { CompressorModule } from "../../modules/compressor.module";
import { LitModule } from '../../../event-listener/modules/lit.module';

import { INewIdeaNFT } from '../../../event-listener/interfaces/new-idea-nft.i';

import { getBalance, loop } from '../../../event-listener/helpers/helpers';

import * as litActions from '../lit-actions';

import { PkpCredentialNftModule } from '../../../event-listener/modules/pkp-credential-nft.module';

import { NotificatorModule } from '../../modules/notificator.module';

// NOTE: all this code will be refactored and split into functions, etc
// as a first test we will use the code as it is (without refactoring, same file, etc)
// once is working we will refactor it

export const newIdeaNFTEvent = async (payload: INewIdeaNFT) => {
    let eventResult = [];

    try {

        const contract = payload?.contract;
        const network = payload?.network;

        const blockNumber = payload?.blockNumber;

        let ipfsMetadataId: any = null;
        let withAccess = false;
        let info: any = null;

        let nftId = -1;

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

        const pkpAuthSig = await PkpCredentialNftModule.getPkpAuthSig(
            network,
            config.PKP_KEY,
        );

        const triggers =
            await WeaveDBModule.getAllData<any>(network, { type: 'trigger' }, pkpAuthSig);

        const triggersFiltered = triggers?.filter((item) => {
            return item?.strategy?.reference === info?.data?.strategy?.reference;
        });

        eventResult = await Promise.all(triggersFiltered?.map(async (triggerInfo: any) => {

            const credentialNftUUID = triggerInfo?.account?.reference;

            let response = null;

            try {
                const action = triggerInfo?.action;
                const settings = triggerInfo?.settings || null;

                const credentialInfo =
                    await PkpCredentialNftModule.getFullCredential<any>({
                        chain: network,
                        credentialNftUUID,
                        authSig: pkpAuthSig,
                    });

                const credentialOwner = credentialInfo?.owner;

                const balanceInfo = await getBalance({
                    network,
                    walletAddress: credentialOwner,
                });

                console.log('balanceInfo', balanceInfo);

                const environment = credentialInfo.environment;

                if (action === 'copy-trade') {

                    const temporalCheck =
                        info?.data?.pricing?.provider === 'Binance' &&
                        info?.data?.idea?.asset?.ticker === 'BTCUSDT';

                    if (temporalCheck) {
                        let litActionCode = null;
                        let listActionCodeParams = null;

                        switch (info?.data?.pricing?.provider) {
                            case 'Binance':
                                litActionCode = litActions.binance.placeOrder(environment as any);

                                const sideSelector = {
                                    'LONG': 'BUY',
                                    'SHORT': 'SELL',
                                };

                                const direction =
                                    sideSelector[info?.data?.idea?.trade?.direction.toUpperCase()];

                                listActionCodeParams = {
                                    credentials: credentialInfo.decryptedCredential,
                                    form: {
                                        asset: info?.data?.idea?.asset?.ticker,
                                        direction,
                                        quantity: 0.00044, // 12 USDT
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
                            });

                            response = litActionCall?.response as any;

                            const orderId = response?.orderId || null;

                            if (orderId) {
                                console.log(`Order placed successfully. OrderID: ${orderId}`);

                                // just to test (will be removed)
                                await NotificatorModule.sendNotification({
                                    url: process.env.SLACK_WEBHOOK_URL,
                                    payload: {
                                        username: 'D2 Event Listener (Order)',
                                        text: `A new order has been placed. Check the details to know more about it.`,
                                        icon_emoji: ':page_with_curl:',
                                        attachments: [
                                            {
                                                color: '#71BFF0',
                                                fields: [
                                                    {
                                                        title: 'Context',
                                                        value: 'D2 Event Listener (Order)',
                                                        short: false,
                                                    },
                                                    {
                                                        title: 'Pkp Key',
                                                        value: config.PKP_KEY,
                                                        short: false
                                                    },
                                                    {
                                                        title: 'Credential UUID',
                                                        value: credentialNftUUID,
                                                        short: false
                                                    },
                                                    {
                                                        title: 'Idea NFT',
                                                        value: nftId,
                                                        short: false,
                                                    },
                                                    {
                                                        title: 'BlockNumber',
                                                        value: blockNumber,
                                                        short: false,
                                                    },
                                                    {
                                                        title: 'Strategy',
                                                        value: `${info?.data?.strategy?.name} (${info?.data?.strategy?.reference})`,
                                                        short: false
                                                    },
                                                    {
                                                        title: 'Creator',
                                                        value: `${info?.data?.creator?.name} (${info?.data?.creator?.walletAddress})`,
                                                        short: false
                                                    },
                                                    {
                                                        title: 'Company',
                                                        value: info?.data?.creator?.company,
                                                        short: false,
                                                    },
                                                    {
                                                        title: 'Ticker',
                                                        value: info?.data?.idea?.asset?.ticker,
                                                        short: false
                                                    },
                                                    {
                                                        title: 'Direction',
                                                        value: info?.data?.idea?.trade?.direction || 'none',
                                                        short: false,
                                                    },
                                                    {
                                                        title: 'Kind',
                                                        value: info?.data?.idea?.kind,
                                                        short: false,
                                                    },
                                                    {
                                                        title: 'Provider',
                                                        value: info?.data?.pricing?.provider,
                                                        short: false,
                                                    },
                                                    {
                                                        title: 'OrderID',
                                                        value: orderId,
                                                        short: false,
                                                    }
                                                ],
                                                actions: []
                                            }
                                        ],
                                    }
                                })

                            } else {
                                console.log('binancePlaceOrder (response)', response);
                            }

                        } catch (err) { }
                    }

                }

            } catch (err) {
                console.log('newIdeaNFTEvent (error (listener logic))', {
                    credentialNftUUID,
                    err: err?.message,
                });
            }

            return response;
        }));

    } catch (err) {
        console.log('newIdeaNFTEvent (error 3)', err?.message);
    }

    return eventResult;
};

const getJsonContent = async (
    url: string,
): Promise<string> => {

    const inflateStr = async <T>(dt: T): Promise<T> => {
        if (typeof dt !== 'string') return dt;
        return CompressorModule.inflate(dt) as T;
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

                return inflateStr(isPassed);
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

    return inflateStr(result);
}