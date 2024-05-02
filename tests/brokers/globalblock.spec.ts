import 'dotenv/config';

import { expect } from 'chai';

import * as config from '../../src/event-listener/config/config';

import * as fetcher from '../../src/event-listener/core/fetcher';
import * as gbOrderCalc from '../../src/event-listener/core/fetcher/parts/calculation-globalblock';

import {
    DirectionType,
    IdeaType,
    IOrderCalc,
    OrderCalc,
  } from '../../src/event-listener/core/fetcher/parts/shared/order-calculation';

import {
    D2EventListener
} from '../../src/event-listener';

  
import { PkpAuthModule } from '../../src/event-listener/modules/pkp-auth.module';

import { PkpCredentialNftModule } from '../../src/event-listener/modules/pkp-credential-nft.module';

import { EnvType, FetcherSource } from "../../src/event-listener/interfaces/shared.i";

describe('API Method Testing', () => {

    xit('Get positions', async () => {

        const quoteCurrency = 'USDT';

        const chain = 'polygon';
        const credentialNftUUID = '0xc93abb7261d76a2b0d0fed72a9ee42c5';

        const pkpInfoForCredentials = await config.getPKPInfo(chain);
        // console.log('pkpInfoForCredentials', pkpInfoForCredentials);

        // const environment = pkpInfoForCredentials.environment;
        let environment = 'prod' as EnvType;
        	
        const credentialInfo = await PkpCredentialNftModule.getFullCredential<{
            publicKey: string;
            secretKey: string;
            environment: string;
        }>({
            chain,
            credentialNftUUID,
            pkpKey: pkpInfoForCredentials?.pkpPublicKey,
        });
        // console.log('post credentialInfo', credentialInfo);
        // console.log('post credentialInfo', credentialInfo.decryptedCredential);
        environment = credentialInfo.environment as EnvType;

        if (credentialInfo.decryptedCredential?.publicKey && credentialInfo.decryptedCredential?.secretKey) {

            const gbCredentials = {
                publicKey: credentialInfo.decryptedCredential?.publicKey as string,
                secretKey: credentialInfo.decryptedCredential?.secretKey as string,
            };

            const pkpAuthSig = await PkpAuthModule.getPkpAuthSig(
                chain,
                pkpInfoForCredentials?.pkpPublicKey,
            );
            // console.log('post pkpAuthSig', pkpAuthSig);

            let source = 'fetch' as FetcherSource;
            const positions = await fetcher.globalblock.getPositions(chain, pkpAuthSig, {
                env: environment,
                source,
                payload: {
                    credentials: {
                        publicKey:
                            gbCredentials.publicKey,
                        secretKey:
                            gbCredentials.secretKey,
                    },
                    quote: quoteCurrency,
                }
            });
            console.log('Fetch: post positions', positions);        

            // now check the lit-action version
            source = 'lit-action';

            const positionsB = await fetcher.globalblock.getPositions(chain, pkpAuthSig, {
                env: environment,
                source,
                payload: {
                    credentials: {
                        publicKey:
                            gbCredentials.publicKey,
                        secretKey:
                            gbCredentials.secretKey,
                    },
                    quote: quoteCurrency,
                }
            });
            console.log('Lit-Action: post positions', positionsB);        

            // expect(isNullOrUndefined(data)).to.be.false;
        }

    }).timeout(50000);

    xit('Get Market', async () => {

        const baseCurrency = 'XRP';
        const quoteCurrency = 'USDT';

        const chain = 'polygon';
        const credentialNftUUID = '0xc93abb7261d76a2b0d0fed72a9ee42c5';

        const pkpInfoForCredentials = await config.getPKPInfo(chain);
        // console.log('pkpInfoForCredentials', pkpInfoForCredentials);

        // const environment = pkpInfoForCredentials.environment;
        let environment = 'prod' as EnvType;
        	
        const credentialInfo = await PkpCredentialNftModule.getFullCredential<{
            publicKey: string;
            secretKey: string;
            environment: string;
        }>({
            chain,
            credentialNftUUID,
            pkpKey: pkpInfoForCredentials?.pkpPublicKey,
        });
        // console.log('post credentialInfo', credentialInfo);
        // console.log('post credentialInfo', credentialInfo.decryptedCredential);
        environment = credentialInfo.environment as EnvType;

        if (credentialInfo.decryptedCredential?.publicKey && credentialInfo.decryptedCredential?.secretKey) {

            const gbCredentials = {
                publicKey: credentialInfo.decryptedCredential?.publicKey as string,
                secretKey: credentialInfo.decryptedCredential?.secretKey as string,
            };

            const pkpAuthSig = await PkpAuthModule.getPkpAuthSig(
                chain,
                pkpInfoForCredentials?.pkpPublicKey,
            );
            // console.log('post pkpAuthSig', pkpAuthSig);

            let source = 'fetch' as FetcherSource;
            const market = await fetcher.globalblock.getSingleAsset(chain, pkpAuthSig, {
                env: environment,
                source,
                payload: {
                    credentials: {
                        publicKey:
                            gbCredentials.publicKey,
                        secretKey:
                            gbCredentials.secretKey,
                    },
                    asset: {
                        baseCurrency,
                        quoteCurrency,
                    }
                }
            });
            console.log('Fetch: post market', market);

            // now check the lit-action version
            source = 'lit-action';

            const positionsB = await fetcher.globalblock.getSingleAsset(chain, pkpAuthSig, {
                env: environment,
                source,
                payload: {
                    credentials: {
                        publicKey:
                            gbCredentials.publicKey,
                        secretKey:
                            gbCredentials.secretKey,
                    },
                    asset: {
                        baseCurrency,
                        quoteCurrency,
                    }
                }
            });
            console.log('Lit-Action: post positions', positionsB);        

            // expect(isNullOrUndefined(data)).to.be.false;
        }

    }).timeout(50000);

    xit('Take raw positions and pre-format our calc', async () => {

        const ideaType: IdeaType = 'open';
        const network: string = '';
        const pkpAuthSig: any = '';

        const params = {
            env: 'prod' as EnvType,
            source: 'testing' as FetcherSource,
            payload: {
                credentials: {
                    publicKey: '',
                    secretKey: '',
                },
                asset: {
                    baseCurrency: 'XRP',
                    quoteCurrency: 'USDT',
                },
                trade: {
                    direction: 'Long' as DirectionType,
                },
                base: 'USDT',
            },
            trigger: {
                settings: {
                    defaultOrderSize: 1,
                    maxSizePortfolio: 100,
                }
            }
        }

        const data = await gbOrderCalc.OrderCalcPre(ideaType, network, pkpAuthSig, params);
        console.log('full order object', data.order);
        // console.log('calc order object', data.order.calc);
        // console.log('potential order object', data.order.potential);
        // console.log('final order object', data.order.final);
        // expect(isNullOrUndefined(data)).to.be.false;

    }).timeout(50000);

    xit('Place an order', async () => {

        const quoteCurrency = 'USDT';
        const baseCurrency = 'BTC';
        const direction = 'buy' as DirectionType;
        const quantity = 20;

        const chain = 'polygon';
        const credentialNftUUID = '0xc93abb7261d76a2b0d0fed72a9ee42c5';

        const pkpInfoForCredentials = await config.getPKPInfo(chain);
        // console.log('pkpInfoForCredentials', pkpInfoForCredentials);

        // const environment = pkpInfoForCredentials.environment;
        let environment = 'prod' as EnvType;
        	
        const credentialInfo = await PkpCredentialNftModule.getFullCredential<{
            publicKey: string;
            secretKey: string;
            environment: string;
        }>({
            chain,
            credentialNftUUID,
            pkpKey: pkpInfoForCredentials?.pkpPublicKey,
        });
        // console.log('post credentialInfo', credentialInfo);
        // console.log('post credentialInfo', credentialInfo.decryptedCredential);
        environment = credentialInfo.environment as EnvType;

        if (credentialInfo.decryptedCredential?.publicKey && credentialInfo.decryptedCredential?.secretKey) {

            const gbCredentials = {
                publicKey: credentialInfo.decryptedCredential?.publicKey as string,
                secretKey: credentialInfo.decryptedCredential?.secretKey as string,
            };

            const pkpAuthSig = await PkpAuthModule.getPkpAuthSig(
                chain,
                pkpInfoForCredentials?.pkpPublicKey,
            );
            // console.log('post pkpAuthSig', pkpAuthSig);

            let source = 'testing' as FetcherSource;        

            const params = {
                env: 'prod' as EnvType,
                source,
                payload: {
                    credentials: {
                        publicKey: gbCredentials.publicKey,
                        secretKey: gbCredentials.secretKey,
                    },
                    data: {
                        baseCurrency,
                        quoteCurrency,
                        direction,
                        quantity,
                    }
                },
            }

            const data = await fetcher.globalblock.postPlaceMarketOrder(chain, pkpAuthSig, params);
            console.log('full order object', data);

        }

        // console.log('calc order object', data.order.calc);
        // console.log('potential order object', data.order.potential);
        // console.log('final order object', data.order.final);
        // expect(isNullOrUndefined(data)).to.be.false;

    }).timeout(50000);

    it('Place a managed order', async () => {

        const baseCurrency = 'ETH'; // this is what we are buying or selling 
        const quoteCurrency = 'USDT';  // this is what we sell into or buy from

        const chain = 'polygon';
        const credentialNftUUID = '0xc93abb7261d76a2b0d0fed72a9ee42c5';

        const pkpInfoForCredentials = await config.getPKPInfo(chain);
        // console.log('pkpInfoForCredentials', pkpInfoForCredentials);

        // const environment = pkpInfoForCredentials.environment;
        let environment = 'prod' as EnvType;
        	
        const credentialInfo = await PkpCredentialNftModule.getFullCredential<{
            publicKey: string;
            secretKey: string;
            environment: string;
        }>({
            chain,
            credentialNftUUID,
            pkpKey: pkpInfoForCredentials?.pkpPublicKey,
        });
        // console.log('post credentialInfo', credentialInfo);
        // console.log('post credentialInfo', credentialInfo.decryptedCredential);
        environment = credentialInfo.environment as EnvType;

        if (credentialInfo.decryptedCredential?.publicKey && credentialInfo.decryptedCredential?.secretKey) {

            const gbCredentials = {
                publicKey: credentialInfo.decryptedCredential?.publicKey as string,
                secretKey: credentialInfo.decryptedCredential?.secretKey as string,
            };

            const pkpAuthSig = await PkpAuthModule.getPkpAuthSig(
                chain,
                pkpInfoForCredentials?.pkpPublicKey,
            );
            // console.log('post pkpAuthSig', pkpAuthSig);

            let source = 'fetch' as FetcherSource;        

            const params = {
                env: 'prod' as EnvType,
                source,
                payload: {
                    credentials: {
                        publicKey: gbCredentials.publicKey,
                        secretKey: gbCredentials.secretKey,
                    },
                    data: {
                        baseCurrency,
                        quoteCurrency,
                    },
                    base: quoteCurrency,
                },
                trigger: {
                    settings: {
                        orderSize: 10,
                        maxPositionSize: 100,
                    }
                }
    
            }

            const data = await fetcher.globalblock.placeManagedOrder(chain, pkpAuthSig, params);
            console.log('full order object', data);

        }

        // console.log('calc order object', data.order.calc);
        // console.log('potential order object', data.order.potential);
        // console.log('final order object', data.order.final);
        // expect(isNullOrUndefined(data)).to.be.false;

    }).timeout(50000);

    xit('Close an existing position', async () => {

        console.log('GlobalBlock / Close an existing position');

        const baseCurrency = 'BTC'; // this is what we are buying or selling 
        const quoteCurrency = 'USDT';  // this is what we sell into or buy from

        const chain = 'polygon';
        const credentialNftUUID = '0xc93abb7261d76a2b0d0fed72a9ee42c5';

        const pkpInfoForCredentials = await config.getPKPInfo(chain);
        // console.log('pkpInfoForCredentials', pkpInfoForCredentials);

        // const environment = pkpInfoForCredentials.environment;
        let environment = 'prod' as EnvType;
        	
        const credentialInfo = await PkpCredentialNftModule.getFullCredential<{
            publicKey: string;
            secretKey: string;
            environment: string;
        }>({
            chain,
            credentialNftUUID,
            pkpKey: pkpInfoForCredentials?.pkpPublicKey,
        });
        // console.log('post credentialInfo', credentialInfo);
        // console.log('post credentialInfo', credentialInfo.decryptedCredential);
        environment = credentialInfo.environment as EnvType;

        if (credentialInfo.decryptedCredential?.publicKey && credentialInfo.decryptedCredential?.secretKey) {

            const gbCredentials = {
                publicKey: credentialInfo.decryptedCredential?.publicKey as string,
                secretKey: credentialInfo.decryptedCredential?.secretKey as string,
            };

            const pkpAuthSig = await PkpAuthModule.getPkpAuthSig(
                chain,
                pkpInfoForCredentials?.pkpPublicKey,
            );
            // console.log('post pkpAuthSig', pkpAuthSig);

            let source = 'fetch' as FetcherSource;        

            const params = {
                env: 'prod' as EnvType,
                source,
                payload: {
                    credentials: {
                        publicKey: gbCredentials.publicKey,
                        secretKey: gbCredentials.secretKey,
                    },
                    data: {
                        baseCurrency,
                        quoteCurrency,
                    }
                },
            }

            const data = await fetcher.globalblock.closePosition(chain, pkpAuthSig, params);
            // console.log('full order object', data);

        }

        // console.log('calc order object', data.order.calc);
        // console.log('potential order object', data.order.potential);
        // console.log('final order object', data.order.final);
        // expect(isNullOrUndefined(data)).to.be.false;

    }).timeout(50000);

    xit('Global order test', async () => {

        // note this will create a real order
        console.log('in the GB listener test')

        // given there is no test env for GB, this will execute a real order
        // const blockNumber = 55605736;
        // const blockNumber = 55668442; // THETAUSDT
        // const blockNumber = 55527197; // BTCUSDT
        const blockNumber = 56499314; // ETHUSDT
        
        console.log('config.WALLET_PRIVATE_KEY', config.WALLET_PRIVATE_KEY);
        const data: any[] = await D2EventListener({
            network: 'polygon',
            privateKey: config.WALLET_PRIVATE_KEY,
            test: {
                enabled: false,
                blockNumber,
            }
        });

        console.log('data', data);

        const orderDetail = data.find(res => res);

        console.log('orderDetail', orderDetail);

    }).timeout(50000);

});


