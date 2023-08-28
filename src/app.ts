import 'dotenv/config';

import { ethers } from "ethers";

const D2EventListener = (config: {
    privateKey?: string;
    rpcUrl: string;
    network: string;
    contractAddress: string;
    abi: string[];
    callback: (
        event: string,
        args: any[]
    ) => void;
}) => {

    const mode: 'development' | 'production' =
        (process.env.APP_ENV as any) || 'development';

    const log = (
        message?: any, ...optionalParams: any[]
    ) => {
        // if (mode === 'production') return;
        console.log(message, ...optionalParams);
    };

    const {
        privateKey,
        rpcUrl,
        network,
        contractAddress,
        abi,
        callback,
    } = config;

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

    const networkChainId = WALLET_NETWORK_CHAIN_IDS_OPTS[network] || -1;

    if (networkChainId === -1) throw new Error(`Invalid network: ${network}`);

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl, networkChainId);

    let contract: ethers.Contract = null as any;

    if (privateKey) {
        const wallet = new ethers.Wallet(
            privateKey,
            provider,
        );
        const signer = wallet.connect(provider);
        contract = new ethers.Contract(contractAddress, abi, signer);
        log(`Private key detected (${privateKey})`)
    }

    if (!privateKey) {
        contract = new ethers.Contract(contractAddress, abi, provider);
        log(`No private key detected (optional)`);
    }

    log(`Listening the events flow...`);

    let events = Object.keys(contract.filters);

    events = events.map((key) => {
        key = (key.split('(')[0]);
        return key;
    });

    events = [...new Set(events)];

    events = events.filter((key) => {
        return key !== 'Initialized';
    });

    if (events?.length > 0) {
        log(`Events to listen: ${events.join(', ')}`);
    } else {
        log(`No events found`);
    }
    log('');

    events?.map((key) => {
        contract.on(key, async (...args) => {
            callback(key, args);
        });
    });
};

(async function main() {
    try {

        D2EventListener({
            rpcUrl: 'https://polygon-mumbai.infura.io/v3/4458cf4d1689497b9a38b1d6bbf05e78',
            network: 'mumbai',
            privateKey: process.env.PRIVATE_KEY,
            contractAddress: '0xbb1FF71BEe377322284DdBb843a0563cc70229a6',
            abi: [
                'event IdeaCreated(address,uint256,string,uint256,uint256,uint256)',
                'event Initialized(uint8)',
                'function authorizeCheck(address) view returns (bool)',
                'function authorizeProvider(address)',
                'function createIdea(string,string,uint256,bool,address[]) payable returns (uint256)',
                'function createIdeaStage(string,string,uint256,bool,address[],uint256) payable returns (uint256)',
                'function getContractRules() view returns (string)',
                'function getCreatorOfNft(uint256) view returns (address)',
                'function getFirstEventBlock() view returns (uint256)',
                'function getIdeaByKeys(address,string,uint256,uint256) view returns (uint256)',
                'function getIdeaCreationTax() view returns (uint256)',
                'function getIdeaViewers(uint256) view returns (address[])',
                'function getLastEventBlock() view returns (uint256)',
                'function getLastNftId() view returns (uint256)',
                'function getMetadataIdByBlockId(uint256) view returns (tuple(uint256,uint256,string))',
                'function getNftsCreatedBy(address) view returns (tuple(uint256,string,uint256,bool)[])',
                'function getNftsOwnedBy(address) view returns (tuple(uint256,string,uint256,bool)[])',
                'function getSmartContractBalance() view returns (uint256)',
                'function getVersion() view returns (string)',
                'function giveIdeaTo(uint256,address[])',
                'function initialize(address,bool)',
                'function listAllStrategies() view returns (tuple(string,string,address)[])',
                'function listIdeas(address,string) view returns (uint256[])',
                'function listStages(address,string,uint256) view returns (uint256[])',
                'function listStrategies(address) view returns (tuple(string,string,address)[])',
                'function providerCheck(address) view returns (bool)',
                'function providerCreateIdea(address,string,string,uint256,bool,address[]) payable returns (uint256)',
                'function providerCreateIdeaStage(address,string,string,uint256,bool,address[],uint256) payable returns (uint256)',
                'function providerGiveIdeaTo(uint256,address[])',
                'function revokeProvider(address)',
                'function setIdeaCreationTax(uint256)',
                'function uri(uint256) view returns (string)',
                'function withdrawMoney(address,uint256)',
            ],
            callback: async (
                event,
                args
            ) => {

                const data = {
                    creatorAddress: args[0],
                    nftId: args[1].toNumber(),
                    strategyReference: args[2],
                    blockNumber: args[5].toNumber(),
                };

                console.log(`[${event}] (data)`, data);
            },
        });

    } catch (error) {
        error(error);
    }
})();