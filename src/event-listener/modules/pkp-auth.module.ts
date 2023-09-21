import * as config from '../config/config';

import { LitModule } from './lit.module';

import { ethers } from 'ethers';

import * as Siwe from 'siwe';

const getPkpAuthSig = async (
    chain: string,
    pkpKey: string,
) => {
    const pkpWalletAddress = ethers.utils.computeAddress(pkpKey);

    const siweMessage = new Siwe.SiweMessage({
        domain: 'localhost',
        address: pkpWalletAddress,
        statement: 'This is a key for D2 Event Listener',
        uri: 'https://localhost/login',
        version: '1',
        chainId: 1,
    });

    const message = siweMessage.prepareMessage();

    const litActionCode = `
        const go = async () => {
            const sigShare = 
                await LitActions.ethPersonalSignMessageEcdsa({ message, publicKey, sigName });
        }
        go();
    `;

    const listActionCodeParams = {
        message,
    };

    const litActionResponse = await LitModule().runLitAction({
        chain,
        litActionCode,
        listActionCodeParams,
        nodes: 10,
        showLogs: false,
        pkpKey,
        sigName: 'pkpAuthSig',
    });

    const signature = litActionResponse.signatures?.pkpAuthSig;

    const sig = ethers.utils.joinSignature({
        r: '0x' + signature.r,
        s: '0x' + signature.s,
        v: signature.recid,
    });

    const authSig = {
        sig,
        derivedVia: 'web3.eth.personal.sign',
        signedMessage: message,
        address: pkpWalletAddress,
    };

    return authSig;
}

export const PkpAuthModule = {
    getPkpAuthSig,
}