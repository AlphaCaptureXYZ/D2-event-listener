export interface ID2EventListenerPayload {
    privateKey: string;
    network: string;
    test?: {
        enabled: boolean;
        blockNumber: number;
    }
};