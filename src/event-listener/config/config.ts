import 'dotenv/config';

import { CONTRACTS } from '@ixily/activ/dist/sdk/activ-v4';

import { IPkpInfo } from '../interfaces/shared.i';
import { WeaveDBModule } from '../modules/weavedb.module';

const MAX_LIT_ENC_DEC_ATTEMPTS = 5 as number;

const APP_ENV: 'development' | 'production' =
    (process.env.APP_ENV as any) || 'development';

const WEAVEDB_CONTRACT_TX_ID = 'uItgIC0zhIGUM3uK0DPb__1TVb-2F5Q1awI2mVMICbk';

const NFT_STORAGE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDg4QWQ0MDgwODIxMTIyOTRGQjU5MDM3NDk2Y0ZDMjk0Yzg2QjNGQzkiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY5NTEzODUyMjcwMiwibmFtZSI6ImQyLW9yZGVyLXN0b3JlIn0.Dm2J9JxCuBnxRk6Q9nrrUGkhmwWAJ5rvBfsdtU4sR38';

const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY as string;

const getPKPInfo = async (network: string): Promise<IPkpInfo> => {
    const data = await WeaveDBModule.getAllData<any>(network, {
        type: 'pkp-info',
        byUserWalletFilter: true,
    });

    const pkpInfo = data?.find(res => res) || null;

    if (!pkpInfo) throw new Error('PKP Info not found, please generate one using the D2 site');

    return pkpInfo;
}

const IDEA_NFT_CONFIG = CONTRACTS.IxilyActivV4_Mumbai;

export {
    getPKPInfo,

    APP_ENV,
    WALLET_PRIVATE_KEY,
    IDEA_NFT_CONFIG,
    MAX_LIT_ENC_DEC_ATTEMPTS,
    WEAVEDB_CONTRACT_TX_ID,
    NFT_STORAGE_API_KEY,
};