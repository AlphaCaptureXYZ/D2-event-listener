import 'dotenv/config';

import { expect } from 'chai';

import { isNullOrUndefined } from '../../src/event-listener/helpers/helpers';

import { PkpCredentialNftModule } from '../../src/event-listener/modules/pkp-credential-nft.module';

describe('Lit Action Cases', () => {

    xit('Credential NFT smart contract request using PKP key to check the access', async () => {

        const result = await PkpCredentialNftModule.getCredentialNftEncrypted({
            chain: 'mumbai',
            credentialNftUUID: '0x4008fed076a278396f848c110d3b4a96',
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

    it('Retrieve Full credential pkp access', async () => {

        const result = await PkpCredentialNftModule.getFullCredential<{
            apiKey: string;
            apiSecret: string;
        }>({
            chain: 'mumbai',
            credentialNftUUID: '0x4008fed076a278396f848c110d3b4a96',
        });

        const binanceCredentials = {
            apiKey: result.decryptedCredential?.apiKey as string,
            apiSecret: result.decryptedCredential?.apiSecret as string,
        };

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
