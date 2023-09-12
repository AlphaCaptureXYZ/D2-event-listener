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