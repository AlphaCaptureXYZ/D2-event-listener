import * as config from "../config/config";

import {
    SDK,
    CONTRACT,
} from "@ixily/activ";

import v4 = SDK.v4;
import CI = CONTRACT.CONTRACT_INTERFACES;

type IActiv = typeof activ;

//@ts-ignore
import * as LitJsSdk from '@lit-protocol/lit-node-client-nodejs';
//@ts-ignore
import * as Siwe from 'siwe';
//@ts-ignore
import * as Jimp from 'jimp';

import { EnvModule, getBoolean } from "@ixily/activ/dist/sdk/activ-v4";
import { CacheNodeStorageModule, LitNodeProviderModule } from "@ixily/activ/dist/sdk";
import { getTickerIcon, wsLogger } from "../utils/utils";
import { ICreateBasicIdea } from "../interfaces/shared.i";
import { retryFunctionHelper } from "../helpers/helpers";

const { ActivV4Module } = v4;

const activ = ActivV4Module;

type NetworkType =
    | "hardhat"
    | "goerli"
    | "mumbai"
    | "sepolia"
    | "polygon";

const state = {
    configured: {
        hardhat: false as boolean,
        goerli: false as boolean,
        mumbai: false as boolean,
    },
    instance: {
        hardhat: null as any,
        goerli: null as any,
        mumbai: null as any,
    },
    privateKey: {
        hardhat: null as string,
        goerli: null as string,
        mumbai: null as string,
    },
};

const MUMBAI_CONFIG: v4.IActivConfig = {
    defaultBlockchainNetwork: "mumbai",
    defaultContract: "v4",
    litConfig: {
        litProvider: LitNodeProviderModule,
        mock: false,
    },
    mockProvableValidation: false,
    nftStorageKey: config.NFT_STORAGE_API_KEY,
    mockNftStorage: false,
    ipfsProxyEnabled: true,
    showLogsToDebug: false,
    useProxyInPricing: true,
    web3AuthorizationOptions: {
        userWalletPrivateKey: config.WALLET_PRIVATE_KEY,
    },
    cacheStorageConfig: {
        isBrowser: false,
        module: CacheNodeStorageModule,
        dbParams: {
            provider: "memory"
        },
        useCache: true,
    }
};

const getApi = async (
    network: NetworkType = "mumbai"
): Promise<typeof activ> => {
    if (!getBoolean(state.configured[network])) {

        const initObj = {
            LitJsSdkInstance: LitJsSdk,
            SiweInstance: Siwe,
            backendWalletPrivateKey: null,
        };

        switch (network) {
            case "mumbai":
                initObj.backendWalletPrivateKey = config.WALLET_PRIVATE_KEY;
                await (LitNodeProviderModule as any).init(initObj);
                await v4.ImagesModule.init({ JimpInstance: Jimp });
                await EnvModule.set("isProd", false);
                await activ.config(MUMBAI_CONFIG);
                break;
        }

        wsLogger({
            message: `Activ SDK initialized for "${network}" network`,
            type: "info",
        });

        state.configured[network] = true;
        state.instance[network] = activ;
        state.privateKey[network] = initObj.backendWalletPrivateKey;
    }

    const networkChainObj = {
        hardhat: "hardhat",
        goerli: "goerli",
        mumbai: "mumbai",
        sepolia: "sepolia",
        polygon: "polygon",
    };

    await activ.selectChainContract(networkChainObj[network], "v4", {
        userWalletPrivateKey: state.privateKey[network],
    });

    return activ;
};

const createIdea = async (
    payload: {
        network: NetworkType;
        ideaObj: ICreateBasicIdea,
    },
) => {

    const {
        network,
        ideaObj,
    } = payload;

    const activ = await getApi(network);

    const {
        reference,
        ticker,
        pricingProvider,
        conviction,
        direction,
    } = ideaObj;

    const tickerB64Img = await getTickerIcon(ticker);

    const strategyInfo = {
        reference: 'd213cd4cf56ce46c0eef3c',
        name: 'D2 Crypto Momentum',
        description: 'The D2 crypto momentum strategy tracks the medium and long term momentum on a basket of crypto pairs. The long only algo waits to confirm that a trend is indeed forming and will remain invested in the pair until momentum on either the medium or long term basis changes. Additional risk management features are applied to ensure that any short term volatility does not unduly impact returns. It should be expected to have fewer profitable trades and loss making trades, but that the average profit will be greater than the average loss which results in an overall profitable strategy.',
    };

    const strategyBanner = 'https://ixily.io/assets/img/profile/activ-profile-default.png';
    const companyLogo = 'https://d2.ixily.io/assets/img/ixily-d2.png'

    const ideaPayload: CI.ICreateIdeaRequest = {
        content: {
            reference,
        },
        strategy: {
            reference: strategyInfo.reference,
            name: strategyInfo.name,
            description: strategyInfo.description,
            image: {
                url: strategyBanner,
            },
        },
        creator: {
            company: 'D2',
            name: 'D2',
            url: 'https://d2.ixily.io',
            companyLogo: {
                url: companyLogo,
            }
        },
        accessWallets: [],
        idea: {
            title: 'D2 generated idea',
            asset: {
                ticker,
                description: ticker,
                image: {
                    b64: tickerB64Img,
                },
            },
            trade: {
                conviction,
                direction,
            },
            notes: {
                commentary: 'D2 generated idea',
            },
        },
        pricing: {
            provider: pricingProvider,
        },
    };

    wsLogger({
        type: 'info',
        message: `Creating Activ Idea using the order "${reference}"`,
        data: {
            reference,
            ticker,
            pricingProvider,
            direction,
        }
    });

    await retryFunctionHelper({
        maxRetries: 3,
        retryCallback: async () => {
            await activ.createIdea(ideaPayload);
        },
        notificationCallback: async (error: string, retryIndex: number) => {
            wsLogger({
                message: `[createActivIdeaInStrategy] Error creating Activ Idea (retry ${retryIndex}): ${error}`,
                type: 'error',
            });
        },
    })

    const idea = await activ.createIdea(ideaPayload);

    wsLogger({
        type: 'success',
        message: `New idea created using the order "${reference}"`,
        data: {
            reference,
            ticker,
            pricingProvider,
            direction,
            idea,
        }
    });

    return idea;
}

export const ActivModule = {
    getApi,
    createIdea,
};
