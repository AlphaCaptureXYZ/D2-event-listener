import 'dotenv/config';

import { ethers } from "ethers";

export const D2EventListener = (config: {
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