//@ts-ignore
import * as PubSub from 'pubsub-js';

import { WatcherType } from '../shared/watcher-types';

export const WatcherPubSub = async <T>(type: WatcherType, data: T) => {
  try {
    await PubSub.publish('watcher', {
      ...data,
      watcherType: type,
    });
  } catch (err: any) {
    console.log('[watcher] WatcherPubSub (ERROR)', err.message);
  }
}