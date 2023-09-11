import * as config from "../config/config";

import { LitModule } from './lit.module';
import { CompressorModule } from './compressor.module';

import { ethers } from "ethers";

import * as WeaveDB from 'weavedb-sdk-node';

import { isNullOrUndefined } from '../helpers/helpers';

import { blobToBase64String } from '@lit-protocol/lit-node-client-nodejs';
import { getCurrentWalletAddress } from "../utils/utils";

const COLLECTION_NAME = 'D2-data';

const contractTxId = 'zIcSGRZ47XDF8LVWTLG-ffBuVB28dvXIvfPZfa-baeI';

let db: any = null;

const init = async () => {
    if (isNullOrUndefined(db)) {
        try {
            db = new WeaveDB({
                contractTxId,
                nocache: true,
            });

            await db.initializeWithoutWallet();

            const privateKey = config.WALLET_PRIVATE_KEY;

            if (privateKey) {
                const address = getCurrentWalletAddress();

                const config = {
                    getAddressString: () => address.toLowerCase(),
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
                value: userWallet.toLowerCase(),
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
        dataIsCompressed?: boolean,
        byUserWalletFilter?: boolean,
    },
    authSig: any = null,
) => {
    let data = [];

    try {
        const {
            byUserWalletFilter,
            type,
        } = payload;

        await init();

        const wallet = getCurrentWalletAddress();

        let docs: any[] = await db.cget(
            COLLECTION_NAME,
            ['type'],
            ['type', '==', type],
        );

        if (byUserWalletFilter) {
            docs = docs?.filter((doc) => {
                return doc?.data?.userAddress === wallet;
            });
        }

        data = (await Promise?.all(docs?.map(async (res) => {
            try {
                const docId = res?.id;
                const info: any = res?.data;

                const userWallet = info?.userAddress;
                const pkpWalletAddress = info?.pkpWalletAddress || null;

                const acConditions = accessControlConditions(chain, userWallet, pkpWalletAddress);

                let doc = null as any;

                if (payload?.dataIsCompressed) {
                    doc = await CompressorModule.inflate(info?.data);
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
                }

                return decryptedString;

            } catch (err: any) {
                console.log('ERROR', err?.message);
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
    },
    authSig: any = null,
) => {

    let result: any = null;

    try {
        await init();

        let {
            jsonData,
            userWallet,
            type,
            pkpKey,
        } = payload;

        userWallet = userWallet.toLowerCase();

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
        data = await CompressorModule.deflate(data);

        const obj = {
            id,
            createdAt: Date.now(),
            data,
            type,
            userAddress: userWallet,
            pkpWalletAddress,
        };

        if (isNullOrUndefined(pkpWalletAddress)) {
            delete obj.pkpWalletAddress;
        }

        const tx = await db.add(
            obj,
            COLLECTION_NAME,
        );

        result = tx;

    } catch (err: any) {
        // todo: handle error
        console.log('[weavedb] addData (error)', err?.message);
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