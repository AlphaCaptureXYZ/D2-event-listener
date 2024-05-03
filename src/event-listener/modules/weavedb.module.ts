import * as config from "../config/config";

import { LitModule } from './lit.module';
import { CompressorModule } from './compressor.module';
import { NftStorageModule } from './nft-store.module';

import { ethers } from "ethers";

import * as WeaveDB from 'weavedb-sdk-node';

import { getStringSize, isNullOrUndefined } from '../helpers/helpers';

import { blobToBase64String } from '@lit-protocol/lit-node-client-nodejs';
import { getCurrentWalletAddress } from "../utils/utils";

const COLLECTION_NAME = 'D2-data';

let db: any = null;

const init = async () => {
    if (isNullOrUndefined(db)) {

        // console.log('weave db A', db);

        try {
            const contractTxId = config.WEAVEDB_CONTRACT_TX_ID;
            // console.log('contractTxId', contractTxId);

            db = new WeaveDB({
                contractTxId,
                nocache: true,
            });
            // console.log('weave db', db);

            await db.initializeWithoutWallet();

            const privateKey = config.WALLET_PRIVATE_KEY;
            // console.log('privateKey', privateKey);

            if (privateKey) {
                const address = getCurrentWalletAddress();

                const config = {
                    getAddressString: () => address?.toLowerCase(),
                    getPrivateKey: () => Buffer.from(privateKey, 'hex'),
                };

                await db.setDefaultWallet(config, 'evm');
            }

        } catch (err: any) {
            console.log('[weavedb] init (error)', err?.message);
        }
    }
    return db;
}

const accessControlConditions = (
    chain: string,
    userWallet: string,
    pkpWalletAddress?: string,
) => {
    // https://developer.litprotocol.com/accessControl/EVM/basicExamples#a-specific-wallet-address
    const accessControlConditions: any[] = [
        {
            contractAddress: '',
            standardContractType: '',
            chain,
            method: '',
            parameters: [
                ':userAddress',
            ],
            returnValueTest: {
                comparator: '=',
                value: userWallet?.toLowerCase(),
            },
        },
    ];

    if (pkpWalletAddress) {
        accessControlConditions.push({
            operator: "or",
        });
        accessControlConditions.push({
            contractAddress: '',
            standardContractType: '',
            chain,
            method: '',
            parameters: [
                ':userAddress',
            ],
            returnValueTest: {
                comparator: '=',
                value: pkpWalletAddress,
            },
        });
    }

    return accessControlConditions;
}

const getAllData = async <T>(
    chain: string,
    payload: {
        type: string,
        byUserWalletFilter?: boolean,
        wallet?: string,
    },
    authSig: any = null,
) => {
    let data = [];

    try {
        const {
            byUserWalletFilter,
            type,
            wallet,
        } = payload;

        await init();

        let docs = [] as any[];

        try {
            console.log('[weavedb] loading info...');
            docs = await db.cget(
                COLLECTION_NAME,
                ['type'],
                ['type', '==', type],
            );
            console.log('[weavedb] info loaded!');
        } catch (err: any) {
            console.log('[weavedb] getAllData (error "db.cget(...)")', err?.message);
        }

        if (byUserWalletFilter) {
            const userAddress = wallet ? wallet?.toLowerCase() : getCurrentWalletAddress();

            docs = docs?.filter((doc) => {
                return doc?.data?.userAddress === userAddress;
            });
        }

        data = (await Promise?.all(docs?.map(async (res) => {
            try {
                const docId = res?.id;
                const info: any = res?.data;

                if ([
                    'order',
                ].includes(type)) {
                    const cid = info?.data;

                    const nftStorageResult = await NftStorageModule.retrieve({
                        cid,
                    });

                    info.data = nftStorageResult;
                }

                const userWallet = info?.userAddress;
                const pkpWalletAddress = info?.pkpWalletAddress || null;

                const dataIsCompressed = info?.isCompressed || false;

                const acConditions = accessControlConditions(chain, userWallet, pkpWalletAddress);

                let doc = null as any;

                if (dataIsCompressed) {
                    doc = await CompressorModule.decompressData(info?.data);
                    info.data = doc;
                };

                doc = JSON.parse(atob(info?.data));

                const {
                    encryptedData,
                    encryptedSymmetricKey,
                } = doc;

                let decryptedFile = null;

                if (isNullOrUndefined(authSig)) {
                    decryptedFile = await LitModule().decryptString(
                        encryptedData,
                        encryptedSymmetricKey,
                        acConditions,
                        chain,
                    );
                }

                if (!isNullOrUndefined(authSig)) {
                    decryptedFile = await LitModule().decryptStringByPkp(
                        authSig,
                        chain,
                        encryptedData,
                        encryptedSymmetricKey,
                        acConditions,
                    );
                }

                const decryptedString = JSON.parse(decryptedFile);

                if (decryptedString) {
                    decryptedString.docId = docId;
                    decryptedString.pkpWalletAddress = pkpWalletAddress;
                }

                return decryptedString;

            } catch (err: any) {
                // console.log('[weavedb] getAllData (error)', err?.message);
            }
        }))) || [];

        data = data?.filter((item) => item) || [];

    } catch (e) {
        console.error(e);
    }

    return data as T[];
}

