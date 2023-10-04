import { ICreateBasicIdea } from '../../interfaces/shared.i';

import {
    ActivModule,
} from '../../modules/activ.module';

export const createIdea = async (
    payload: {
        idea: ICreateBasicIdea,
        network: string,
    }
) => {
    try {
        const {
            idea,
            network,
        } = payload;

        await ActivModule.createIdea({
            ideaObj: idea,
            network: network as any,
        });
    } catch (err) {
        console.log('createIdea (error)', err.message);
    }
};