import * as config from '../../src/event-listener/config/config';

import { expect } from 'chai';

import { isNullOrUndefined } from '../../src/event-listener/helpers/helpers';

import { PkpCredentialNftModule } from '../../src/event-listener/modules/pkp-credential-nft.module';
import { LitModule } from '../../src/event-listener/modules/lit.module';

import * as litActions from '../../src/event-listener/core/lit-actions';
import { PkpAuthModule } from '../../src/event-listener/modules/pkp-auth.module';

import { ILitActionResult } from '../../src/event-listener/interfaces/shared.i';

describe('Lit Action Cases', () => {

    xit('Credential NFT smart contract request using PKP key to check the access', async () => {

        const result = await PkpCredentialNftModule.getCredentialNftEncrypted({
            chain: 'mumbai',
            credentialNftUUID: '0xd06b243c18ffc6f0c24338804773b5b4',
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

    xit('Retrieve Full credential pkp access', async () => {

        const result = await PkpCredentialNftModule.getFullCredential<{
            apiKey: string;
            apiSecret: string;
        }>({
            chain: 'mumbai',
            credentialNftUUID: '0xd06b243c18ffc6f0c24338804773b5b4',
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

    xit('Binance order test', async () => {

        const chain = 'mumbai';
        const credentialNftUUID = '0xd06b243c18ffc6f0c24338804773b5b4';
        const environment = 'demo';

        const symbol = 'XRPUSDT';
        const direction = 'BUY';
        const usdtAmount = 12;

        const pkpAuthSig = await PkpAuthModule.getPkpAuthSig(
            chain,
            config.PKP_KEY,
        );

        const litActionQtyCode = litActions.binance.getQtyWithSymbolPrecision(
            environment as any,
            symbol,
            usdtAmount,
        );

        const litActionCallQty = await LitModule().runLitAction({
            chain,
            litActionCode: litActionQtyCode,
            listActionCodeParams: {},
            nodes: 1,
            showLogs: false,
            authSig: pkpAuthSig,
        });

        const litActionCallQtyResponse = litActionCallQty?.response as any;

        const error = litActionCallQtyResponse?.error as any;

        const quantity = litActionCallQtyResponse?.quantity as any;

        const litActionCode = litActions.binance.placeOrder(environment as any);

        const credentialInfo = await PkpCredentialNftModule.getFullCredential<{
            apiKey: string;
            apiSecret: string;
        }>({
            chain,
            credentialNftUUID,
        });

        const binanceCredentials = {
            apiKey: credentialInfo.decryptedCredential?.apiKey as string,
            apiSecret: credentialInfo.decryptedCredential?.apiSecret as string,
        };

        const listActionCodeParams = {
            credentials: credentialInfo.decryptedCredential,
            form: {
                asset: symbol,
                direction,
                quantity,
            },
        };

        const litActionCall = error ? null : (await LitModule().runLitAction({
            chain,
            litActionCode,
            listActionCodeParams,
            nodes: 1,
            showLogs: false,
            authSig: pkpAuthSig,
        }));

        const litActionResult = litActionCall?.response as any;

        const result: ILitActionResult = {
            additionalInfo: {
                asset: symbol,
                nftId: 12345,
                credentialNftUUID,
                userWalletAddress: credentialInfo?.owner,
                environment,
            },
            request: litActionResult?.request || null,
            response: litActionResult?.response || null,
            error,
        };

        expect(isNullOrUndefined(result)).to.be.false;
        expect(result).to.be.an('object');
        expect(binanceCredentials.apiKey?.trim()?.length > 0).to.be.true;
        expect(binanceCredentials.apiSecret?.trim()?.length > 0).to.be.true;

    }).timeout(50000);

});
