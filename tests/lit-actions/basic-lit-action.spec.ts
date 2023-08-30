import 'dotenv/config';

import { expect } from 'chai';
import { isNullOrUndefined } from '../../src/event-listener/helpers/helpers';

import { LitModule } from '../../src/event-listener/modules/lit.module';

describe('Lit Action Cases', () => {

    it('Retrive one basic/simple message like "Hello World"', async () => {

        const message = 'Hello World';

        const litActionCode = `
            const go = async () => {

                Lit.Actions.setResponse({response: JSON.stringify(message)});
            }

            go();
        `;

        const listActionCodeParams = {
            message,
        };

        const litActionResponse = await LitModule().runLitAction({
            chain: 'mumbai',
            litActionCode,
            listActionCodeParams,
            nodes: 10,
            showLogs: false,
        });

        expect(isNullOrUndefined(litActionResponse)).to.be.false;
        expect(litActionResponse).to.be.an('object');
        expect(litActionResponse).to.have.property('response');
        expect(litActionResponse.response).to.be.equal(message);

    }).timeout(50000);

});
