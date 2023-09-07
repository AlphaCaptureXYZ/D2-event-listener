import { ethers } from 'ethers';

import * as config from '../config/config';

export const getCurrentWalletAddress = () => {
    const privateKey = config.WALLET_PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey);
    const address = wallet.address;
    return address.toLowerCase();
}

export const getRpcUrlByNetwork = (network: string) => {
    const rpcUrlByNetwork = {
        mumbai: 'https://polygon-mumbai.infura.io/v3/4458cf4d1689497b9a38b1d6bbf05e78',
    };

    const rpcUrl = rpcUrlByNetwork[network] || null;

    if (!rpcUrl) throw new Error(`Network not supported: ${network}`);

    return rpcUrl;
}

export const getBalance = async (payload: {
    network: string;
    walletAddress: string;
}) => {

    let response = {
        balance: 0,
        base: null,
    }

    const {
        network,
        walletAddress,
    } = payload;

    const rpcUrl = getRpcUrlByNetwork(network);
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const balance = await provider.getBalance(walletAddress);

    const wei = Number(balance);

    // convert wei to MATIC
    const matic = wei / 1000000000000000000;

    // convert wei to ETH
    const eth = wei / 1000000000000000000;

    if ([
        'mumbai',
    ].includes(network)) {
        response = {
            balance: matic,
            base: 'MATIC',
        }
    };

    if ([
        'ethereum',
    ].includes(network)) {
        response = {
            balance: eth,
            base: 'ETH',
        }
    };

    return response;
}