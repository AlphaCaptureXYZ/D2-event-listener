import 'dotenv/config';

import './main';

import { WatcherKeyType } from './main';

// ======= CALL YOUR FUNCTION =======
import {
  newIdeaNFT,
} from './watcher-funcs';
// ======= CALL YOUR FUNCTION =======

/*
 ===== GETTING STARTED ======
  1. select/add your specific type here: watcher\shared\watcher-types.ts
  2. add your type and call your function inside the array and done :)
  3. call --> WatcherPubSub({your_tipe}, {your_data})
  4. done! instant watcher/pub-sub works
*/
export const selector: WatcherKeyType<any[]> = {
  'new-idea-nft': [
    newIdeaNFT,
  ]
};