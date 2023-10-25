import { IPkpInfo } from "./shared.i";

export interface INotification<T> {
    type: string,
    info: T;
}

export interface INotificationPayload {
    environment: string;
    credentialNftUUID: string;
    credentialOwner: string;
    nftId: string;
    blockNumber: number;
    data: any;

    error?: string;
    orderId?: string;
    docID?: string;
    pkpInfo: IPkpInfo;
};

export interface INotificationEventPayload {
    network: string,
    nftId: string,
    blockNumber: number,
    provider: string,
    ticker: string,
    kind: string,
    direction: string,
    price: string,
    creator: {
        name: string,
        walletAddress: string,
    },
    company: string,
    strategy: {
        reference: string,
        name: string,
    },
};