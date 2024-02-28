import * as config from '../../../event-listener/config/config';

import { WeaveDBModule } from '../../../event-listener/modules/weavedb.module';

import { PkpAuthModule } from '../../../event-listener/modules/pkp-auth.module';

export const weaveTriggers = async <T>() => {

    const chain = config.WEAVEDB_CHAIN;

    const pkpInfo = await config.getPKPInfo(chain);

    const authSigh = await PkpAuthModule.getPkpAuthSig(
        chain,
        pkpInfo.pkpPublicKey,
    );

    const weaveData = await WeaveDBModule.getAllData<any>(
        chain,
        {
            type: 'trigger',
        },
        authSigh
    );

    return weaveData;
}
