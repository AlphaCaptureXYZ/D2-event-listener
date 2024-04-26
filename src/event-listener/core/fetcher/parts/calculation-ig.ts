import { isNullOrUndefined, countDecimals, currencyInfo } from '../../../helpers/helpers';

import { IOrderPortfolioActions } from './shared/portfolio-calculation';

import { IAssetInfo } from './_interfaces/asset-info.i';
import { IPositionInfo } from './_interfaces/position.i';
import { IAccount } from './_interfaces/account.i';

import * as fetcher from '..';

import { FetcherSource, EnvType } from "../../../interfaces/shared.i";

import {
  DirectionType,
  IdeaType,
  IOrderCalc,
  OrderCalc,
} from './shared/order-calculation';

import {
  IOrderCalcPortfolio,
  OrderCalcPortfolio,
} from './shared/portfolio-calculation';


export const OrderCalcPre = async (
    ideaType: IdeaType,
    network: string,
    pkpAuthSig: any,
    params: {
      env: EnvType,
      source: FetcherSource,
      payload: {
        auth: {
          apiKey: string,
          clientSessionToken: string
          activeAccountSessionToken: string,
          accountId: string
        },
        direction: DirectionType,
        epic: string,
      },
      trigger: any,
    }
  ) => {
    const data = OrderCalc.constants.defaultOrderCalc;
  
    try {
  
      const {
        env,
        payload,
        source,
      } = params;
  
      const {
        auth
      } = payload
  
      // get and set our trigger settings
      const triggerSettings = params.trigger.settings;
      
      // { maxLeverage: 10, orderSize: 5, maxPositionSize: 10 },

      const igAssetInfo: any = await fetcher.ig.getMarketInfoByEpic(
        network,
        pkpAuthSig,
        {
          env,
          source,
          payload: {
            epic: payload.epic,
            auth: {
              apiKey: auth.apiKey,
              clientSessionToken: auth.clientSessionToken,
              activeAccountSessionToken: auth.activeAccountSessionToken,
            }
          }
        }
      );
      // console.log('igAssetInfo', igAssetInfo);
      // console.log('payload', payload);
      // console.log('auth', auth);
  
      // we can use the above for these...
      data.asset.ticker = igAssetInfo?.instrument?.epic;
      data.asset.expiry = igAssetInfo?.instrument?.expiry;
      data.asset.name = igAssetInfo.instrument?.name;
      data.asset.price.ask = igAssetInfo?.snapshot?.offer || 0;
      data.asset.price.bid = igAssetInfo?.snapshot?.bid || 0;
  
      // these come from the more detailed request
      data.asset.minQty =
        igAssetInfo?.dealingRules?.minDealSize?.value || 1;
      // there is a value on the asset object that is called 'step' or something like that
      // if that has decimals, then fractional is true
      data.asset.fractional =
        igAssetInfo?.dealingRules?.minDealSize?.value?.toString()?.includes('.') ? true : false;
  
      // use the number of decimals from the min qty
      data.asset.decimals = countDecimals(data.asset.minQty);
  
    //   console.log('igAssetInfo asset object', data.asset);

      /* positions */
      const positions: any[] = await fetcher.ig.getPositions(
        network,
        pkpAuthSig,
        {
          env,
          source,
          payload: {
            auth: {
              apiKey: auth.apiKey,
              clientSessionToken: auth.clientSessionToken,
              activeAccountSessionToken: auth.activeAccountSessionToken,
            }
          }
        }
      );
    //   console.log('igPositions', positions);
  
      const accounts: any[] = await fetcher.ig.getAccounts(
        network,
        pkpAuthSig,
        {
          env,
          source,
          payload: {
            auth: {
              apiKey: auth.apiKey,
              clientSessionToken: auth.clientSessionToken,
              activeAccountSessionToken: auth.activeAccountSessionToken,
            }
          }
        }
      );
  
      let account = accounts?.find((res: any) => res.accountId === auth.accountId);
  
      if (isNullOrUndefined(account)) {
        account = accounts?.find((res: any) => res.preferred);
      }
    //   console.log('igAccount', account);
  
      const currency: any = account.currency;
      data.account.currencyCode = currency;
      data.account.currencySymbol = (currencyInfo as any)[currency || 'GBP']?.symbol;
    //   console.log('data.account', data.account);
  
      // check to see if there are any assets other than the base currency of the account
      const diffAssets = positions?.filter((res) => res.position.currency !== currency) || [];
  
      // console.log('diffAssets', diffAssets);
  
      // good example to do, the demo account have 2 existing positions in USD and the other in GBP
      if (diffAssets.length > 0) {
        // pending to add the conversion and logic, etc
      }

      // needed first for our portfolio stats
      setAccountLeverageBalance(data, triggerSettings);      
      calcAccountBalanceAndPositions(data, account, positions);
      calcExistingPosition(data);
      defaultOrderCalcUsingtheAccountBalance(data, triggerSettings, params?.payload.direction, ideaType);       

    //   console.log('final data', data);

    } catch (err: any) {
  
    }
  
    return data;
  }

  
