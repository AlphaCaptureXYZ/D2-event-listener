import * as CryptoJS from 'crypto-js';

export const buildSignature = (
    secret: string,
    data: string,
) => {
    return CryptoJS.HmacSHA256(data, secret).toString(CryptoJS.enc.Hex);
}

export const objectToQueryString = (obj) => {
    return Object.keys(obj)
        .map((key) => encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]))
        .join('&');
};

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
        kilobytes: Number(kilobytes.toFixed(5)),
        megabytes: Number(megabytes.toFixed(5)),
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


/**
 * Adjusts a number to the specified digit.
 *
 * @param {"round" | "floor" | "ceil"} type The type of adjustment.
 * @param {number} value The number.
 * @param {number} exp The exponent (the 10 logarithm of the adjustment base).
 * @returns {number} The adjusted value.
 */
export function decimalAdjust(type: string, value: number, exp: number) {
    type = String(type);
    if (!["round", "floor", "ceil"].includes(type)) {
      throw new TypeError(
        "The type of decimal adjustment must be one of 'round', 'floor', or 'ceil'.",
      );
    }
    exp = Number(exp);
    value = Number(value);
    if (exp % 1 !== 0 || Number.isNaN(value)) {
      return NaN;
    } else if (exp === 0) {
      switch(type) {
        case 'round': 
          return Math.round(value);
        case 'floor': 
          return Math.floor(value);
        case 'ceil': 
          return Math.ceil(value);
      }
    }
    const [magnitude, exponent = 0] = value.toString().split("e");
    let adjustedValue = 0;
    // const adjustedValue = Math[type](`${magnitude}e${exponent - exp}`);
  
    switch(type) {
      case 'round': 
        adjustedValue = Math.round(Number(`${magnitude}e${Number(exponent) - exp}`));
        break;
      case 'floor': 
        adjustedValue = Math.floor(Number(`${magnitude}e${Number(exponent) - exp}`));
        break;
      case 'ceil': 
        adjustedValue = Math.ceil(Number(`${magnitude}e${Number(exponent) - exp}`));
        break;
  }
  
    // Shift back
    const [newMagnitude, newExponent = 0] = adjustedValue.toString().split("e");
    return Number(`${newMagnitude}e${+newExponent + exp}`);
  }
  

export function countDecimals(value: number): number {
	if(Math.floor(value) === value) return 0;
	return value.toString().split(".")[1].length || 0;	
}
 
export const currencyInfo = {
    GBP: {
      symbol: '£',
    },
    USD: {
      symbol: '$',
    },
    EUR: {
      symbol: '€',
    },
  }