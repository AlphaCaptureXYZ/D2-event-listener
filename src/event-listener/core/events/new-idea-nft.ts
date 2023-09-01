import * as config from "../../config/config";

import { WeaveDBModule } from '../../modules/weavedb.module';
import { CredentialNFTModule } from "../../modules/credential-nft.module";
import { CompressorModule } from "../../modules/compressor.module";
import { LitModule } from '../../../event-listener/modules/lit.module';

import { INewIdeaNFT } from '../../../event-listener/interfaces/new-idea-nft.i';

import { loop } from '../../../event-listener/helpers/helpers';

import * as litActions from '../lit-actions';

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

        const triggers =
            await WeaveDBModule.getAllData<any>(network, { type: 'trigger' });

        const triggersFiltered = triggers?.filter((item) => {
            return item?.strategy?.reference === info?.data?.strategy?.reference;
        });

        CredentialNFTModule.setConfig({
            rpcUrl: payload.rpcUrl,
            chain: network,
        });

        eventResult = await Promise.all(triggersFiltered?.map(async (triggerInfo: any) => {

            const credentialNftUUID = triggerInfo?.account?.reference;
            let response = null;

            try {
                const action = triggerInfo?.action;
                const settings = triggerInfo?.settings || null;

                const credentialInfo =
                    await CredentialNFTModule.getCredentialByUUID<any>(credentialNftUUID);

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
                                    credentials: credentialInfo.credential,
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