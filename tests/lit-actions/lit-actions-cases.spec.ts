import 'dotenv/config';

import { expect } from 'chai';

import { isNullOrUndefined, rest } from '../../src/event-listener/helpers/helpers';

import { LitModule } from '../../src/event-listener/modules/lit.module';

import {
    contractAddress as credentialNftContractAddress,
    abi as credentialNftAbi,
} from '../../src/event-listener/modules/credential-nft.module';

import { ethers } from 'ethers';

describe('Lit Action Cases', () => {

    xit('Retrive one basic/simple message like "Hello World"', async () => {

        const message = 'Hello World';

        const litActionCode = `
            const go = async () => {

                Lit.Actions.setResponse({response: JSON.stringify(message)});
            }

            go();
        `;

        const listActionCodeParams = {
            message,
        };

        const litActionResponse = await LitModule().runLitAction({
            chain: 'mumbai',
            litActionCode,
            listActionCodeParams,
            nodes: 10,
            showLogs: false,
        });

        expect(isNullOrUndefined(litActionResponse)).to.be.false;
        expect(litActionResponse).to.be.an('object');
        expect(litActionResponse).to.have.property('response');
        expect(litActionResponse.response).to.be.equal(message);

    }).timeout(50000);

    it('Credential NFT smart contract request using PKP key to check the access', async () => {

        const litActionCode = `
            const go = async () => {

                const WALLET_NETWORK_CHAIN_IDS_OPTS = {
                    goerli: 5,
                    hardhat: 1337,
                    kovan: 42,
                    ethereum: 1,
                    rinkeby: 4,
                    ropsten: 3,
                    maticmum: 0xa4ec,
                    sepolia: 11155111,
                    polygon: 137,
                    mumbai: 80001,
                    bnb: 56,
                };

                const provider =
                    new ethers.providers.JsonRpcProvider(rpcUrl);

                const contractAddress = '${credentialNftContractAddress}';

                const abi = '${JSON.stringify(credentialNftAbi)}';
        
                const contract = new ethers.Contract(
                    contractAddress,
                    abi,
                    provider,
                );
        
                let tokenId = await contract.getTokenId(credentialNftUUID);

                const pkpAddress = ethers.utils.computeAddress(publicKey);

                const latestNonce = await Lit.Actions.getLatestNonce({
                    address: pkpAddress,
                    chain,
                });

                const iface = new ethers.utils.Interface(abi);

                const data = iface.encodeFunctionData("getCredentialByIdViaPkp", [
                    tokenId
                ]);

                const networkChainId = WALLET_NETWORK_CHAIN_IDS_OPTS[chain] || -1;

                if (networkChainId === -1) throw new Error('Invalid chain');

                const gasPrice = await provider.getGasPrice();

                const txParams = {
                  nonce: latestNonce,
                  to: contractAddress,
                  data,
                  chainId: networkChainId,
                  value: 0,
                  gasPrice: gasPrice.toHexString(),
                  gasLimit: 190000,
                };
                
                const serializedTx = ethers.utils.serializeTransaction(txParams);
                const unsignedTxn = ethers.utils.keccak256(serializedTx);
                const toSign = ethers.utils.arrayify(unsignedTxn);

                LitActions.setResponse({ response: JSON.stringify(txParams) });

                const sigShare = await LitActions.signEcdsa({ 
                    toSign, 
                    publicKey, 
                    sigName 
                });
            }

            go();
        `;

        const rpcUrl =
            'https://polygon-mumbai.infura.io/v3/4458cf4d1689497b9a38b1d6bbf05e78';

        const chain = 'mumbai';

        const listActionCodeParams = {
            rpcUrl,
            chain,
            credentialNftUUID: '0xef99bf0770a920e643f2c855038d4e33',
        };

        const signResult = await LitModule().runLitAction({
            chain,
            litActionCode,
            listActionCodeParams,
            nodes: 10,
            showLogs: true,
            pkpKey: process.env.PKP_KEY,

        });

        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

        const tx = signResult.response as any;
        const signature = signResult.signatures["sig1"].signature;
        const serializedTx = ethers.utils.serializeTransaction(tx, signature);

        const transaction = await provider.sendTransaction(serializedTx);

        console.log('[transaction]', serializedTx);

        const contract = new ethers.Contract(
            credentialNftContractAddress,
            credentialNftAbi,
            provider,
        );

        contract?.on('CredentialInfoViaPKP', (credentialInfo: any, address: string) => {
            console.log('CredentialInfoViaPKP (credentialInfo)', credentialInfo);
            console.log('CredentialInfoViaPKP (address)', address);
        });

        await transaction.wait();

        await rest(4000);

        // expect(isNullOrUndefined(litActionResponse)).to.be.false;
        // expect(litActionResponse).to.be.an('object');
        // expect(litActionResponse).to.have.property('response');
        // expect(litActionResponse.response).to.be.equal(message);

    }).timeout(50000);

});
