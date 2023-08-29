import { ethers } from "ethers";

import * as config from "../config/config";

import {
    EventEmitterModule,
    EventType
} from '../modules/event-emitter.module';

import { INewIdeaNFT } from '../interfaces/new-idea-nft.i';

import { newIdeaNFTEvent } from "./events/new-idea-nft";

export const D2EventListener = (payload: {
    privateKey?: string;
    rpcUrl: string;
    network: string;
    contractAddress: string;
    abi: string[];
}) => {

    const mode = config.APP_ENV;

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
    } = payload;

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
        log(`Address: ${wallet.address}`);
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

            if (key === 'IdeaCreated') {
                await EventEmitterModule().emit<INewIdeaNFT>(
                    'NEW_IDEA_NFT',
                    {
                        contract,
                        creatorAddress: args[0],
                        nftId: args[1].toNumber(),
                        strategyReference: args[2],
                        blockNumber: args[5].toNumber(),
                    }
                );
            };

        });
    });

};

(async function main() {
    try {
        EventEmitterModule().listen().subscribe(async (res) => {
            const event = res.type as EventType;
            const data = res?.data || null;

            switch (event) {
                case 'NEW_IDEA_NFT':
                    await newIdeaNFTEvent(data as INewIdeaNFT);
                    break;
            }
        });
    } catch (error) {
        error(error);
    }
})();