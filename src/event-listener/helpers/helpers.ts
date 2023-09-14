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

export const wait = (
    time: number,
    type: 'milliseconds' | 'seconds' | 'minutes' | 'hours',
): Promise<void> =>
    new Promise<void>((resolve) => {
        try {
            const timeMilisecondsConvertedObj = {
                milliseconds: time,
                seconds: time * 1000,
                minutes: time * 60000,
                hours: time * 3600000,
            };

            const timeConverted = timeMilisecondsConvertedObj[type];

            const interval = setInterval(() => {
                clearInterval(interval);
                resolve();
            }, timeConverted);

        } catch (err) {
            resolve();
        }
    });

export const getStringSize = (str: string) => {
    const bytes = new Blob([str]).size;
    const kilobytes = bytes / 1024;
    const megabytes = kilobytes / 1024;

    return {
        bytes,
        kilobytes: Number(kilobytes.toFixed(4)),
        megabytes: Number(megabytes.toFixed(4)),
    }
}

export const retryFunctionHelper = async <T>(payload: {
    maxRetries: number,
    retryCallback: (retryIndex: number) => Promise<T>,
    notificationCallback?: (errMsg: string, retryCount: number) => Promise<any>,
    rejectOnMaxRetries?: boolean,
}) => {

    let retryCount = 1;

    // this is the function that will be called to notify the caller of the error
    // using slack or email or whatever instead of throwing an error
    const notify = async (errMsg: string, retryCount: number) => {
        try {
            if (payload?.notificationCallback) {
                await payload.notificationCallback(errMsg, retryCount);
            }
        } catch (err) {
            console.log('retryFunctionHelper [Error notifying]', `${err?.message}. Retry #${retryCount}`);
        }
    }

    try {
        const { maxRetries, retryCallback } = payload;

        while (retryCount <= maxRetries) {
            try {
                const data = await retryCallback(retryCount);

                if (data) {
                    return data as T;
                } else {
                    await notify('No data returned', retryCount);
                }

            } catch (err) {
                await notify(err?.message || 'Unknown error', retryCount);

                // optionally reject on max retries
                if (payload?.rejectOnMaxRetries && retryCount === payload.maxRetries) {
                    throw new Error(err?.message || 'Unknown error');
                }
            }

            if (retryCount < maxRetries) {
                await wait(5, 'seconds');
            }

            retryCount++;
        }

        return null;

    } catch (err) {
        await notify(err?.message || 'Unknown error', retryCount);

        // optionally reject on max retries
        if (payload?.rejectOnMaxRetries && retryCount === payload.maxRetries) {
            throw new Error(err?.message || 'Unknown error');
        }
    }
}