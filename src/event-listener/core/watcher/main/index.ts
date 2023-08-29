//@ts-ignore
import * as PubSub from 'pubsub-js';

import { WatcherType } from '../shared/watcher-types';
import { IWatcherPayload } from '../shared/watcher-payload.i';
import { selector } from '..';

export type WatcherKeyType<T> = { [key in WatcherType]: T };

const WATCHER_SELECTOR = async <T>(payload: IWatcherPayload<T>) => {
  try {
    for (const func of ((selector as any)[payload?.type])) {
      if (func) {
        delete (payload?.payload as any)?.watcherType;
        await func(payload);
      }
    }
  } catch (err: any) {
    console.log('[watcher] WATCHER_SELECTOR (ERROR)', err.message);
  }
};

(async function main() {
  try {
    const subscriber = async (type: string, payload: any) => {
      await WATCHER_SELECTOR({
        type: payload?.watcherType,
        payload,
      });
    };
    PubSub.subscribe('watcher', subscriber);
  } catch (err: any) {
    console.log('[watcher] main instance (ERROR)', err.message);
  }
})();
