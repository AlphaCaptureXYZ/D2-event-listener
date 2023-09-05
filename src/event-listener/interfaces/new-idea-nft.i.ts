import { ethers } from "ethers";
export interface INewIdeaNFT {
    blockNumber: number;
    contract: ethers.Contract;
    network: string;
    rpcUrl: string;
};