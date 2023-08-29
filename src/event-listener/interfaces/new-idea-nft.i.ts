import { ethers } from "ethers";
export interface INewIdeaNFT {
    creatorAddress: string;
    nftId: number;
    strategyReference: string;
    blockNumber: number;

    contract: ethers.Contract;
    network: string;
};