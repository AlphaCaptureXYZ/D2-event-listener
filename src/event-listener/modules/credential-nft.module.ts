import { ethers } from "ethers";

import { LitModule } from './lit.module';

import * as config from '../config/config';

export const contractAddress = '0xAD7b59D03702BBD1Eae4c2e403856dd094D7561A';

export const abi = [
    "constructor()",
    "event ApprovalForAll(address indexed,address indexed,bool)",
    "event CredentialCreated(uint256,bytes16,address)",
    "event CredentialInfoViaPKP(tuple(bytes16,uint256,string,string,string,string,address),address)",
    "event Initialized(uint8)",
    "event TransferBatch(address indexed,address indexed,address indexed,uint256[],uint256[])",
    "event TransferSingle(address indexed,address indexed,address indexed,uint256,uint256)",
    "event URI(string,uint256 indexed)",
    "function balanceOf(address,uint256) view returns (uint256)",
    "function balanceOfBatch(address[],uint256[]) view returns (uint256[])",
    "function createCredential(string,string,string,string,address)",
    "function generateUUID() view returns (bytes16)",
    "function getCredentialById(uint256) view returns (tuple(bytes16,uint256,string,string,string,string,address))",
    "function getCredentialByIdViaPkp(uint256)",
    "function getMyCredentials() view returns (tuple(bytes16,uint256,string,string,string,string,address)[])",
    "function getMyCredentialsTotal() view returns (uint256)",
    "function getTokenId(bytes16) view returns (uint256)",
    "function isApprovedForAll(address,address) view returns (bool)",
    "function safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)",
    "function safeTransferFrom(address,address,uint256,uint256,bytes)",
    "function setApprovalForAll(address,bool)",
    "function supportsInterface(bytes4) view returns (bool)",
    "function uri(uint256) view returns (string)"
];


let contract: any = null;

let configObj = {
    rpcUrl: null,
    chain: null,
};

interface ICredentialNftBasicInfo {
    uuid: string;
    tokenId: number;
    provider: string;
    environment: string;
    accountName: string;
    pkpAddress: string;
};

interface ICredentialNftRaw extends ICredentialNftBasicInfo {
    encryptedCredential: {
        encryptedFileB64: string;
        encryptedSymmetricKeyString: string;
    };
};

interface ICredentialNft<T> {
    uuid: string;
    tokenId: number;
    provider: string;
    environment: string;
    accountName: string;
    credential: T;
    pkpAddress: string;
};

const fillCredential = (data: any): ICredentialNftRaw => {
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

const getCredentialByUUID = async <T>(uuid: string): Promise<ICredentialNft<T>> => {
    let credentialResponse: ICredentialNft<T> = null as any;
    try {
        await init();

        const id = await contract.getTokenId(uuid);
        const credentialInfo = fillCredential(await contract.getCredentialById(id));

        const check = credentialInfo?.encryptedCredential?.encryptedFileB64?.trim()?.length > 0;

        if (!check) {
            throw new Error('Credential not found or not available/accessible');
        }

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

        LitModule().setChain(configObj.chain);

        const decryptedFile = await LitModule().decryptString(
            encryptedFileB64,
            encryptedSymmetricKeyString,
            accessControlConditionsNFT
        );

        const credential = JSON.parse(decryptedFile) as T;

        credentialResponse = {
            uuid: credentialInfo.uuid,
            tokenId: credentialInfo.tokenId,
            accountName: credentialInfo.accountName,
            environment: credentialInfo.environment,
            pkpAddress: credentialInfo.pkpAddress,
            provider: credentialInfo.provider,
            credential,
        };

    } catch (err) {
        throw err;
    }

    return credentialResponse;
};

export const CredentialNFTModule = {
    setConfig,
    getCredentialByUUID,
};