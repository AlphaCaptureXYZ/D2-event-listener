import 'dotenv/config';

import { expect } from 'chai';

import { isNullOrUndefined } from '../../src/event-listener/helpers/helpers';

import { PkpCredentialNftModule } from '../../src/event-listener/modules/pkp-credential-nft.module';

describe('Lit Action Cases', () => {

    xit('Credential NFT smart contract request using PKP key to check the access', async () => {

        const result = await PkpCredentialNftModule.getCredentialNftEncrypted({
            chain: 'mumbai',
            credentialNftUUID: '0xef99bf0770a920e643f2c855038d4e33',
        });

        expect(isNullOrUndefined(result)).to.be.false;
        expect(result).to.be.an('object');
        expect(result.uuid.trim().length > 0).to.be.true;
        expect(result.tokenId > 0).to.be.true;
        expect(result.provider.trim().length > 0).to.be.true;
        expect(result.environment.trim().length > 0).to.be.true;
        expect(result.accountName.trim().length > 0).to.be.true;
        expect(result.pkpAddress.trim().length > 0).to.be.true;
        expect(result.encryptedCredential.encryptedFileB64.trim().length > 0).to.be.true;
        expect(result.encryptedCredential.encryptedSymmetricKeyString.trim().length > 0).to.be.true;

    }).timeout(50000);

    xit('Decrypt credentials using the Pkp with the pkpAuthSig"', async () => {

        const mock = {
            uuid: '0xef99bf0770a920e643f2c855038d4e33',
            tokenId: 1,
            provider: 'Binance',
            environment: 'demo',
            accountName: 'Binance Demo Credentials',
            encryptedCredential: {
                encryptedFileB64: 'KxNvJOKDvuunzxcfSFJfFzaKUerfNFIddPlIw8wFC7JH6M8SId1KVfHYUStNS65Xvc7br_Y6Yh8XETFGGQiCFq2xCOMHOxGdh2K2zSlMvPLWL7oemXA_LIH8bubF1Ez-p1tw59QsD6Kc7_eicSK9WYQ_et3Z2aa42kBrgvGv6kgxs4jgW7XJd5637DwqW2dB77CkgUFUQvm_PJUKf1jO5X__qnkDW95xOdcFd6CoT7g=',
                encryptedSymmetricKeyString: 'd5e5a8edbd0138ab23b963f871da526d95ace27fc606725c6b974dc20812e25817687626a8a5c63071f9aad18fdcc40660d0831a81e60fa45e26a4939c9772cc7742883facb17c6ef43de24239ff5f9079ce17c414a461358ddbd7a93a824aa99e1b532bcb475da380390930dcef1d641b1be6c9ac4aa94ce997a75ed4cccd380000000000000020918ffd63c945ae0d285bd3cb4b4f24070fdb353731ada6f73eaf786777723c42782f6cdf29b7af3f0827367755f8fc89'
            },
            pkpAddress: '0xDF0Fc359919D13D5fe1F3948106f491163Ce5AE2'
        };

        const result = await PkpCredentialNftModule.decryptCredentialNft<{
            apiKey: string;
            apiSecret: string;
        }>({
            chain: 'mumbai',
            credentialInfo: mock,
        });

        const binanceCredentials = {
            apiKey: result.decryptedCredential?.apiKey as string,
            apiSecret: result.decryptedCredential?.apiSecret as string,
        };

        console.log('result', result);

        expect(isNullOrUndefined(result)).to.be.false;
        expect(result).to.be.an('object');
        expect(result.uuid.trim().length > 0).to.be.true;
        expect(result.tokenId > 0).to.be.true;
        expect(result.provider.trim().length > 0).to.be.true;
        expect(result.environment.trim().length > 0).to.be.true;
        expect(result.accountName.trim().length > 0).to.be.true;
        expect(result.pkpAddress.trim().length > 0).to.be.true;
        expect(binanceCredentials.apiKey?.trim()?.length > 0).to.be.true;
        expect(binanceCredentials.apiSecret?.trim()?.length > 0).to.be.true;

    }).timeout(50000);

    it('Retrieve Full credential pkp access', async () => {

        const result = await PkpCredentialNftModule.getFullCredential<{
            apiKey: string;
            apiSecret: string;
        }>({
            chain: 'mumbai',
            credentialNftUUID: '0xef99bf0770a920e643f2c855038d4e33',
        });

        const binanceCredentials = {
            apiKey: result.decryptedCredential?.apiKey as string,
            apiSecret: result.decryptedCredential?.apiSecret as string,
        };

        console.log('result', result);

        expect(isNullOrUndefined(result)).to.be.false;
        expect(result).to.be.an('object');
        expect(result.uuid.trim().length > 0).to.be.true;
        expect(result.tokenId > 0).to.be.true;
        expect(result.provider.trim().length > 0).to.be.true;
        expect(result.environment.trim().length > 0).to.be.true;
        expect(result.accountName.trim().length > 0).to.be.true;
        expect(result.pkpAddress.trim().length > 0).to.be.true;
        expect(binanceCredentials.apiKey?.trim()?.length > 0).to.be.true;
        expect(binanceCredentials.apiSecret?.trim()?.length > 0).to.be.true;

    }).timeout(50000);

});
