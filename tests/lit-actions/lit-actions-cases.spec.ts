import 'dotenv/config';

import { expect } from 'chai';

import { isNullOrUndefined, rest } from '../../src/event-listener/helpers/helpers';

import { LitModule } from '../../src/event-listener/modules/lit.module';

import {
    contractAddress,
    abi,
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

        const rpcUrl =
            'https://polygon-mumbai.infura.io/v3/4458cf4d1689497b9a38b1d6bbf05e78';

        const chain = 'mumbai';

        const credentialNftUUID = '0xef99bf0770a920e643f2c855038d4e33';

        const litActionSignCode = `
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

        const listActionSignCodeParams = {
            rpcUrl,
            chain,
            credentialNftUUID,
            contractAddress,
            abi,
        };

        const signResult = await LitModule().runLitAction({
            chain,
            litActionCode: litActionSignCode,
            listActionCodeParams: listActionSignCodeParams,
            nodes: 10,
            showLogs: true,
            pkpKey: process.env.PKP_KEY,
        });

        const litActionGetCredentialCode = `
            const go = async () => {
                const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

                const tx = signResult?.response;
                const signature = signResult.signatures["sig1"].signature;
                const serializedTx = ethers.utils.serializeTransaction(tx, signature);
        
                const transaction = await provider.sendTransaction(serializedTx);
        
                const nftCommitted = await transaction.wait();
        
                const abiForEvent = [
                    "event CredentialInfoViaPKP(tuple(bytes16,uint256,string,string,string,string,address),address)",
                ];
        
                const ifaceForEvent = new ethers.utils.Interface(abiForEvent);
        
                const parsedLogs = [];
        
                for (const logIn of nftCommitted.logs) {
                    try {
                        const parsedLog = ifaceForEvent.parseLog(logIn);
                        parsedLogs.push(parsedLog);
                    } catch (e) { };
                };
        
                if (parsedLogs.length !== 1) {
                    throw new Error('Data not found');
                };
        
                const fillCredential = (data) => {
                    const [
                        encryptedFileB64,
                        encryptedSymmetricKeyString,
                    ] = data[5]?.toString()?.split('||');
        
                    const credential = {
                        uuid: data[0]?.toString(),
                        tokenId: Number(data[1]),
                        provider: data[2]?.toString(),
                        environment: data[3]?.toString(),
                        accountName: data[4]?.toString(),
                        encryptedCredential: {
                            encryptedFileB64,
                            encryptedSymmetricKeyString,
                        },
                        pkpAddress: data[6]?.toString(),
                    }
        
                    return credential;
                };
        
                const targetEvent = parsedLogs[0];
        
                const credentialInfo = targetEvent.args[0];

                // const base64StringToBlob = (base64Data) => {
                //     const contentType = 'application/octet-stream;base64';
                //     const begin = 'data:' + contentType + ',';
                //     const base64DataNoBegin = base64Data.replace(begin, '');
            
                //     const sliceSize = 1024;
                //     const byteCharacters = Buffer.from(base64DataNoBegin, 'base64').toString(
                //         'latin1',
                //     );
            
                //     const bytesLength = byteCharacters.length;
                //     const slicesCount = Math.ceil(bytesLength / sliceSize);
                //     const byteArrays = new Array(slicesCount);
            
                //     for (let sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
                //         const begin = sliceIndex * sliceSize;
                //         const end = Math.min(begin + sliceSize, bytesLength);
            
                //         const bytes = new Array(end - begin);
            
                //         for (let offset = begin, i = 0; offset < end; ++i, ++offset) {
                //             bytes[i] = byteCharacters[offset].charCodeAt(0);
                //         }
            
                //         byteArrays[sliceIndex] = new Uint8Array(bytes);
                //     }
            
                //     const blob = new Blob(byteArrays, { type: contentType });
            
                //     return blob;
                // };
        
                const credential = fillCredential(credentialInfo);

                // const tokenId = credential.tokenId;

                // const encryptedFileB64 = 
                //     credential.encryptedCredential.encryptedFileB64;

                // const encryptedSymmetricKeyString = 
                //     credential.encryptedCredential.encryptedSymmetricKeyString;

                // const accessControlConditionsNFT = [
                //     {
                //         contractAddress: contractAddress,
                //         standardContractType: 'ERC1155',
                //         method: 'balanceOf',
                //         parameters: [':userAddress', tokenId?.toString()],
                //         returnValueTest: {
                //             comparator: '>',
                //             value: '0',
                //         },
                //         chain,
                //     },
                // ];

                // try {
                //     const encryptionKey = await LitActions.getEncryptionKey({ 
                //         conditions: accessControlConditionsNFT, 
                //         authSig, 
                //         chain, 
                //         toDecrypt: encryptedSymmetricKeyString
                //     });

                // }catch(err){
                //     console.log('encryptionKey (error)', err?.message);
                // }

                LitActions.setResponse({ response: JSON.stringify({
                    credential,
                })});
            }

            go();
        `;

        const listActionGetCredentialCodeParams = {
            rpcUrl,
            chain,
            signResult,
            contractAddress,
            abi,
        };

        const getCredential = await LitModule().runLitAction({
            chain,
            litActionCode: litActionGetCredentialCode,
            listActionCodeParams: listActionGetCredentialCodeParams,
            nodes: 1,
            showLogs: true,
            pkpKey: process.env.PKP_KEY,
        });

        console.log('[getCredential]', (getCredential?.response as any)?.credential);

        // expect(isNullOrUndefined(litActionResponse)).to.be.false;
        // expect(litActionResponse).to.be.an('object');
        // expect(litActionResponse).to.have.property('response');
        // expect(litActionResponse.response).to.be.equal(message);

    }).timeout(50000);

});
