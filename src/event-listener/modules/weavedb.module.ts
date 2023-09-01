import { LitModule } from './lit.module';

import { ethers } from "ethers";

import * as WeaveDB from 'weavedb-sdk-node';

import * as config from "../config/config";

import { isNullOrUndefined } from '../helpers/helpers';

const COLLECTION_NAME = 'D2-data';

let db = null as any;

const init = async () => {
    if (isNullOrUndefined(db)) {

        db = new WeaveDB({
            contractTxId: 'gxnODFeY8DkbeVLo62RXKoipkJGIJhPtYhkgRF7kcoQ',
        });

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
    }
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

                const decryptedFile = await LitModule().decryptString(
                    encryptedData,
                    encryptedSymmetricKey,
                    acConditions,
                );

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

export const WeaveDBModule = {
    getAllData,
};