const addData = async <T>(
    chain: string,
    payload: {
        // data to store based on type
        jsonData: T,
        // user wallet address
        userWallet: string,
        // type of data to store (setting, trigger, profile, order, etc)
        type: string,
        // pkp key to store data for enable external access
        pkpKey: string,
        // if data is compressed
        isCompressed?: boolean,
        // to store data via IPFS (data with big size)
        // viaIPFS?: boolean,
        additionalInfo?: any,
    },
    authSig: any = null,
) => {

    let objEstimatedSize: any = null;
    let result: any = null;

    try {
        await init();

        let {
            jsonData,
            userWallet,
            type,
            pkpKey,
            isCompressed,
            additionalInfo,
        } = payload;

        userWallet = userWallet?.toLowerCase();

        const pkpWalletAddress = ethers.utils.computeAddress(pkpKey);

        const acConditions = accessControlConditions(chain, userWallet, pkpWalletAddress);

        const {
            encryptedFile,
            encryptedSymmetricKeyString,
        } = await LitModule().encryptString(
            JSON.stringify(jsonData),
            acConditions,
            true,
            chain,
            authSig,
        );

        const encryptedFileB64 = await blobToBase64String(encryptedFile);

        const id = Math.random().toString(36).substring(7);

        const info = {
            encryptedData: encryptedFileB64,
            encryptedSymmetricKey: encryptedSymmetricKeyString,
        };

        let data = Buffer.from(JSON.stringify(info)).toString('base64');

        if (payload?.isCompressed) {
            data = await CompressorModule.compressData(data);
        }

        if ([
            'order',
        ].includes(type)) {
            const { cid } = await NftStorageModule.add(data);
            data = cid;
        }

        const obj = {
            id,
            createdAt: Date.now(),
            data,
            type,
            userAddress: userWallet,
            pkpWalletAddress,
            isCompressed: isCompressed || false,
            additionalInfo,
        };

        if (isNullOrUndefined(pkpWalletAddress)) {
            delete obj.pkpWalletAddress;
        }

        objEstimatedSize = getStringSize(JSON.stringify(obj));

        const tx = await db.add(
            obj,
            COLLECTION_NAME,
        );

        result = tx;

    } catch (err: any) {
        // todo: handle error
        console.log('[weavedb] addData (error)', err?.message);
        console.log('[weavedb] addData (estimated size)', objEstimatedSize);
    }

    return result;
}

const deleteData = async (
    docId: string,
) => {
    await init();
    const result = await db.delete(COLLECTION_NAME, docId);
    return result;
};

export const WeaveDBModule = {
    addData,
    getAllData,
    deleteData,
};