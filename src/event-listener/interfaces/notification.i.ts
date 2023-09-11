export interface INotificationPayload {
    type: string,
    info: {
        credentialNftUUID: string;
        credentialOwner: string;
        nftId: string;
        blockNumber: number;
        data: any;

        orderId?: string;
        docID?: string;
    }
};