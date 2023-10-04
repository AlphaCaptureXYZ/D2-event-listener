import * as LitJsSdk from '@lit-protocol/lit-node-client-nodejs';

import * as Siwe from 'siwe';

import { ethers } from 'ethers';

import * as config from '../config/config';

import {
    isNullOrUndefined
} from '../helpers/helpers';

const client = new LitJsSdk.LitNodeClientNodeJs({
    alertWhenUnauthorized: true,
    debug: false,
});

let litService = null;

class Lit {
    private litNodeClient: any;

    async connect() {
        await client.connect();
        this.litNodeClient = client;
    }

    private base64StringToBlob(base64Data: string): Blob {
        const contentType = 'application/octet-stream;base64';
        const begin = 'data:' + contentType + ',';
        const base64DataNoBegin = base64Data.replace(begin, '');

        const sliceSize = 1024;
        const byteCharacters = Buffer.from(base64DataNoBegin, 'base64').toString(
            'latin1',
        );

        const bytesLength = byteCharacters.length;
        const slicesCount = Math.ceil(bytesLength / sliceSize);
        const byteArrays = new Array(slicesCount);

        for (let sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
            const begin = sliceIndex * sliceSize;
            const end = Math.min(begin + sliceSize, bytesLength);

            const bytes = new Array(end - begin);

            for (let offset = begin, i = 0; offset < end; ++i, ++offset) {
                bytes[i] = byteCharacters[offset].charCodeAt(0);
            }

            byteArrays[sliceIndex] = new Uint8Array(bytes);
        }

        const blob = new Blob(byteArrays, { type: contentType });

        return blob;
    }

    async getAuthSig() {

        const privateKey = config.WALLET_PRIVATE_KEY;

        const signer = new ethers.Wallet(privateKey);
        const address = await signer.getAddress();

        const siweMessage = new Siwe.SiweMessage({
            domain: 'localhost',
            address,
            statement: 'This is a key for D2 Event Listener',
            uri: 'https://localhost/login',
            version: '1',
            chainId: 1,
        });

        const messageToSign = siweMessage.prepareMessage();

        const sig = await signer?.signMessage(messageToSign);

        const authSig = {
            sig,
            derivedVia: 'web3.eth.personal.sign',
            signedMessage: messageToSign,
            address,
        };

        return authSig;
    }

    async encryptString(
        str: string,
        accessControlConditions: any[],
        permanent: boolean = false,
        chain: string = 'mumbai',
        authSig = null,
    ) {

        if (!this.litNodeClient) {
            await this.connect();
        };

        if (isNullOrUndefined(authSig)) {
            authSig = await this.getAuthSig();
        }

        const { encryptedString, symmetricKey } = await (LitJsSdk as any).encryptString(str);

        const encryptedSymmetricKey = await this.litNodeClient.saveEncryptionKey({
            accessControlConditions,
            symmetricKey,
            authSig,
            chain,
            permanent,
        });

        const encryptedSymmetricKeyString = LitJsSdk.uint8arrayToString(
            encryptedSymmetricKey,
            'base16'
        );

        return {
            symmetricKey,
            encryptedFile: encryptedString,
            encryptedSymmetricKeyString,
            encryptedSymmetricKey,
        };
    }

    async decryptString(
        encryptedBase64Str: string,
        encryptedSymmetricKey: string,
        accessControlConditionsNFT: any,
        chain: string = 'mumbai',
    ) {

        if (!this.litNodeClient) {
            await this.connect();
        };

        const authSig = await this.getAuthSig();

        const encryptionKey = await this.litNodeClient.getEncryptionKey({
            accessControlConditions: accessControlConditionsNFT,
            toDecrypt: encryptedSymmetricKey,
            chain,
            authSig,
        });

        const blob = this.base64StringToBlob(encryptedBase64Str);

        const decryptedString = await LitJsSdk.decryptString(
            blob,
            encryptionKey
        );

        return decryptedString;
    }

    async decryptStringByPkp(
        authSig: any,
        chain: string,
        encryptedBase64Str: string,
        encryptedSymmetricKey: string,
        accessControlConditionsNFT: any,
    ) {

        if (!this.litNodeClient) {
            await this.connect();
        };

        const encryptionKey = await this.litNodeClient.getEncryptionKey({
            accessControlConditions: accessControlConditionsNFT,
            toDecrypt: encryptedSymmetricKey,
            chain,
            authSig,
        });

        const blob = this.base64StringToBlob(encryptedBase64Str);

        const decryptedString = await LitJsSdk.decryptString(
            blob,
            encryptionKey
        );

        return decryptedString;
    }

    async updateAccessControlConditions(
        encryptedSymmetricKey: string,
        accessControlConditions: any,
        chain: string = 'mumbai',
    ) {

        if (!this.litNodeClient) {
            await this.connect();
        };

        const authSig = await this.getAuthSig();

        await this.litNodeClient.saveEncryptionKey({
            accessControlConditions,
            encryptedSymmetricKey,
            authSig,
            chain,
            permanent: true,
        });
    }

    async runLitAction(payload: {
        chain: string,
        litActionCode: string,
        listActionCodeParams: any,
        pkpKey?: string,
        nodes?: number,
        showLogs?: boolean,
        sigName?: string,
        authSig?: any,
    }) {

        let {
            pkpKey,
            sigName,
            litActionCode,
            listActionCodeParams,
            nodes,
            showLogs,
            authSig,
        } = payload;

        nodes = nodes || 10;

        if (isNullOrUndefined(authSig)) {
            authSig = await this.getAuthSig();
        }

        const litNodeClient = new (LitJsSdk as any).LitNodeClientNodeJs({
            litNetwork: 'serrano',
            debug: showLogs,
        });

        await litNodeClient.connect();

        if (!isNullOrUndefined(listActionCodeParams)) {
            if (!isNullOrUndefined(pkpKey)) {
                listActionCodeParams.publicKey = pkpKey;
            }

            if (isNullOrUndefined(sigName)) {
                listActionCodeParams.sigName = 'sig1';
            } else {
                listActionCodeParams.sigName = sigName;
            }

            listActionCodeParams.authSig = authSig;
        };

        const litActionResult = await litNodeClient.executeJs({
            code: litActionCode,
            authSig,
            jsParams: {
                ...listActionCodeParams,
                debug: showLogs,
            },
            targetNodeRange: nodes,
            debug: showLogs,
        });

        if (showLogs) {
            console.log('======= <LIT ACTION LOGS> =======');
            console.log('');
            console.log(litActionResult?.logs);
            console.log('');
            console.log('======= </LIT ACTION LOGS> =======');
        }

        return litActionResult;
    }

    getPkpWalletAddress(publicKey: string) {
        return ethers.utils.computeAddress(publicKey);
    }

}

export const LitModule = (): Lit => {
    if (litService === null) {
        litService = new Lit();
    }
    return litService;
};
