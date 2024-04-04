import 'dotenv/config';

import { expect } from 'chai';

import * as config from '../../src/event-listener/config/config';

import * as fetcher from '../../src/event-listener/core/fetcher';

import { EnvType, ILitActionResult } from '../../src/event-listener/interfaces/shared.i';

import { isNullOrUndefined, getStringSize } from '../../src/event-listener/helpers/helpers';

import { WeaveDBModule } from '../../src/event-listener/modules/weavedb.module';

import { PkpAuthModule } from '../../src/event-listener/modules/pkp-auth.module';

import { OrderCalcPre, OrderCalcPrePortfolio, OrderPortfolioRebalance } from '../../src/event-listener/core/fetcher/parts/ig-calculation';

import { PkpCredentialNftModule } from '../../src/event-listener/modules/pkp-credential-nft.module';

import { OrderCalcPortfolio } from '../../src/event-listener/core/fetcher/parts/shared/portfolio-calculation';

describe('Calulate Reblance', () => {

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


    it('Calculate rebalance - calculate order', async () => {

        const calcData = {
            account: {
              balance: 11917.38,
              leverage: 10,
              leverageBalance: 119173.80,
              currencySymbol: '£',
              currencyCode: 'GBP'
            },
            portfolio: {
              net: [
                {
                  ticker: 'SA.D.BABA.DAILY.IP',
                  size: 1.51,
                  direction: 'Long',
                  bid: 7606,
                  offer: 7616,
                  value: 11500.16
                },
                {
                  ticker: 'SA.D.BA.DAILY.IP',
                  size: 0.27,
                  direction: 'Long',
                  bid: 18411,
                  offer: 18429,
                  value: 4975.83
                },
                {
                  ticker: 'UB.D.JDUS.DAILY.IP',
                  size: 3.16,
                  direction: 'Long',
                  bid: 2749,
                  offer: 2762,
                  value: 8727.92
                },
                {
                  ticker: 'IX.D.FTSE.DAILY.IP',
                  size: 1,
                  direction: 'Long',
                  bid: 7755.2,
                  offer: 7757.2,
                  value: 7757.2
                },
                {
                  ticker: 'SG.D.SHOPUS.DAILY.IP',
                  size: 0.71,
                  direction: 'Long',
                  bid: 7632,
                  offer: 7640,
                  value: 5424.4
                },
              ],
              raw: [
                {
                  deal: 'DIAAAALTK7M6TAY',
                  ticker: 'SA.D.BABA.DAILY.IP',
                  size: 0.08,
                  direction: 'Long',
                  bid: 7606,
                  offer: 7616,
                  value: 609.28
                },
                {
                  deal: 'DIAAAALZMRD36AQ',
                  ticker: 'SA.D.BABA.DAILY.IP',
                  size: 0.08,
                  direction: 'Long',
                  bid: 7606,
                  offer: 7616,
                  value: 609.28
                },
                {
                  deal: 'DIAAAAL3T2RGRAZ',
                  ticker: 'SA.D.BABA.DAILY.IP',
                  size: 0.08,
                  direction: 'Long',
                  bid: 7606,
                  offer: 7616,
                  value: 609.28
                },
                {
                  deal: 'DIAAAAMASRLVGA5',
                  ticker: 'SA.D.BABA.DAILY.IP',
                  size: 0.08,
                  direction: 'Long',
                  bid: 7606,
                  offer: 7616,
                  value: 609.28
                },
                {
                  deal: 'DIAAAAME4EAXPAM',
                  ticker: 'SA.D.BA.DAILY.IP',
                  size: 0.15,
                  direction: 'Long',
                  bid: 18411,
                  offer: 18429,
                  value: 2764.35
                },
                {
                  deal: 'DIAAAAMFZ2LZYA9',
                  ticker: 'SA.D.BABA.DAILY.IP',
                  size: 0.08,
                  direction: 'Long',
                  bid: 7606,
                  offer: 7616,
                  value: 609.28
                },
                {
                  deal: 'DIAAAAMK8S5X8AN',
                  ticker: 'SA.D.BABA.DAILY.IP',
                  size: 0.08,
                  direction: 'Long',
                  bid: 7606,
                  offer: 7616,
                  value: 609.28
                },
                {
                  deal: 'DIAAAAMLLPNW8AW',
                  ticker: 'UB.D.JDUS.DAILY.IP',
                  size: 2.16,
                  direction: 'Long',
                  bid: 2749,
                  offer: 2762,
                  value: 5965.92
                },
                {
                  deal: 'DIAAAAMMKJCKTBD',
                  ticker: 'SA.D.BA.DAILY.IP',
                  size: 0.12,
                  direction: 'Long',
                  bid: 18411,
                  offer: 18429,
                  value: 2211.48
                },
                {
                  deal: 'DIAAAAMMSY9DJAJ',
                  ticker: 'SA.D.BABA.DAILY.IP',
                  size: 0.74,
                  direction: 'Long',
                  bid: 7606,
                  offer: 7616,
                  value: 5635.84
                },
                {
                  deal: 'DIAAAAMMYA438A3',
                  ticker: 'UB.D.JDUS.DAILY.IP',
                  size: 1,
                  direction: 'Long',
                  bid: 2749,
                  offer: 2762,
                  value: 2762
                },
                {
                  deal: 'DIAAAAMM49RCRAN',
                  ticker: 'IX.D.FTSE.DAILY.IP',
                  size: 1,
                  direction: 'Long',
                  bid: 7755.2,
                  offer: 7757.2,
                  value: 7757.2
                },
                {
                  deal: 'DIAAAAMM6YS64AJ',
                  ticker: 'SG.D.SHOPUS.DAILY.IP',
                  size: 0.71,
                  direction: 'Long',
                  bid: 7632,
                  offer: 7640,
                  value: 5424.4
                },
                {
                  deal: 'DIAAAAMND843UBB',
                  ticker: 'SA.D.BABA.DAILY.IP',
                  size: 0.29,
                  direction: 'Long',
                  bid: 7606,
                  offer: 7616,
                  value: 2208.64
                },
                {
                  deal: 'DIAAAAMNMKZT3A3',
                  ticker: 'IX.D.NASDAQ.CASH.IP',
                  size: 1,
                  direction: 'Short',
                  bid: 18214.9,
                  offer: 18216.9,
                  value: 18214.9
                }
              ]
            },
            portfolioStats: {
              long: 38385.509999999995,
              short: 0,
              net: 38385.509999999995,
              remaining: 8253.229999999994
            }
          };

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
            {
                ticker: 'SA.D.BABA.DAILY.IP',
                allocation: 15,
            },
        ];

        const settings = {
            leverage: calcData.account.leverage,
            slippage: 2,
        };

        const currentPortfolio = calcData.portfolio.net || [];

        const portfolio = {
            intended: intendedPortfolio,
            current: currentPortfolio,
        };

        const account = {
            balance: calcData.account.balance || 0,
        };

        const portfolioOrders = OrderCalcPortfolio.functions.calculatePortfolio(settings, portfolio, account);
        // console.log('data', orderData);
        // console.log('increase data', orderData.increase);

        // and now the IG specific
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
        // console.log('weave data', data);

        // IG Auth
        const source = 'testing';
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
        // console.log('post credentialInfo', credentialInfo.decryptedCredential);

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
                        // console.log('post pkpAuthSig', pkpAuthSig);
            
                        const igAuth = await fetcher.ig.authentication(chain, pkpAuthSig, {
                            env: credentialInfo.decryptedCredential?.environment as any,
                            source: 'fetch',
                            credentials: {
                                accountId:
                                    igCredentials.accountId,
                                apiKey:
                                    igCredentials.apiKey,
                                username:
                                    igCredentials.username,
                                password:
                                    igCredentials.password,
                            },
                        });
                        // console.log('post igAuth', igAuth);        

                        // call;
                        await OrderPortfolioRebalance(
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
                                    portfolioRebalance: portfolioOrders,
                                },
                                trigger,
                            }
                        );
                    }
                }
            }
        }        
      
        // expect(isNullOrUndefined(data)).to.be.true;

    }).timeout(50000);

    xit('Calculate rebalance - get prices from IG positions', async () => {

        [
            {
            position: {
                contractSize: 1,
                createdDate: '2023/08/10 14:45:02:000',
                dealId: 'DIAAAALTK7M6TAY',
                dealSize: 0.08,
                direction: 'BUY',
                limitLevel: null,
                openLevel: 10014,
                currency: 'GBP',
                controlledRisk: false,
                stopLevel: null,
                trailingStep: null,
                trailingStopDistance: null,
                limitedRiskPremium: null
            },
            market: {
                instrumentName: 'Alibaba Group Holding Ltd (All Sessions)',
                expiry: 'DFB',
                epic: 'SA.D.BABA.DAILY.IP',
                instrumentType: 'SHARES',
                lotSize: 1,
                high: 7681,
                low: 7482,
                percentageChange: 2.51,
                netChange: 188,
                bid: 7669,
                offer: 7679,
                updateTime: '21:34:12',
                delayTime: 0,
                streamingPricesAvailable: false,
                marketStatus: 'TRADEABLE',
                scalingFactor: 1
            }
            },
            {
            position: {
                contractSize: 1,
                createdDate: '2023/09/27 18:45:30:000',
                dealId: 'DIAAAALZMRD36AQ',
                dealSize: 0.08,
                direction: 'BUY',
                limitLevel: null,
                openLevel: 8563,
                currency: 'GBP',
                controlledRisk: false,
                stopLevel: null,
                trailingStep: null,
                trailingStopDistance: null,
                limitedRiskPremium: null
            },
            market: {
                instrumentName: 'Alibaba Group Holding Ltd (All Sessions)',
                expiry: 'DFB',
                epic: 'SA.D.BABA.DAILY.IP',
                instrumentType: 'SHARES',
                lotSize: 1,
                high: 7681,
                low: 7482,
                percentageChange: 2.51,
                netChange: 188,
                bid: 7669,
                offer: 7679,
                updateTime: '21:34:12',
                delayTime: 0,
                streamingPricesAvailable: false,
                marketStatus: 'TRADEABLE',
                scalingFactor: 1
            }
            },
            {
            position: {
                contractSize: 1,
                createdDate: '2023/10/12 21:49:47:000',
                dealId: 'DIAAAAL3T2RGRAZ',
                dealSize: 0.08,
                direction: 'BUY',
                limitLevel: null,
                openLevel: 8453,
                currency: 'GBP',
                controlledRisk: false,
                stopLevel: null,
                trailingStep: null,
                trailingStopDistance: null,
                limitedRiskPremium: null
            },
            market: {
                instrumentName: 'Alibaba Group Holding Ltd (All Sessions)',
                expiry: 'DFB',
                epic: 'SA.D.BABA.DAILY.IP',
                instrumentType: 'SHARES',
                lotSize: 1,
                high: 7681,
                low: 7482,
                percentageChange: 2.51,
                netChange: 188,
                bid: 7669,
                offer: 7679,
                updateTime: '21:34:12',
                delayTime: 0,
                streamingPricesAvailable: false,
                marketStatus: 'TRADEABLE',
                scalingFactor: 1
            }
            },
            {
            position: {
                contractSize: 1,
                createdDate: '2023/12/06 14:38:06:000',
                dealId: 'DIAAAAMASRLVGA5',
                dealSize: 0.08,
                direction: 'BUY',
                limitLevel: null,
                openLevel: 7212,
                currency: 'GBP',
                controlledRisk: false,
                stopLevel: null,
                trailingStep: null,
                trailingStopDistance: null,
                limitedRiskPremium: null
            },
            market: {
                instrumentName: 'Alibaba Group Holding Ltd (All Sessions)',
                expiry: 'DFB',
                epic: 'SA.D.BABA.DAILY.IP',
                instrumentType: 'SHARES',
                lotSize: 1,
                high: 7681,
                low: 7482,
                percentageChange: 2.51,
                netChange: 188,
                bid: 7669,
                offer: 7679,
                updateTime: '21:34:12',
                delayTime: 0,
                streamingPricesAvailable: false,
                marketStatus: 'TRADEABLE',
                scalingFactor: 1
            }
            },
            {
            position: {
                contractSize: 1,
                createdDate: '2024/01/12 14:46:23:000',
                dealId: 'DIAAAAME4EAXPAM',
                dealSize: 0.15,
                direction: 'BUY',
                limitLevel: null,
                openLevel: 21978,
                currency: 'GBP',
                controlledRisk: false,
                stopLevel: null,
                trailingStep: null,
                trailingStopDistance: null,
                limitedRiskPremium: null
            },
            market: {
                instrumentName: 'Boeing Co (All Sessions)',
                expiry: 'DFB',
                epic: 'SA.D.BA.DAILY.IP',
                instrumentType: 'SHARES',
                lotSize: 1,
                high: 25342.4,
                low: 18312,
                percentageChange: -4.31,
                netChange: -829,
                bid: 18411,
                offer: 18426,
                updateTime: '21:33:50',
                delayTime: 0,
                streamingPricesAvailable: false,
                marketStatus: 'TRADEABLE',
                scalingFactor: 1
            }
            },
            {
            position: {
                contractSize: 1,
                createdDate: '2024/01/19 16:25:09:000',
                dealId: 'DIAAAAMFZ2LZYA9',
                dealSize: 0.08,
                direction: 'BUY',
                limitLevel: null,
                openLevel: 6757,
                currency: 'GBP',
                controlledRisk: false,
                stopLevel: null,
                trailingStep: null,
                trailingStopDistance: null,
                limitedRiskPremium: null
            },
            market: {
                instrumentName: 'Alibaba Group Holding Ltd (All Sessions)',
                expiry: 'DFB',
                epic: 'SA.D.BABA.DAILY.IP',
                instrumentType: 'SHARES',
                lotSize: 1,
                high: 7681,
                low: 7482,
                percentageChange: 2.51,
                netChange: 188,
                bid: 7669,
                offer: 7679,
                updateTime: '21:34:12',
                delayTime: 0,
                streamingPricesAvailable: false,
                marketStatus: 'TRADEABLE',
                scalingFactor: 1
            }
            },
            {
            position: {
                contractSize: 1,
                createdDate: '2024/02/22 23:32:40:000',
                dealId: 'DIAAAAMK8S5X8AN',
                dealSize: 0.08,
                direction: 'BUY',
                limitLevel: null,
                openLevel: 7606,
                currency: 'GBP',
                controlledRisk: false,
                stopLevel: null,
                trailingStep: null,
                trailingStopDistance: null,
                limitedRiskPremium: null
            },
            market: {
                instrumentName: 'Alibaba Group Holding Ltd (All Sessions)',
                expiry: 'DFB',
                epic: 'SA.D.BABA.DAILY.IP',
                instrumentType: 'SHARES',
                lotSize: 1,
                high: 7681,
                low: 7482,
                percentageChange: 2.51,
                netChange: 188,
                bid: 7669,
                offer: 7679,
                updateTime: '21:34:12',
                delayTime: 0,
                streamingPricesAvailable: false,
                marketStatus: 'TRADEABLE',
                scalingFactor: 1
            }
            },
            {
            position: {
                contractSize: 1,
                createdDate: '2024/02/27 09:31:31:000',
                dealId: 'DIAAAAMLLPNW8AW',
                dealSize: 2.16,
                direction: 'BUY',
                limitLevel: null,
                openLevel: 2407.6,
                currency: 'GBP',
                controlledRisk: false,
                stopLevel: null,
                trailingStep: null,
                trailingStopDistance: null,
                limitedRiskPremium: null
            },
            market: {
                instrumentName: 'JD.com Inc (All Sessions)',
                expiry: 'DFB',
                epic: 'UB.D.JDUS.DAILY.IP',
                instrumentType: 'SHARES',
                lotSize: 1,
                high: 2766,
                low: 2671,
                percentageChange: 5.95,
                netChange: 155,
                bid: 2750,
                offer: 2767,
                updateTime: '21:30:28',
                delayTime: 0,
                streamingPricesAvailable: false,
                marketStatus: 'TRADEABLE',
                scalingFactor: 1
            }
            },
            {
            position: {
                contractSize: 1,
                createdDate: '2024/03/05 15:16:24:000',
                dealId: 'DIAAAAMMKJCKTBD',
                dealSize: 0.12,
                direction: 'BUY',
                limitLevel: null,
                openLevel: 20195,
                currency: 'GBP',
                controlledRisk: false,
                stopLevel: null,
                trailingStep: null,
                trailingStopDistance: null,
                limitedRiskPremium: null
            },
            market: {
                instrumentName: 'Boeing Co (All Sessions)',
                expiry: 'DFB',
                epic: 'SA.D.BA.DAILY.IP',
                instrumentType: 'SHARES',
                lotSize: 1,
                high: 25342.4,
                low: 18312,
                percentageChange: -4.31,
                netChange: -829,
                bid: 18411,
                offer: 18426,
                updateTime: '21:33:50',
                delayTime: 0,
                streamingPricesAvailable: false,
                marketStatus: 'TRADEABLE',
                scalingFactor: 1
            }
            },
            {
            position: {
                contractSize: 1,
                createdDate: '2024/03/06 17:02:00:000',
                dealId: 'DIAAAAMMSY9DJAJ',
                dealSize: 0.74,
                direction: 'BUY',
                limitLevel: null,
                openLevel: 7463,
                currency: 'GBP',
                controlledRisk: false,
                stopLevel: null,
                trailingStep: null,
                trailingStopDistance: null,
                limitedRiskPremium: null
            },
            market: {
                instrumentName: 'Alibaba Group Holding Ltd (All Sessions)',
                expiry: 'DFB',
                epic: 'SA.D.BABA.DAILY.IP',
                instrumentType: 'SHARES',
                lotSize: 1,
                high: 7681,
                low: 7482,
                percentageChange: 2.51,
                netChange: 188,
                bid: 7669,
                offer: 7679,
                updateTime: '21:34:12',
                delayTime: 0,
                streamingPricesAvailable: false,
                marketStatus: 'TRADEABLE',
                scalingFactor: 1
            }
            },
            {
            position: {
                contractSize: 1,
                createdDate: '2024/03/07 14:38:10:000',
                dealId: 'DIAAAAMMYA438A3',
                dealSize: 1,
                direction: 'BUY',
                limitLevel: null,
                openLevel: 2398.6,
                currency: 'GBP',
                controlledRisk: false,
                stopLevel: null,
                trailingStep: null,
                trailingStopDistance: null,
                limitedRiskPremium: null
            },
            market: {
                instrumentName: 'JD.com Inc (All Sessions)',
                expiry: 'DFB',
                epic: 'UB.D.JDUS.DAILY.IP',
                instrumentType: 'SHARES',
                lotSize: 1,
                high: 2766,
                low: 2671,
                percentageChange: 5.95,
                netChange: 155,
                bid: 2750,
                offer: 2767,
                updateTime: '21:30:28',
                delayTime: 0,
                streamingPricesAvailable: false,
                marketStatus: 'TRADEABLE',
                scalingFactor: 1
            }
            },
            {
            position: {
                contractSize: 1,
                createdDate: '2024/03/08 11:04:08:000',
                dealId: 'DIAAAAMM49RCRAN',
                dealSize: 1,
                direction: 'BUY',
                limitLevel: null,
                openLevel: 7666.7,
                currency: 'GBP',
                controlledRisk: false,
                stopLevel: null,
                trailingStep: null,
                trailingStopDistance: null,
                limitedRiskPremium: null
            },
            market: {
                instrumentName: 'FTSE 100',
                expiry: 'DFB',
                epic: 'IX.D.FTSE.DAILY.IP',
                instrumentType: 'INDICES',
                lotSize: 1,
                high: 7761.7,
                low: 7740.2,
                percentageChange: 0.11,
                netChange: 8.4,
                bid: 7754.6,
                offer: 7758.6,
                updateTime: '21:33:32',
                delayTime: 0,
                streamingPricesAvailable: true,
                marketStatus: 'TRADEABLE',
                scalingFactor: 1
            }
            },
            {
            position: {
                contractSize: 1,
                createdDate: '2024/03/08 14:51:52:000',
                dealId: 'DIAAAAMM6YS64AJ',
                dealSize: 0.71,
                direction: 'BUY',
                limitLevel: null,
                openLevel: 7919,
                currency: 'GBP',
                controlledRisk: false,
                stopLevel: null,
                trailingStep: null,
                trailingStopDistance: null,
                limitedRiskPremium: null
            },
            market: {
                instrumentName: 'Shopify Inc (US)',
                expiry: 'DFB',
                epic: 'SG.D.SHOPUS.DAILY.IP',
                instrumentType: 'SHARES',
                lotSize: 1,
                high: 7673,
                low: 7454.1,
                percentageChange: 1.85,
                netChange: 139,
                bid: 7632,
                offer: 7640,
                updateTime: '20:00:02',
                delayTime: 0,
                streamingPricesAvailable: false,
                marketStatus: 'EDITS_ONLY',
                scalingFactor: 1
            }
            },
            {
            position: {
                contractSize: 1,
                createdDate: '2024/03/11 14:36:02:000',
                dealId: 'DIAAAAMND843UBB',
                dealSize: 0.29,
                direction: 'BUY',
                limitLevel: null,
                openLevel: 7571,
                currency: 'GBP',
                controlledRisk: false,
                stopLevel: null,
                trailingStep: null,
                trailingStopDistance: null,
                limitedRiskPremium: null
            },
            market: {
                instrumentName: 'Alibaba Group Holding Ltd (All Sessions)',
                expiry: 'DFB',
                epic: 'SA.D.BABA.DAILY.IP',
                instrumentType: 'SHARES',
                lotSize: 1,
                high: 7681,
                low: 7482,
                percentageChange: 2.51,
                netChange: 188,
                bid: 7669,
                offer: 7679,
                updateTime: '21:34:12',
                delayTime: 0,
                streamingPricesAvailable: false,
                marketStatus: 'TRADEABLE',
                scalingFactor: 1
            }
            },
            {
            position: {
                contractSize: 1,
                createdDate: '2024/03/12 16:41:55:000',
                dealId: 'DIAAAAMNMKZT3A3',
                dealSize: 1,
                direction: 'SELL',
                limitLevel: null,
                openLevel: 18100,
                currency: 'GBP',
                controlledRisk: false,
                stopLevel: null,
                trailingStep: null,
                trailingStopDistance: null,
                limitedRiskPremium: null
            },
            market: {
                instrumentName: 'US Tech 100',
                expiry: 'DFB',
                epic: 'IX.D.NASDAQ.CASH.IP',
                instrumentType: 'INDICES',
                lotSize: 1,
                high: 18222.5,
                low: 18201.9,
                percentageChange: 0.01,
                netChange: 2.7,
                bid: 18215.6,
                offer: 18220.6,
                updateTime: '21:34:04',
                delayTime: 0,
                streamingPricesAvailable: true,
                marketStatus: 'TRADEABLE',
                scalingFactor: 1
            }
            }
        ]
    }).timeout(50000);

});
