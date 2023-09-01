import 'dotenv/config';

import { ICredentialNft } from '../interfaces/credential-nft.i';

import {
    contractAddress,
    abi,
} from './credential-nft.module';

import { LitModule } from './lit.module';

import { ethers } from 'ethers';

import * as Siwe from 'siwe';
import { getRpcUrlByNetwork } from '../helpers/helpers';

const getCredentialNftEncrypted = async (
    payload: {
        chain: string
        credentialNftUUID: string
    }
): Promise<ICredentialNft<any>> => {

    let response: ICredentialNft<any> = null as any;

    try {

        const {
            credentialNftUUID,
            chain,
        } = payload;

        const rpcUrl = getRpcUrlByNetwork(chain);

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
            showLogs: false,
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
        
                const credential = fillCredential(credentialInfo);

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
            showLogs: false,
            pkpKey: process.env.PKP_KEY,
        });

        response = (getCredential?.response as any)?.credential as ICredentialNft<any>;

    } catch (err: any) {
        console.log('PKP CREDENTIAL NFT (getCredentialNftEncrypted) ERROR', err?.message);
    }

    return response;
};

const decryptCredentialNft = async <T>(
    payload: {
        chain: string
        credentialInfo: ICredentialNft<T>,
    }
): Promise<ICredentialNft<T>> => {

    const {
        chain,
        credentialInfo,
    } = payload;

    try {

        const pkpWalletAddress = ethers.utils.computeAddress(process.env.PKP_KEY as string);

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
            pkpKey: process.env.PKP_KEY,
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

        const accessControlConditionsNFT = [
            {
                contractAddress: contractAddress,
                standardContractType: 'ERC1155',
                method: 'balanceOf',
                parameters: [':userAddress', credentialInfo.tokenId?.toString()],
                returnValueTest: {
                    comparator: '>',
                    value: '0',
                },
                chain,
            },
        ];

        const data = await LitModule().decryptStringTest(
            authSig,
            chain,
            credentialInfo.encryptedCredential.encryptedFileB64,
            credentialInfo.encryptedCredential.encryptedSymmetricKeyString,
            accessControlConditionsNFT,
        );

        credentialInfo.decryptedCredential = JSON.parse(data) as T;

    } catch (err) {
        if (credentialInfo) {
            credentialInfo.decryptedCredential = null as any;
        };
        console.log('PKP CREDENTIAL NFT (decryptCredentialNft) ERROR', err?.message);
    }

    return credentialInfo;
};

const getFullCredential = async <T>(
    payload: {
        chain: string
        credentialNftUUID: string
    }
): Promise<ICredentialNft<T>> => {

    let credentialInfo: ICredentialNft<T> = null as any;

    try {

        const {
            chain,
        } = payload;

        const credentialEncrypted = await getCredentialNftEncrypted(payload);

        const credentialNftDecrypted = await decryptCredentialNft({
            chain,
            credentialInfo: credentialEncrypted,
        });

        credentialInfo = credentialNftDecrypted;

    } catch (err: any) {
        console.log('PKP CREDENTIAL NFT (getFullCredential) ERROR', err?.message);
    }
    return credentialInfo;
}

export const PkpCredentialNftModule = {
    getCredentialNftEncrypted,
    decryptCredentialNft,
    getFullCredential,
}