import 'dotenv/config';

import { expect } from 'chai';

import * as config from '../../src/event-listener/config/config';

import * as fetcher from '../../src/event-listener/core/fetcher';

import { EnvType, ILitActionResult } from '../../src/event-listener/interfaces/shared.i';

import { isNullOrUndefined, getStringSize } from '../../src/event-listener/helpers/helpers';

import { WeaveDBModule } from '../../src/event-listener/modules/weavedb.module';

import { PkpAuthModule } from '../../src/event-listener/modules/pkp-auth.module';

import { OrderCalcPre, OrderCalcPrePortfolio } from '../../src/event-listener/core/fetcher/parts/ig-calculation';

import { PkpCredentialNftModule } from '../../src/event-listener/modules/pkp-credential-nft.module';

import { OrderCalcPortfolio } from '../../src/event-listener/core/fetcher/parts/shared/portfolio-calculation';

describe('Calulate Order Sizes', () => {

    it('Get trigger and calculate the order size for a single idea order', async () => {

        // this is an IG specific calc

        // const chain = 'mumbai';
        const chain = 'polygon';

        // doc Id for our trigger
        const docId = '2fe8c7f04da315d7c8fa55b64a472fe1';

        const pkpInfo = await config.getPKPInfo(chain);
        // console.log('pkpInfo', pkpInfo);

        const authSigh = await PkpAuthModule.getPkpAuthSig(
            chain,
            pkpInfo.pkpPublicKey,
        );

        const data = await WeaveDBModule.getAllData<any>(
            chain,
            {
                type: 'trigger',
            },
            authSigh
        );
        console.log('weave data', data);

        // IG Auth
        const source = 'lit-action';
        // we can use the IG demo - it shouldn't matter
        // but useful to call demo if we are using prod for the calc to stop too many calls
        // const chainForCredentials = 'mumbai';
        // const credentialNftUUID = '0x06765151fcd0b6b89f38c32d4efda1af';
        const chainForCredentials = 'polygon';
        const credentialNftUUID = '0xafc1239741ddf44e08f5c5beb0e98e51';

        const pkpInfoForCredentials = await config.getPKPInfo(chainForCredentials);
        	
        const epic = 'UC.D.PYPLVUS.DAILY.IP';
        // const epic = "SA.D.BABA.DAILY.IP";
        const direction: any = 'Buy';
        const ideaType = "open";  // open, adjust or close

        const credentialInfo = await PkpCredentialNftModule.getFullCredential<{
            username: string;
            password: string;
            apiKey: string;
            environment: string;
            accountId: string;
        }>({
            chain: chainForCredentials,
            credentialNftUUID,
            pkpKey: pkpInfoForCredentials?.pkpPublicKey,
        });
        console.log('post credentialInfo', credentialInfo.decryptedCredential);

        if (credentialInfo.decryptedCredential?.username) {

            // loop through until we have oiu
            for (const i in data) {
                if (i) {
                    if (data[i].docId === docId) {

                        const trigger = data[i];
                        const network = chain;

                        const igCredentials = {
                            username: credentialInfo.decryptedCredential?.username as string,
                            password: credentialInfo.decryptedCredential?.password as string,
                            apiKey: credentialInfo.decryptedCredential?.apiKey as string,
                            accountId: credentialInfo.decryptedCredential?.accountId as string,
                        };
            
                        const pkpAuthSig = await PkpAuthModule.getPkpAuthSig(
                            chain,
                            pkpInfo?.pkpPublicKey,
                        );
                        console.log('post pkpAuthSig', pkpAuthSig);
            
                        const igAuth = await fetcher.ig.authentication(chain, pkpAuthSig, {
                            env: credentialInfo.decryptedCredential?.environment as any,
                            source: 'fetch',
                            credentials: {
                                apiKey:
                                    igCredentials.apiKey,
                                username:
                                    igCredentials.username,
                                password:
                                    igCredentials.password,
                            },
                        });
                        console.log('post igAuth', igAuth);        

                        // call;
                        const calc = await OrderCalcPre(
                            ideaType,
                            network,
                            pkpAuthSig,
                            {
                                env: credentialInfo.decryptedCredential?.environment as any,
                                source,
                                payload: {
                                    auth: {
                                        accountId: igCredentials.accountId,
                                        activeAccountSessionToken: igAuth?.activeAccountSessionToken,
                                        clientSessionToken: igAuth?.clientSessionToken,
                                        apiKey: igCredentials.apiKey,    
                                    },
                                    direction,
                                    epic,
                                },
                                trigger,
                            }
                        );
                        console.log('OrderCalcPre data in test', calc);

                        console.log('OrderCalcPre potential', calc.order.potential);
                        console.log('OrderCalcPre final', calc.order.final);

                    }
                }
            }
        }


        expect(isNullOrUndefined(data)).to.be.false;

    }).timeout(50000);


    xit('Get trigger and calculate the orders for a portfolio rebalance', async () => {

        // this is an IG specific calc

        // const chain = 'mumbai';
        const chain = 'polygon';

        // doc Id for our trigger
        const docId = '2fe8c7f04da315d7c8fa55b64a472fe1';

        const pkpInfo = await config.getPKPInfo(chain);
        // console.log('pkpInfo', pkpInfo);

        const authSigh = await PkpAuthModule.getPkpAuthSig(
            chain,
            pkpInfo.pkpPublicKey,
        );

        const data = await WeaveDBModule.getAllData<any>(
            chain,
            {
                type: 'trigger',
            },
            authSigh
        );
        console.log('weave data', data);

        // IG Auth
        const source = 'lit-action';
        // we can use the IG demo - it shouldn't matter
        // but useful to call demo if we are using prod for the calc to stop too many calls
        // const chainForCredentials = 'mumbai';
        // const credentialNftUUID = '0x06765151fcd0b6b89f38c32d4efda1af';
        const chainForCredentials = 'polygon';
        const credentialNftUUID = '0xafc1239741ddf44e08f5c5beb0e98e51';

        const pkpInfoForCredentials = await config.getPKPInfo(chainForCredentials);
        	
        const credentialInfo = await PkpCredentialNftModule.getFullCredential<{
            username: string;
            password: string;
            apiKey: string;
            environment: string;
            accountId: string;
        }>({
            chain: chainForCredentials,
            credentialNftUUID,
            pkpKey: pkpInfoForCredentials?.pkpPublicKey,
        });
        console.log('post credentialInfo', credentialInfo.decryptedCredential);

        if (credentialInfo.decryptedCredential?.username) {

            // loop through until we have oiu
            for (const i in data) {
                if (i) {
                    if (data[i].docId === docId) {

                        const trigger = data[i];
                        const network = chain;

                        const igCredentials = {
                            username: credentialInfo.decryptedCredential?.username as string,
                            password: credentialInfo.decryptedCredential?.password as string,
                            apiKey: credentialInfo.decryptedCredential?.apiKey as string,
                            accountId: credentialInfo.decryptedCredential?.accountId as string,
                        };
            
                        const pkpAuthSig = await PkpAuthModule.getPkpAuthSig(
                            chain,
                            pkpInfo?.pkpPublicKey,
                        );
                        console.log('post pkpAuthSig', pkpAuthSig);
            
                        const igAuth = await fetcher.ig.authentication(chain, pkpAuthSig, {
                            env: credentialInfo.decryptedCredential?.environment as any,
                            source: 'fetch',
                            credentials: {
                                apiKey:
                                    igCredentials.apiKey,
                                username:
                                    igCredentials.username,
                                password:
                                    igCredentials.password,
                            },
                        });
                        console.log('post igAuth', igAuth);        

                        // call;
                        const calc = await OrderCalcPrePortfolio(
                            network,
                            pkpAuthSig,
                            {
                                env: credentialInfo.decryptedCredential?.environment as any,
                                source,
                                payload: {
                                    auth: {
                                        accountId: igCredentials.accountId,
                                        activeAccountSessionToken: igAuth?.activeAccountSessionToken,
                                        clientSessionToken: igAuth?.clientSessionToken,
                                        apiKey: igCredentials.apiKey,    
                                    },
                                    portfolioIntended:[],
                                },
                                trigger,
                            }
                        );
                        console.log('OrderCalcPrePortfolio data in test', calc);

                        // console.log('OrderCalcPre potential', calc.order.potential);
                        // console.log('OrderCalcPre final', calc.order.final);

                    }
                }
            }
        }


        expect(isNullOrUndefined(data)).to.be.false;

    }).timeout(50000);

    xit('Calculate rebalance - check for new positions', async () => {

        const currentPortfolio = [
            {
                ticker: 'MSFT',
                allocation: 50,
                quantity: 5,
                // ticker: string,
                // expiry: string,
                // name: string,
                // price: {
                //   ask: number,
                //   bid: number,
                // },
                // minQty: number,
                // fractional: boolean,
                // decimals: number,            
            },
            {
                ticker: 'AAPL',
                allocation: 50,
                quantity: 5,
            },
        ];

        const intendedPortfolio = [
            {
                ticker: 'MSFT',
                allocation: 10,
            },
            {
                ticker: 'CRM',
                allocation: 10,
            },
            {
                ticker: 'ASML',
                allocation: 50,
            },
        ];

        const settings = {
            leverage: 1,
            slippage: 2,
        };

        const portfolio = {
              intended: intendedPortfolio,
              current: currentPortfolio,
        };

        const account = {
            balance: 1000,
        };

        const data = OrderCalcPortfolio.functions.calculatePortfolio(settings, portfolio, account);
        console.log('data', data);

        // expect(data.new.length.to.be.greater.zero);
        // expect(data.remove.length.to.be.greater.zero);
        expect(isNullOrUndefined(data)).to.be.false;

    }).timeout(50000);

    xit('Calculate rebalance - decrease, increase or keep a position the same', async () => {

        const currentPortfolio = [
            {
                ticker: 'MSFT',
                allocation: 10,
                quantity: 5,
            },
            {
                ticker: 'AAPL',
                allocation: 10,
                quantity: 5,
            },
            {
                ticker: 'CRM',
                allocation: 10,
                quantity: 5,
            },
        ];

        const intendedPortfolio = [
            {
                ticker: 'MSFT',
                allocation: 5,
            },
            {
                ticker: 'AAPL',
                allocation: 10,
            },
            {
                ticker: 'CRM',
                allocation: 15,
            },
        ];

        const settings = {
            leverage: 1,
            slippage: 2,
        };

        const portfolio = {
              intended: intendedPortfolio,
              current: currentPortfolio,
        };

        const account = {
            balance: 1000,
        };

        const data = OrderCalcPortfolio.functions.calculatePortfolio(settings, portfolio, account);
        console.log('data', data);

        // expect(data.decrease.length.to.be.greater.zero);
        // expect(data.increase.length.to.be.greater.zero);
        // expect(data.same.length.to.be.greater.zero);
        // expect(data.new.length.to.be.equal.zero);
        // expect(data.remove.length.to.be.equal.zero);
        expect(isNullOrUndefined(data)).to.be.false;

    }).timeout(50000);

    xit('Calculate rebalance - duplicates check', async () => {

        const currentPortfolio = [
            {
                ticker: 'MSFT',
                allocation: 10,
                quantity: 5,
            },
            {
                ticker: 'AAPL',
                allocation: 10,
                quantity: 5,
            },
            {
                ticker: 'CRM',
                allocation: 10,
                quantity: 5,
            },
        ];

        const intendedPortfolio = [
            {
                ticker: 'MSFT',
                allocation: 5,
            },
            {
                ticker: 'MSFT',
                allocation: 10,
            },
            {
                ticker: 'CRM',
                allocation: 15,
            },
        ];

        const settings = {
            leverage: 1,
            slippage: 2,
        };

        const portfolio = {
              intended: intendedPortfolio,
              current: currentPortfolio,
        };

        const account = {
            balance: 1000,
        };

        const data = OrderCalcPortfolio.functions.calculatePortfolio(settings, portfolio, account);
        console.log('data', data);

        expect(isNullOrUndefined(data)).to.be.true;

    }).timeout(50000);

});
