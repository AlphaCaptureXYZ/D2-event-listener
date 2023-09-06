import { LitModule } from './lit.module';

import { ethers } from "ethers";

import * as WeaveDB from 'weavedb-sdk-node';

import * as config from "../config/config";

import { isNullOrUndefined } from '../helpers/helpers';

import { blobToBase64String } from '@lit-protocol/lit-node-client-nodejs';

const COLLECTION_NAME = 'D2-data';

const contractTxId = 'C7J5obxRkWLFPzvhcVd3MzgSffLj7S4H12Djbzbi7Jg';

let db = null as any;

const init = async () => {
    if (isNullOrUndefined(db)) {

        db = new WeaveDB({ contractTxId });

        await db.initializeWithoutWallet();

        const privateKey = config.WALLET_PRIVATE_KEY;

        if (privateKey) {
            const wallet = new ethers.Wallet(privateKey);
            const address = wallet.address;

            const config = {
                getAddressString: () => address.toLowerCase(),
                getPrivateKey: () => Buffer.from(privateKey, 'hex'),
            };

            db.setDefaultWallet(config, 'evm');
        }
    }
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
                value: userWallet,
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
        type: string
    },
    authSig: any = null,
) => {
    let data = [];

    try {
        await init();

        const docs: any[] = await db.cget(
            COLLECTION_NAME,
            ['type'],
            ['type', '==', payload.type]
        );

        data = (await Promise?.all(docs?.map(async (res) => {
            try {
                const docId = res?.id;
                const info: any = res?.data;

                const userWallet = info?.userAddress;
                const pkpWalletAddress = info?.pkpWalletAddress || null;

                const acConditions = accessControlConditions(chain, userWallet, pkpWalletAddress);

                const doc = JSON.parse(atob(info?.data));

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
                // console.log('ERROR', err?.message);
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
        // if the docId is provided, the data will be updated instead of created
        // uf the docId not exists, the data will be created
        docId?: string,
    },
) => {
    try {
        const {
            jsonData,
            userWallet,
            type,
            pkpKey,
            docId,
        } = payload;

        await init();

        const pkpWalletAddress = ethers.utils.computeAddress(pkpKey);

        const acConditions = accessControlConditions(chain, userWallet, pkpWalletAddress);

        const {
            encryptedFile,
            encryptedSymmetricKeyString,
        } = await LitModule().encryptString(
            JSON.stringify(jsonData),
            acConditions,
            true,
        );

        const encryptedFileB64 = await blobToBase64String(encryptedFile);

        const id = Math.random().toString(36).substring(7);

        const info = {
            encryptedData: encryptedFileB64,
            encryptedSymmetricKey: encryptedSymmetricKeyString,
        };

        const data = Buffer.from(JSON.stringify(info)).toString('base64');

        const obj = {
            id,
            createdAt: Date.now(),
            data,
            type,
            userAddress: userWallet,
            pkpWalletAddress,
        };

        if (!pkpWalletAddress) {
            delete obj.pkpWalletAddress;
        }

        let tx = null as any;

        if (!docId) {
            tx = await db?.add(
                obj,
                COLLECTION_NAME,
            );
        }

        await tx.getResult();

    } catch (e: any) {
        console.log('addData', e?.message);
    }
}

export const WeaveDBModule = {
    addData,
    getAllData,
}