import { ethers } from "ethers";

import LitModule from './lit.module';

import * as config from '../config/config';

const abi = [
    "constructor()",
    "event ApprovalForAll(address indexed,address indexed,bool)",
    "event CredentialCreated(uint256,bytes16,address)",
    "event Initialized(uint8)",
    "event TransferBatch(address indexed,address indexed,address indexed,uint256[],uint256[])",
    "event TransferSingle(address indexed,address indexed,address indexed,uint256,uint256)",
    "event URI(string,uint256 indexed)",
    "function balanceOf(address,uint256) view returns (uint256)",
    "function balanceOfBatch(address[],uint256[]) view returns (uint256[])",
    "function createCredential(string,string,string,string,address)",
    "function generateUUID() view returns (bytes16)",
    "function getCredentialById(uint256) view returns (tuple(bytes16,uint256,string,string,string,string,address))",
    "function getMyCredentials() view returns (tuple(bytes16,uint256,string,string,string,string,address)[])",
    "function getMyCredentialsTotal() view returns (uint256)",
    "function getTokenId(bytes16) view returns (uint256)",
    "function isApprovedForAll(address,address) view returns (bool)",
    "function safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)",
    "function safeTransferFrom(address,address,uint256,uint256,bytes)",
    "function sayHello(address) view returns (string)",
    "function setApprovalForAll(address,bool)",
    "function supportsInterface(bytes4) view returns (bool)",
    "function uri(uint256) view returns (string)"
];

const contractAddress = '0x9056609c1dc0D925EA79f019669a15b8b080f833';

let contract: any = null;

let configObj = {
    rpcUrl: null,
    chain: null,
};

interface ICredentialNft {
    uuid: string;
    tokenId: number;
    provider: string;
    environment: string;
    accountName: string;
    encryptedCredential: {
        encryptedFileB64: string;
        encryptedSymmetricKeyString: string;
    };
    pkpAddress: string;
};

const fillCredential = (data: any): ICredentialNft => {
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

const setConfig = (payload: {
    rpcUrl,
    chain,
}) => {
    configObj.chain = payload.chain;
    configObj.rpcUrl = payload.rpcUrl;
};

const checkConfig = () => {
    if (!configObj.chain) throw new Error('Chain not set');
    if (!configObj.rpcUrl) throw new Error('RPC URL not set');
};

const init = async () => {
    try {
        checkConfig();

        const provider =
            new ethers.providers.JsonRpcProvider(configObj.rpcUrl);

        const privateKey = config.WALLET_PRIVATE_KEY;

        if (privateKey) {
            const wallet = new ethers.Wallet(
                privateKey,
                provider,
            )
            const signer = wallet.connect(provider)
            contract = new ethers.Contract(contractAddress, abi, signer)
        }

        if (!privateKey) {
            contract = new ethers.Contract(contractAddress, abi, provider);
        }

    } catch (err) {
        throw err;
    }
}

const getCredentialByUUID = async <T>(uuid: string): Promise<T> => {
    let credential: T = null as any;
    try {
        await init();

        const id = await contract.getTokenId(uuid);
        const credentialInfo = fillCredential(await contract.getCredentialById(id));

        const encryptedFileB64 =
            credentialInfo?.encryptedCredential?.encryptedFileB64;
        const encryptedSymmetricKeyString =
            credentialInfo?.encryptedCredential?.encryptedSymmetricKeyString;

        const accessControlConditionsNFT = [
            {
                contractAddress,
                standardContractType: 'ERC1155',
                method: 'balanceOf',
                parameters: [':userAddress', id?.toString()],
                returnValueTest: {
                    comparator: '>',
                    value: '0',
                },
                chain: 'mumbai',
            },
        ];

        LitModule.setChain(configObj.chain);

        const decryptedFile = await LitModule.decryptString(
            encryptedFileB64,
            encryptedSymmetricKeyString,
            accessControlConditionsNFT
        );

        credential = JSON.parse(decryptedFile) as T;

    } catch (err) {
        throw err;
    }
    return credential;
};

export const CredentialNFTModule = {
    setConfig,
    getCredentialByUUID,
};