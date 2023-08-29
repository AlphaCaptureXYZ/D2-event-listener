
import { IWatcherPayload } from '../../shared/watcher-payload.i';

import { WeaveDBModule } from '../../../../modules/weavedb.module';
import { CredentialNFTModule } from "../../../../modules/credential-nft.module";

import { INewIdeaNFT } from 'src/event-listener/interfaces/new-idea-nft.i';

export const newIdeaNFT = async (request: IWatcherPayload<INewIdeaNFT>) => {

  const payload = request?.payload;

  console.log('newIdeaNFT (payload)', payload);

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