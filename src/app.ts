import { ethers } from "ethers";

(async function main() {
    try {

        const rpcUrl = 'https://rpc-mumbai.maticvigil.com';

        const abi = [

        ];

        const contractAddress = '';

        const provider =
            new ethers.providers.JsonRpcProvider(rpcUrl);

        const contract = new ethers.Contract(contractAddress, abi, provider);

        console.log('listening...');

        contract.on("xxx", () => {

        });

    } catch (error) {
        console.error(error);
    }
})();