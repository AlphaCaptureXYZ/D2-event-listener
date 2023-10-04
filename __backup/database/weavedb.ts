//@ts-ignore
import * as WeaveDB from 'weavedb-sdk-node';

import * as config from '../../src/event-listener/config/config';
import * as utils from '../../src/event-listener/utils/utils';

const contractTxId = config.WEAVEDB_CONTRACT_TX_ID;

const initCollection = async (db: any) => {
    const schema = {
        type: 'object',
        required: [
            'id',
            'userAddress',
            'data',
            'createdAt',
            'type',
            'isCompressed',
        ],
        properties: {
            id: {
                type: 'string',
            },
            userAddress: {
                type: 'string',
            },
            pkpWalletAddress: {
                type: 'string',
            },
            data: {
                type: 'string',
            },
            type: {
                type: 'string',
            },
            isCompressed: {
                type: 'boolean',
            },
            createdAt: {
                type: 'number',
            },
            additionalInfo: {
                type: 'object',
            }
        },
    };

    await db.setSchema(schema, 'D2-data');

    // some rules: https://docs.weavedb.dev/examples/todos#set-up-access-control-rules
    const rules = {
        "allow create": {
            "!=": [{ var: "request.auth.signer" }, null]
        },
        "allow update": {
            and: [
                { "!=": [{ var: "request.auth.signer" }, null] },
                {
                    "==": [
                        { var: "request.auth.signer" },
                        { var: "resource.data.userAddress" },
                    ],
                },
            ],
        },
        "allow delete": {
            and: [
                { "!=": [{ var: "request.auth.signer" }, null] },
                {
                    "==": [
                        { var: "request.auth.signer" },
                        { var: "resource.data.userAddress" },
                    ],
                },
            ],
        },
    };

    await db.setRules(rules, "D2-data");

    const schemaCreated = await db.getSchema('D2-data');

    console.log('schemaCreated', schemaCreated);
};

(async function main() {
    try {

        const privateKey = config.WALLET_PRIVATE_KEY;
        const walletAddress = utils.getCurrentWalletAddress();

        const wallet = {
            getAddressString: () => walletAddress,
            getPrivateKey: () => Buffer.from(privateKey, 'hex'),
        }

        const db = new WeaveDB({
            contractTxId,
        });

        await db.initializeWithoutWallet();

        db.setDefaultWallet(wallet, 'evm');

        //  WALLET = wallet to give access to the contract (owner)
        // await db.addOwner('ADD_THE_WALLET_ADDRESS');

        await initCollection(db);

        console.log('Done!');

        // check --> https://console.weavedb.dev

    } catch (err: any) {
        console.log('WEAVEDB ERROR', err.message);
    }
})();