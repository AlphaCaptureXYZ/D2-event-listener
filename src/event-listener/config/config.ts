import 'dotenv/config';

import { CONTRACTS, IContractRecipe } from '@ixily/activ/dist/sdk/activ-v4';

import { IPkpInfo } from '../interfaces/shared.i';
import { WeaveDBModule } from '../modules/weavedb.module';

const MAX_LIT_ENC_DEC_ATTEMPTS = 5 as number;

const APP_ENV: 'development' | 'production' =
    (process.env.APP_ENV as any) || 'development';

// const WEAVEDB_CONTRACT_TX_ID = 'uItgIC0zhIGUM3uK0DPb__1TVb-2F5Q1awI2mVMICbk';
//
// new contract tx id to test
const WEAVEDB_CONTRACT_TX_ID = '5_KIAVYCJeJj9d-fAJmCcNsPlMefjfoo4PUgk1JbLTA';

const NFT_STORAGE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDg4QWQ0MDgwODIxMTIyOTRGQjU5MDM3NDk2Y0ZDMjk0Yzg2QjNGQzkiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY5NTEzODUyMjcwMiwibmFtZSI6ImQyLW9yZGVyLXN0b3JlIn0.Dm2J9JxCuBnxRk6Q9nrrUGkhmwWAJ5rvBfsdtU4sR38';

const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY as string;

const getPKPInfo = async (network: string): Promise<IPkpInfo> => {
    try {
        // console.log('in getPKPInfo', network);
        const data = await WeaveDBModule.getAllData<any>(network, {
            type: 'pkp-info',
            byUserWalletFilter: true,
        });

        const dataSize = data?.length;
        const pkpInfo = dataSize > 0 ? data[dataSize - 1] : null;

        if (!pkpInfo) throw new Error('PKP Info not found, please generate one using the D2 site');

        return pkpInfo;
    } catch (err) {
        console.log('getPKPInfo (ERROR)', err.message);
        throw err;
    }
}

const getContractRecipe = (
    network: string
): IContractRecipe => {
    const networkObj = {
        mumbai: CONTRACTS.IxilyActivV4_Mumbai,
        polygon: CONTRACTS.IxilyActivV4_Polygon_Production,
    }

    const recipe = networkObj[network] || null;

    if (!recipe) throw new Error(`Network not supported: ${network}`);

    return recipe;
}

export {
    getPKPInfo,
    getContractRecipe,

    APP_ENV,
    WALLET_PRIVATE_KEY,
    MAX_LIT_ENC_DEC_ATTEMPTS,
    WEAVEDB_CONTRACT_TX_ID,
    NFT_STORAGE_API_KEY,
};