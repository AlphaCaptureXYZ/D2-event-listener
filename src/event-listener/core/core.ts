import { ethers } from "ethers";

import * as config from "../config/config";

import {
    EventEmitterModule,
    EventType
} from '../modules/event-emitter.module';

import { INewIdeaNFT } from '../interfaces/new-idea-nft.i';

import { newIdeaNFTEvent } from "./events/new-idea-nft";
import { getRpcUrlByNetwork, rest } from "../helpers/helpers";

let watcherLoaded = false;

export const D2EventListener = async (payload: {
    privateKey?: string;
    network: string;
    test?: {
        enabled: boolean;
        blockNumber: number;
    }
}) => new Promise<any>(async (resolve, reject) => {
    try {

        const mode = config.APP_ENV;

        // watcher process
        try {
            if (!watcherLoaded) {
                EventEmitterModule().listen().subscribe(async (res) => {
                    const event = res.type as EventType;
                    const data = res?.data || null;

                    switch (event) {
                        case 'NEW_IDEA_NFT':
                            const response = await newIdeaNFTEvent(data as INewIdeaNFT);

                            if (payload?.test?.enabled) {
                                resolve(response);
                            };

                            break;
                    }
                });
                watcherLoaded = true;
            }
        } catch (error) {
            console.log('Watcher Error: ', error?.message);
        }

        const log = (
            message?: any, ...optionalParams: any[]
        ) => {
            // if (mode === 'production') return;
            console.log(message, ...optionalParams);
        };

        const {
            privateKey,
            network,
        } = payload;

        const rpcUrl = getRpcUrlByNetwork(network);

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
        if (!privateKey) throw new Error(`Private key is not defined`);

        const provider = new ethers.providers.JsonRpcProvider(rpcUrl, networkChainId);

        let contract: ethers.Contract = null as any;

        const wallet = new ethers.Wallet(
            privateKey,
            provider,
        );

        const signer = wallet.connect(provider);

        contract = new ethers.Contract(
            config.IDEA_NFT_CONFIG.gateContractAddress,
            config.IDEA_NFT_CONFIG.gateAbi,
            signer
        );

        log(`Private key detected (${privateKey})`);
        log(`Address: ${wallet.address}`);

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
        }

        if (events?.length <= 0) {
            log(`No events found`);
        }

        log('');

        if (!payload?.test?.enabled) {
            events?.map((key) => {
                contract.on(key, async (...args) => {
                    if (key === 'IdeaCreated') {
                        await EventEmitterModule().emit<INewIdeaNFT>(
                            'NEW_IDEA_NFT',
                            {
                                contract,
                                network,
                                rpcUrl,
                                creatorAddress: args[0],
                                strategyReference: args[2],
                                blockNumber: args[5].toNumber(),
                            }
                        );
                    };
                });
            });

            resolve(true);
        }

        if (payload?.test?.enabled) {
            await rest(1000);

            EventEmitterModule().emit<INewIdeaNFT>(
                'NEW_IDEA_NFT',
                {
                    contract,
                    network,
                    rpcUrl,
                    creatorAddress: 'xxx',
                    strategyReference: 'xxx',
                    blockNumber: payload.test.blockNumber,
                }
            );
        }

    } catch (err) {
        reject(err);
    }
});