import { WeaveDBModule } from '../../modules/weavedb.module';
import { CredentialNFTModule } from "../../modules/credential-nft.module";

import { INewIdeaNFT } from 'src/event-listener/interfaces/new-idea-nft.i';

export const newIdeaNFTEvent = async (payload: INewIdeaNFT) => {

    const contract = payload?.contract;

    console.log('newIdeaNFTEvent (blockNumber)', payload.blockNumber);
    console.log('newIdeaNFTEvent (creatorAddress)', payload.creatorAddress);
    console.log('newIdeaNFTEvent (nftId)', payload.nftId);
    console.log('newIdeaNFTEvent (strategyReference)', payload.strategyReference);

    const metadataIdByBlockId = await contract.getMetadataIdByBlockId(
        payload.blockNumber,
    );

    const ipfsMetadataId = metadataIdByBlockId[2];

    if ([null, undefined, 'none'].includes(ipfsMetadataId)) {
        throw new Error('NFT MODULE ERROR: No metadata found for this block')
    };

    console.log('newIdeaNFTEvent (ipfsMetadataId)', ipfsMetadataId);

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

    try {


    } catch (err) { }
};