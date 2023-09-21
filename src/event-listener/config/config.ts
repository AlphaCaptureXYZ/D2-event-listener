import 'dotenv/config';

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

const IDEA_NFT_CONFIG = {
    gateContractAddress: '0x3454dc9AC9e22db36708Df5C8A71A11cfedFe5C0',
    coreContractAddress: '0x7293e5DC2C6ced964a20389cC248F5f69543bf39',
    gateAbi: [
        'event IdeaCreated(address,uint256,string,uint256,uint256,uint256)',
        'event Initialized(uint8)',
        'function authorizeCheck(address) view returns (bool)',
        'function authorizeProvider(address)',
        'function createIdea(string,string,uint256,bool,address[]) payable returns (uint256)',
        'function createIdeaStage(string,string,uint256,bool,address[],uint256) payable returns (uint256)',
        'function getContractRules() view returns (string)',
        'function getCreatorOfNft(uint256) view returns (address)',
        'function getFirstEventBlock() view returns (uint256)',
        'function getIdeaByKeys(address,string,uint256,uint256) view returns (uint256)',
        'function getIdeaCreationTax() view returns (uint256)',
        'function getIdeaViewers(uint256) view returns (address[])',
        'function getLastEventBlock() view returns (uint256)',
        'function getLastNftId() view returns (uint256)',
        'function getMetadataIdByBlockId(uint256) view returns (tuple(uint256,uint256,string))',
        'function getNftsCreatedBy(address) view returns (tuple(uint256,string,uint256,bool)[])',
        'function getNftsOwnedBy(address) view returns (tuple(uint256,string,uint256,bool)[])',
        'function getSmartContractBalance() view returns (uint256)',
        'function getVersion() view returns (string)',
        'function giveIdeaTo(uint256,address[])',
        'function initialize(address,bool)',
        'function listAllStrategies() view returns (tuple(string,string,address)[])',
        'function listIdeas(address,string) view returns (uint256[])',
        'function listStages(address,string,uint256) view returns (uint256[])',
        'function listStrategies(address) view returns (tuple(string,string,address)[])',
        'function providerCheck(address) view returns (bool)',
        'function providerCreateIdea(address,string,string,uint256,bool,address[]) payable returns (uint256)',
        'function providerCreateIdeaStage(address,string,string,uint256,bool,address[],uint256) payable returns (uint256)',
        'function providerGiveIdeaTo(uint256,address[])',
        'function revokeProvider(address)',
        'function setIdeaCreationTax(uint256)',
        'function uri(uint256) view returns (string)',
        'function withdrawMoney(address,uint256)',
    ],
};

export {
    getPKPInfo,

    APP_ENV,
    WALLET_PRIVATE_KEY,
    IDEA_NFT_CONFIG,
    MAX_LIT_ENC_DEC_ATTEMPTS,
    WEAVEDB_CONTRACT_TX_ID,
    NFT_STORAGE_API_KEY,
};