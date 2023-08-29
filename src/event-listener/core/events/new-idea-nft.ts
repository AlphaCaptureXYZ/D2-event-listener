import * as config from "../../config/config";

import { WeaveDBModule } from '../../modules/weavedb.module';
import { CredentialNFTModule } from "../../modules/credential-nft.module";
import { CompressorModule } from "../../modules/compressor.module";
import { LitModule } from '../../../event-listener/modules/lit.module';

import { INewIdeaNFT } from '../../../event-listener/interfaces/new-idea-nft.i';

import { loop } from '../../../event-listener/helpers/helpers';

export const newIdeaNFTEvent = async (payload: INewIdeaNFT) => {
    try {

        const contract = payload?.contract;
        const network = payload?.network;

        const blockNumber = payload?.blockNumber;
        const creatorAddress = payload?.creatorAddress;
        const strategyReference = payload?.strategyReference;

        let ipfsMetadataId: any = null;
        let withAccess = false;
        let info: any = null;

        let nftId = -1;

        console.log('');
        console.log('=================================================================');
        console.log(`New idea NFT event received!`);
        console.log(`network: ${network}`);
        console.log(`blockNumber: ${blockNumber}`);
        console.log(`creatorAddress: ${creatorAddress}`);
        console.log(`strategyReference: ${strategyReference}`);
        console.log('Getting the encrypted info, please wait...');
        console.log('=================================================================');
        console.log('');

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

                        LitModule().setChain(network);

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
            console.log(`New idea NFT decrypted!`);
            console.log(`network: ${network}`);
            console.log(`nftId: ${nftId}`);
            console.log(`blockNumber: ${blockNumber}`);
            console.log(`We can't decrypt the idea (access denied)`);
            console.log('=================================================================');
            console.log('');
        };

        if (withAccess) {
            console.log('');
            console.log('=================================================================');
            console.log(`New idea NFT decrypted!`);
            console.log(`network: ${network}`);
            console.log(`nftId: ${nftId}`);
            console.log(`blockNumber: ${blockNumber}`);
            console.log(`Provider: ${info?.data?.pricing?.provider}`);
            console.log(`Ticker: ${info?.data?.idea?.asset?.ticker}`);
            console.log(`Kind: ${info?.data?.idea?.kind}`);
            console.log(`Price: $${info?.data?.idea?.priceInfo?.price?.globalPrice}`);
            console.log(`Creator: ${info?.data?.creator?.name} (${info?.data?.creator?.walletAddress})`);
            console.log(`Company: ${info?.data?.creator?.company}`);
            console.log(`Strategy: ${info?.data?.strategy?.name} (${info?.data?.strategy?.reference})`);
            console.log('=================================================================');
            console.log('');
        };

        // console.log('');
        // console.log('newIdeaNFTEvent (info)', info);
        // console.log('newIdeaNFTEvent (nftId)', nftId);
        // console.log('newIdeaNFTEvent (blockNumber)', blockNumber);
        // console.log('newIdeaNFTEvent (ipfsMetadataId)', ipfsMetadataId);
        // console.log('newIdeaNFTEvent (withAccess)', withAccess);
        // console.log('');

        // WeaveDBModule.getAllData<any>(network, { type: 'trigger' })
        //     .then((data) => {
        //         console.log('WeaveDBModule.getAllData (data)', data);
        //     }).catch(err => {
        //         console.log('WeaveDBModule.getAllData (err)', err);
        //     });

        // CredentialNFTModule.setConfig({
        //     rpcUrl,
        //     chain: network,
        // });

        // CredentialNFTModule.getCredentialByUUID('0x05c29570830f0fff8b7958f16b2398eb')
        //     .then((credential) => {
        //         console.log('CredentialNFTModule.getCredentialByUUID (credential)', credential);
        //     }).catch(err => {
        //         console.log('CredentialNFTModule.getCredentialByUUID (err)', err);
        //     });

    } catch (err) {
        console.log('newIdeaNFTEvent (error 3)', err?.message);
    }
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