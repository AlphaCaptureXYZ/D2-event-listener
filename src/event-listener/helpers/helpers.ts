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