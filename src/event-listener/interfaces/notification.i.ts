export interface INotificationPayload {
    type: string,
    info: {
        credentialNftUUID: string;
        credentialOwner: string;
        balanceInfo: any;
        nftId: string;
        blockNumber: number;
        data: any;
        orderId: string;
    }
};