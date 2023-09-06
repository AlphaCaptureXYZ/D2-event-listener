export interface IOrderStorePayload {
    chain: string,
    provider: string,
    userWalletAddress: string,
    result: {
        request: any;
        response: any;
    }
};