// Calculation
// these calculations are a direct from from D2 (with minor changes to params only)

const calcAccountBalanceAndPositions = (data: IOrderCalc | IOrderCalcPortfolio, account: IAccount, positions: any[]) => {
    // console.log('this.account', this.account);
    if (account) {

        const currency: any = account?.currency;
        const accountCurrencySymbol = (currencyInfo as any)[currency || 'GBP']?.symbol;

        // check to see if there are any assets other than the base currency of the account
        const diffAssets = positions?.filter((res) => res.position.currency !== currency) || [];
        // console.log('diffAssets', diffAssets);
        // good example to do, the demo account have 2 existing positions in USD and the other in GBP
        if (diffAssets.length > 0) {
        // pending to add the conversion and logic, etc
        }

        // this needs to be our cash balance i.e. total cash +/- the current P&L
        // console.log('account balances', this.account.balance);
        const accountBalance = (account?.balance?.balance + account?.balance?.profitLoss) || 0;

        data.account.currencySymbol = accountCurrencySymbol;
        data.account.leverageBalance = accountBalance * data.account.leverage;

        data.account.balance = accountBalance;
        data.account.leverageBalance = accountBalance * data.account.leverage;

        // update our raw positions
        formatRawPositions(data, positions);
        formatNetPositions(data);
        portfolioStats(data);
    }
}

const calcExistingPosition = (data: IOrderCalc) => {
    // filter out our net portfolio
    const netPositions = data.portfolio.net;
    for (const p in netPositions) {
        if (p) {
        if (netPositions[p].ticker === data.asset.ticker) {
            data.existingPosition.valueInBase = netPositions[p].value;
            data.existingPosition.currentPortfolioAllocation = data.existingPosition.valueInBase / data.account.leverageBalance * 100;
        }
        }
    }
}

const defaultOrderCalcUsingtheAccountBalance = (data: any, triggerSettings: any, direction: DirectionType, ideaType: IdeaType) => {

    // we need to allow these to be passed in if we're going to use them
    const orderLimits = false;
    const conviction = 100;

    // this is the trigger object
    // { maxLeverage: 10, orderSize: 5, maxPositionSize: 10 },
    const defaultOrderSize = triggerSettings.orderSize;
    const maxSizePortfolio = triggerSettings.maxPositionSize;
    const leverageMultiple = triggerSettings.maxLeverage;

    // const direction = 'Long' as DirectionType;

    OrderCalc.functions.defaultOrderCalcUsingtheAccountBalance(
        data,
        ideaType,
        {
            orderLimits,
            defaultOrderSize,
            conviction,
            maxSizePortfolio,
            direction,
            leverageMultiple,
        }
    );
}

