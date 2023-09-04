export interface ICredentialNft<T> {
    uuid: string;
    tokenId: number;
    provider: string;
    environment: string;
    accountName: string;
    encryptedCredential: {
        encryptedFileB64: string;
        encryptedSymmetricKeyString: string;
    };
    owner: string;
    pkpAddress: string;
    decryptedCredential?: T;
};