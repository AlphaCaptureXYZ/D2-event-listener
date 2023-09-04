import { ethers } from 'ethers';

export const isNullOrUndefined = (value: any) => {
    const checkValue = [
        undefined,
        null,
        'undefined',
        'UNDEFINED',
        'Undefined',
        'null',
        'NULL',
        'Null',
        'NONE',
        'None',
        'none',
    ]?.includes(value)
        ? undefined
        : value;
    const check = checkValue === undefined || null ? true : false;
    return check;
}

export const getBoolean = (value: any): boolean => {
    const data = {
        true: true,
        false: false,
        1: true,
        0: false,
        undefined: false,
        null: false,
    };
    const response = (data as any)[value];
    return response;
}

export const loop = (
    next: () => Promise<void>,
    validator: () => Promise<boolean>,
    settings?: {
        loopTimeInMs: number
        limitTimeSecond: number
    },
    errorCallback?: (error: string) => Promise<void>,
) =>
    new Promise<void>(async (resolve, reject) => {
        try {
            // default settings
            if (!settings?.loopTimeInMs || settings?.loopTimeInMs <= 0) {
                //@ts-ignore
                settings.loopTimeInMs = 5000
            }

            if (!settings?.limitTimeSecond || settings?.limitTimeSecond <= 0) {
                //@ts-ignore
                settings.limitTimeSecond = 60
            }

            const loopTimeInMs: any = settings?.loopTimeInMs
            const limitTimeSecond: any = settings?.limitTimeSecond

            //@ts-ignore
            const loopTimeInMsToSecond = Math.floor((loopTimeInMs / 1000) % 60)

            // check
            //@ts-ignore
            if (loopTimeInMsToSecond >= limitTimeSecond) {
                throw new Error('The loop can not be greater than limit.')
            }

            const startDate = new Date()

            let interval: any = null

            interval = setInterval(async () => {
                try {
                    const status = await validator()
                    const endDate = new Date()
                    const seconds =
                        (endDate.getTime() - startDate.getTime()) / 1000

                    // If we exceed the standby limit, we cut the process
                    if (seconds >= limitTimeSecond && !status) {
                        clearInterval(interval)

                        if (errorCallback) {
                            await errorCallback('Time limit exceeded')
                        }

                        throw new Error('Time limit exceeded')
                    }

                    // if validator is completed!
                    if (status) {
                        clearInterval(interval)
                        interval = null
                        await next()
                        resolve()
                    }
                } catch (err) {
                    reject(err)
                }
            }, loopTimeInMs)
        } catch (err: any) {
            if (errorCallback) {
                await errorCallback(err?.message)
            }
            reject(err)
        }
    });

export const rest = async (delay: number) => {
    await new Promise((resolve) => setTimeout(resolve, delay))
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