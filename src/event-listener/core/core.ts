import { ethers } from "ethers";

import * as config from "../config/config";

/* modules */
import {
    EventEmitterModule as EventEmitter,
    EventType
} from '../modules/event-emitter.module';

import { WeaveDBModule } from "../modules/weavedb.module";
import { PkpAuthModule } from "../modules/pkp-auth.module";
import { PkpCredentialNftModule } from "../modules/pkp-credential-nft.module";

/* events */
import { newIdeaNFTEvent } from "./events/new-idea-nft";
import { notification } from "./events/notification";
import { createIdea } from "./events/create-idea";

/* helpers */
import { wait } from "../helpers/helpers";

/* utils */
import { getRpcUrlByNetwork } from "../utils/utils";

/* interfaces */
import { INewIdeaNFT } from '../interfaces/new-idea-nft.i';
import { ICreateBasicIdea, ID2EventListenerPayload, IPkpInfo } from "../interfaces/shared.i";
import { INotification } from "../interfaces/notification.i";

import * as fetcher from './fetcher';

let watcherLoaded = false;

const mode = config.APP_ENV;

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

export const D2EventListener = async (
    payload: ID2EventListenerPayload
) => new Promise<any>(async (resolve, reject) => {
    try {

        const { privateKey, network } = payload;

        log(`Network: ${network}`);
        log(`Private key detected: ${privateKey}`);

        const {
            contract,
            rpcUrl,
            wallet,
        } = contractHandler({
            privateKey,
            network,
        });

        log(`Wallet Address: ${wallet.address}`);

        let pkpInfo: IPkpInfo = null as any;

        try {
            await wait(2, 'seconds');
            // pkp check/loader
            pkpInfo = await config.getPKPInfo(network);
            log(`PKP: ${pkpInfo?.pkpWalletAddress}`);
            log(`PKP Wallet Address: ${pkpInfo?.pkpWalletAddress}`);
        } catch (err: any) {
            log('config.getPKPInfo (ERROR)', err.message);
        }

        // watch and process events
        watcherLoader(network, payload, resolve);

        if (pkpInfo) {
            // websocket related to the users orders/trades
            wsTradeLoader({ network, pkpInfo });
        }

        log(`Listening the events flow...`);

        const events = getEventFiltered(contract);

        log('');

        const isAUnitTest = payload?.test?.enabled;


        if (!isAUnitTest) {
            events?.map((key) => {
                contract.on(key, async (...args) => {
                    if (key === 'IdeaCreated') {
                        await EventEmitter().emit<INewIdeaNFT>(
                            'NEW_IDEA_NFT',
                            {
                                contract,
                                network,
                                rpcUrl,
                                blockNumber: args[6]?.blockNumber,
                            }
                        );
                    };
                });
            });

            resolve(true);
        }

        if (isAUnitTest) {
            await wait(1, 'seconds');

            EventEmitter().emit<INewIdeaNFT>(
                'NEW_IDEA_NFT',
                {
                    contract,
                    network,
                    rpcUrl,
                    blockNumber: payload.test.blockNumber,
                }
            );
        }

    } catch (err) {
        reject(err);
    }
});

const log = (
    message?: any, ...optionalParams: any[]
) => {
    // if (mode === 'production') return;
    console.log(message, ...optionalParams);
};

const contractHandler = (
    payload: ID2EventListenerPayload
) => {
    const {
        privateKey,
        network,
    } = payload;

    const rpcUrl = getRpcUrlByNetwork(network);

    const networkChainId = WALLET_NETWORK_CHAIN_IDS_OPTS[network] || -1;

    if (networkChainId === -1) throw new Error(`Invalid network: ${network}`);
    if (!privateKey) throw new Error(`Private key is not defined`);

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl, networkChainId);

    const wallet = new ethers.Wallet(
        privateKey,
        provider,
    );

    const signer = wallet.connect(provider);

    const contractRecipe = config.getContractRecipe(network);

    const contract = new ethers.Contract(
        contractRecipe.gateContractAddress,
        contractRecipe.gateAbi,
        signer
    );

    return {
        contract,
        rpcUrl,
        wallet,
    };
}

const watcherLoader = (
    network: string,
    payload: ID2EventListenerPayload,
    // used to finish the unit test promise
    resolve?: any,
) => {
    // watcher process
    try {
        if (!watcherLoaded) {
            EventEmitter().listen().subscribe(async (res) => {

                const event = res.type as EventType;
                const data = res?.data || null;

                // event selector
                switch (event) {
                    case 'NEW_IDEA_NFT':
                        const response = await newIdeaNFTEvent(data as INewIdeaNFT);
                        if (payload?.test?.enabled) {
                            return resolve(response);
                        };
                        break;
                    case 'NOTIFICATION':
                        await notification(data as INotification<any>);
                        break;
                    case 'CREATE_IDEA':
                        await createIdea({
                            idea: data as ICreateBasicIdea,
                            network,
                        });
                        break;
                };

            });
            watcherLoaded = true;
        }
    } catch (err) {
        console.log('Watcher Error: ', err?.message);
    }
}

const getEventFiltered = (contract: ethers.Contract) => {
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
        log('');
        log(`Events to listen: ${events.join(', ')}`);
    }

    if (events?.length <= 0) {
        log(`No events found`);
    }

    return events;
};

// just to test initially
const wsTradeLoader = async (payload: {
    network: string,
    pkpInfo: IPkpInfo,
}) => {
    try {
        const {
            network,
            pkpInfo,
        } = payload;

        const pkpAuthSig = await PkpAuthModule.getPkpAuthSig(
            network,
            pkpInfo?.pkpPublicKey,
        );

        console.log('Checking if your wallet have pkp and triggers created...');

        let triggers =
            await WeaveDBModule.getAllData<any>(network, {
                type: 'trigger',
            }, pkpAuthSig);

        console.log('Triggers found: ', triggers?.length, '\n');

        const pkpWalletAddress = pkpInfo?.pkpWalletAddress;

        // triggers linked to the pkp
        triggers = triggers?.filter((trigger) => {
            const check = trigger?.pkpWalletAddress?.toLowerCase() === pkpWalletAddress?.toLowerCase();
            return check;
        });

        for (const trigger of triggers) {
            if (trigger) {

                const credentialNftUUID = trigger?.account?.reference;

                const credentialInfo =
                    await PkpCredentialNftModule.getFullCredential<any>({
                        chain: network,
                        credentialNftUUID,
                        authSig: pkpAuthSig,
                        pkpKey: pkpInfo.pkpPublicKey,
                    });

                if (credentialInfo.provider === 'Binance') {
                    console.log('Pkp and triggers found, connecting to binance ws...');

                    await fetcher.binance.ws.connect({
                        id: credentialNftUUID,
                        apiKey: credentialInfo?.decryptedCredential?.apiKey,
                        apiSecret: credentialInfo?.decryptedCredential?.apiSecret,
                        env: credentialInfo?.environment as any,
                    });
                }

            }
        }

    } catch (err) {
        console.log('wsTradesLoader error', err?.message);
    }
}