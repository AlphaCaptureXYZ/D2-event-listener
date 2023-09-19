import 'isomorphic-fetch';

import * as config from '../config/config';

import { loop } from '../helpers/helpers';

const apiUrl = 'https://api.nft.storage';

const add = async (
    metadata: string,
): Promise<{
    cid: string
}> => {
    const request = await fetch(`${apiUrl}/upload`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${config.NFT_STORAGE_API_KEY}`,
        },
        body: metadata,
    });

    const response = await request.json();
    const cid = response?.value?.cid || null;

    return {
        cid,
    }
}

const retrieve = async (
    payload: {
        cid: string,
        proxy?: boolean,
    },
): Promise<string> => {

    const {
        cid,
        proxy,
    } = payload;

    let result: any = null;

    const proxyUrl = (id: string) => `https://${id}.ipfs.nftstorage.link`;
    const ipftUrl = (id: string) => `https://ipfs.io/ipfs/${id}`;

    let url = proxy ? proxyUrl(cid) : ipftUrl(cid);

    result = await fetch(url);

    if (result?.status === 200) {
        const jsonContent = await result.text();
        result = jsonContent;
    } else {
        await loop(
            async () => {
                const jsonContent = await result.text();
                result = jsonContent;
            },
            async () => {
                let isPassed = false

                try {
                    result = await fetch(url);

                    if (result.status === 200) {
                        isPassed = true;
                    }
                } catch (e: any) {
                    isPassed = false;
                }

                return isPassed;
            },
            {
                loopTimeInMs: 10000,
                limitTimeSecond: 240,
            },
            async (err: any) => {
                console.log(`NftStorageModule (get) [${cid}]`, err?.message);
            },
        )
    }

    return result;
}

export const NftStorageModule = {
    add,
    retrieve,
}