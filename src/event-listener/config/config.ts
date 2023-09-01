import 'dotenv/config';

const MAX_LIT_ENC_DEC_ATTEMPTS = 5;

const APP_ENV: 'development' | 'production' =
    (process.env.APP_ENV as any) || 'development';

const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;

const PKP_KEY = process.env.PKP_KEY;

const IDEA_NFT_CONFIG = {
    gateContractAddress: '0xbb1FF71BEe377322284DdBb843a0563cc70229a6',
    coreContractAddress: '0x558Ed14d87396990a766d906451280391D57fA46',
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
    ]
};

export {
    APP_ENV,
    WALLET_PRIVATE_KEY,
    PKP_KEY,
    IDEA_NFT_CONFIG,
    MAX_LIT_ENC_DEC_ATTEMPTS,
};