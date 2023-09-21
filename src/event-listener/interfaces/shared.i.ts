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