import 'dotenv/config';

import { expect } from 'chai';
import { isNullOrUndefined } from '../../src/event-listener/helpers/helpers';

import { LitModule } from '../../src/event-listener/modules/lit.module';

describe('Lit Action Cases', () => {

    xit('Retrive one basic/simple message like "Hello World"', async () => {

        const message = 'Hello World';

        const litActionCode = `
            const go = async () => {

                Lit.Actions.setResponse({response: JSON.stringify(message)});
            }

            go();
        `;

        const listActionCodeParams = {
            message,
        };

        const litActionResponse = await LitModule().runLitAction({
            chain: 'mumbai',
            litActionCode,
            listActionCodeParams,
            nodes: 10,
            showLogs: false,
        });

        expect(isNullOrUndefined(litActionResponse)).to.be.false;
        expect(litActionResponse).to.be.an('object');
        expect(litActionResponse).to.have.property('response');
        expect(litActionResponse.response).to.be.equal(message);

    }).timeout(50000);

    it('Credential NFT smart contract request using PKP key to check the access', async () => {

        const litActionCode = `
            const go = async () => {
      
                const rpcUrl = 
                    'https://polygon-mumbai.infura.io/v3/4458cf4d1689497b9a38b1d6bbf05e78';

                const provider =
                    new ethers.providers.JsonRpcProvider(rpcUrl);

                const contractAddress = '0x9056609c1dc0D925EA79f019669a15b8b080f833';

                const abi = [
                    "constructor()",
                    "event ApprovalForAll(address indexed,address indexed,bool)",
                    "event CredentialCreated(uint256,bytes16,address)",
                    "event Initialized(uint8)",
                    "event TransferBatch(address indexed,address indexed,address indexed,uint256[],uint256[])",
                    "event TransferSingle(address indexed,address indexed,address indexed,uint256,uint256)",
                    "event URI(string,uint256 indexed)",
                    "function balanceOf(address,uint256) view returns (uint256)",
                    "function balanceOfBatch(address[],uint256[]) view returns (uint256[])",
                    "function createCredential(string,string,string,string,address)",
                    "function generateUUID() view returns (bytes16)",
                    "function getCredentialById(uint256) view returns (tuple(bytes16,uint256,string,string,string,string,address))",
                    "function getMyCredentials() view returns (tuple(bytes16,uint256,string,string,string,string,address)[])",
                    "function getMyCredentialsTotal() view returns (uint256)",
                    "function getTokenId(bytes16) view returns (uint256)",
                    "function isApprovedForAll(address,address) view returns (bool)",
                    "function safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)",
                    "function safeTransferFrom(address,address,uint256,uint256,bytes)",
                    "function sayHello(address) view returns (string)",
                    "function setApprovalForAll(address,bool)",
                    "function supportsInterface(bytes4) view returns (bool)",
                    "function uri(uint256) view returns (string)"
                ];
        
                const contract = new ethers.Contract(
                    contractAddress,
                    abi,
                    provider,
                );
        
                const id = await contract.getTokenId(credentialNftUUID);

                console.log('id', Number(id));

                Lit.Actions.setResponse({response: JSON.stringify({})});
            }

            go();
        `;

        const listActionCodeParams = {
            credentialNftUUID: '0x7a47e50fef3a33db37fb8a2bca5b4a1c'
        };

        const litActionResponse = await LitModule().runLitAction({
            chain: 'mumbai',
            litActionCode,
            listActionCodeParams,
            nodes: 1,
            showLogs: true,
            pkpKey: process.env.PKP_KEY,
        });

        expect(isNullOrUndefined(litActionResponse)).to.be.false;
        // expect(litActionResponse).to.be.an('object');
        // expect(litActionResponse).to.have.property('response');
        // expect(litActionResponse.response).to.be.equal(message);

    }).timeout(50000);

});