const formatRawPositions = (data: IOrderCalc | IOrderCalcPortfolio, positions: any[]) => {
    // reset our portfolio
    data.portfolio.raw.length = 0;

    const rawPositions = [];

    // loop through the positions to get the total existing exposure
    for (const p in positions) {
        if (p) {

        let val = 0;
        let direction = 'Neutral';
        if (positions[p].position.direction === 'SELL') {
            val = positions[p].market.bid * positions[p].position.dealSize;
            direction = 'Short';
            data.portfolioStats.short = data.portfolioStats.short + val;
        } else if (positions[p].position.direction === 'BUY') {
            val = positions[p].market.offer * positions[p].position.dealSize;
            direction = 'Long';
            data.portfolioStats.long = data.portfolioStats.long + val;
        }
        data.portfolioStats.net = data.portfolioStats.long - data.portfolioStats.short;

        // always add the raw
        const rawPosition = {
            deal: positions[p].position.dealId,
            ticker: positions[p].market.epic,
            size: positions[p].position.dealSize,
            direction,
            bid: positions[p].market.bid,
            offer: positions[p].market.offer,
            value: val,
        }
        rawPositions.push(rawPosition);
        }
    }

    data.portfolio.raw = rawPositions;

    // console.log('this.data.portfolio', this.data.portfolio);
    // console.log('in raw positions', this.data.portfolio.raw);

    return data;
}

const formatNetPositions = (data: IOrderCalc | IOrderCalcPortfolio) => {
    data.portfolio.net.length = 0;
    const rawPositions = data.portfolio.raw;

    for (const p in rawPositions) {
        if (p) {

        const currentTicker = rawPositions[p].ticker;

        let inNet = false;
        for (const n in data.portfolio.net) {
            if (n) {

            if (data.portfolio.net[n].ticker === currentTicker) {

                inNet = true;

                if (rawPositions[p].direction === 'SELL' || rawPositions[p].direction === 'Short') {
                    data.portfolio.net[n].size = data.portfolio.net[n].size - rawPositions[p].size;
                    data.portfolio.net[n].value = data.portfolio.net[n].value - rawPositions[p].value;
                } else if (rawPositions[p].direction === 'BUY' || rawPositions[p].direction === 'Long') {
                    data.portfolio.net[n].size = data.portfolio.net[n].size + rawPositions[p].size;
                    data.portfolio.net[n].value = data.portfolio.net[n].value + rawPositions[p].value;
                }

                // set the overall direction
                if (data.portfolio.net[n].size > 0) {
                    data.portfolio.net[n].direction = 'Long';
                } else if (data.portfolio.net[n].size < 0) {
                    data.portfolio.net[n].direction = 'Short';
                } else {
                    data.portfolio.net[n].direction = 'Neutral';
                }

            }
            }
        }

        if (!inNet) {
            const netPosition = {
                ticker: rawPositions[p].ticker,
                size: rawPositions[p].size,
                direction: rawPositions[p].direction,
                bid: rawPositions[p].bid,
                offer: rawPositions[p].offer,
                value: rawPositions[p].value,
            }
            data.portfolio.net.push(netPosition);
        }

        }
    }

    // console.log('in net positions', this.data.portfolio.net);

    return data;
}

const portfolioStats = (data: IOrderCalc | IOrderCalcPortfolio) => {
    // and reset our portfolio stats
    data.portfolioStats.long = 0;
    data.portfolioStats.short = 0;
    data.portfolioStats.net = 0;

    for (const m in data.portfolio.net) {
        if (m) {
        if (data.portfolio.net[m].direction === 'Long') {
            data.portfolioStats.long = data.portfolioStats.long + Math.abs(data.portfolio.net[m].value);
        } else if (data.portfolio.net[m].direction === 'Short') {
            data.portfolioStats.short = data.portfolioStats.short + Math.abs(data.portfolio.net[m].value);
        }
        }
    }

    // net positions
    data.portfolioStats.net = data.portfolioStats.long - Math.abs(data.portfolioStats.short);

    // update our total remaining portfolo 'space'
    data.portfolioStats.remaining = Math.abs(data.account.leverageBalance - Math.abs(data.portfolioStats.net));
    // console.log('in portfolioStats', this.data.portfolioStats);

    return data;
}

// Add to Lit
const setAccountLeverageBalance = (data: IOrderCalc | IOrderCalcPortfolio, triggerSettings: any) => {

  const leverageMultiple = triggerSettings.maxLeverage;

  // const direction = 'Long' as DirectionType;

  OrderCalc.functions.setAccountLeverageBalance(
      data,
      {
          leverageMultiple,
      }
  );
}

