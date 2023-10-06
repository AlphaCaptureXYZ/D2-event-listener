import {
    CONTRACT,
} from "@ixily/activ";

import CI = CONTRACT.CONTRACT_INTERFACES;

export type FetcherSource = 'fetch' | 'lit-action';

export interface ID2EventListenerPayload {
    privateKey: string;
    network: string;
    test?: {
        enabled: boolean;
        blockNumber: number;
    }
};

export interface ILitActionResult {
    additionalInfo: any;
    request: any;
    response: any;
    error: any;
}

export interface IPkpInfo {
    docId: string;
    tokenId: string;
    pkpPublicKey: string;
    pkpWalletAddress: string;
    wallets?: string[];
    tx?: any;
}

export interface ICreateBasicIdea {
    reference?: string;
    ticker: string;
    pricingProvider: CI.IPricingProvider;
    conviction: number;
    direction: 'long' | 'short',
}