// Portfolio related


export const OrderCalcPrePortfolio = async (
  network: string,
  pkpAuthSig: any,
  params: {
    env: EnvType,
    source: FetcherSource,
    payload: {
      auth: {
        apiKey: string,
        clientSessionToken: string
        activeAccountSessionToken: string,
        accountId: string
      },
      portfolioIntended: any[],
    },
    trigger: any,
  }
) => {

  const data = OrderCalcPortfolio.constants.defaultOrderCalcPortfolio;

  try {

    const {
      env,
      payload,
      source,
    } = params;

    const {
      auth
    } = payload

    // get and set our trigger settings
    const triggerSettings = params.trigger.settings;
    
    const accounts: any[] = await fetcher.ig.getAccounts(
      network,
      pkpAuthSig,
      {
        env,
        source,
        payload: {
          auth: {
            apiKey: auth.apiKey,
            clientSessionToken: auth.clientSessionToken,
            activeAccountSessionToken: auth.activeAccountSessionToken,
          }
        }
      }
    );

    let account = accounts?.find((res: any) => res.accountId === auth.accountId);

    if (isNullOrUndefined(account)) {
      account = accounts?.find((res: any) => res.preferred);
    }
  //   console.log('igAccount', account);


      /* positions */
      const positions: any[] = await fetcher.ig.getPositions(
        network,
        pkpAuthSig,
        {
          env,
          source,
          payload: {
            auth: {
              apiKey: auth.apiKey,
              clientSessionToken: auth.clientSessionToken,
              activeAccountSessionToken: auth.activeAccountSessionToken,
            }
          }
        }
      );
      // console.log('igPositions', positions);

    const currency: any = account.currency;
    // console.log('diffAssets', diffAssets);

    setAccountLeverageBalance(data, triggerSettings);      
    calcAccountBalanceAndPositions(data, account, positions);
    // defaultOrderCalcUsingtheAccountBalance(data, triggerSettings, params?.payload.direction, ideaType);       

    // console.log('final data', data);

  } catch (err: any) {

  }

  return data;
}



// Calculation
// these calculations are a direct from from D2 (with minor changes to params only)
// THESE STILL NEED TO BE ADDED TO THE LIT ACTION

export const OrderPortfolioRebalance = async (
  network: string,
  pkpAuthSig: any,
  params: {
    env: EnvType,
    source: FetcherSource,
    payload: {
      auth: {
        apiKey: string,
        clientSessionToken: string
        activeAccountSessionToken: string,
        accountId: string
      },
      portfolioRebalance: IOrderPortfolioActions,
    },
    trigger: any,
  }
) => {

  // const data = OrderCalcPortfolio.constants.defaultOrderCalcPortfolio;

  try {

    // extract all the epics to close
    // console.log('portfolioRebalance.close', params.payload.portfolioRebalance.close);
    const epicsToClose = params.payload.portfolioRebalance.close.map(obj => obj.ticker);
    // console.log('epicsToClose', epicsToClose);

    // the params need adjusting before they can be passed in

    // sell all the positions
    // we need to format the payload slightly differently
    const closePayload = {
      network,
      pkpAuthSig,
      params: {
        env: params.env,
        source: params.source,
        payload: {    
          auth: {
              apiKey: params.payload.auth.apiKey,
              clientSessionToken: params.payload.auth.clientSessionToken,
              activeAccountSessionToken: params.payload.auth.activeAccountSessionToken,
              accountId: params.payload.auth.accountId,
          },
          form: {
              epics: epicsToClose,
          },
        }
      }
    };

    // await fetcher.ig.closePosition(
    //   network,
    //   pkpAuthSig,
    //   params,
    // );


    // now request the balance again


    // get the prices of all the assets that we need to open or adjust

    // worjk out the existing value
    // compare to our intended value
    // work out the qty
    // round down based on the decimals
    // ignore if below min
    // either buy or sell

  } catch (err: any) {


  }

  const data = null;
  return data;
}
