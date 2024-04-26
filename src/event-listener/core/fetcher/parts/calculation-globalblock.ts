import { isNullOrUndefined, countDecimals, currencyInfo } from '../../../helpers/helpers';

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

const leverageMultiple = 1; // there is no leverage on GlobalBlock
const direction = 'buy' as DirectionType; // it can only be long with cash

export const OrderCalcPre = async (
  ideaType: IdeaType,
  network: string,
  pkpAuthSig: any,
  params: {
    env: EnvType,
    source: FetcherSource,
    payload: {
      credentials: {
        publicKey: string,
        secretKey: string
      },
      asset: {
        baseCurrency: string,
        quoteCurrency: string,
      },
      base: string,
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
      credentials
    } = payload

    // get and set our trigger settings
    const triggerSettings = params.trigger.settings;
    // console.log('triggerSettings', triggerSettings);
    
    // { maxLeverage: 10, orderSize: 5, maxPositionSize: 10 },

    // we need the price of the asset
    let assetInfo: any;
    assetInfo = await fetcher.globalblock.getSingleAsset(
      network,
      pkpAuthSig,
      {
        env,
        source,
        payload: {
          credentials: {
            publicKey: params.payload.credentials.publicKey,
            secretKey: params.payload.credentials.secretKey,
          },
          asset: {
            baseCurrency: params.payload.asset.baseCurrency,
            quoteCurrency: params.payload.asset.quoteCurrency,
          },
        }
      }
    );  
    // console.log('assetInfo', assetInfo);

    // we can use the above for these...
    data.asset.ticker = params.payload.asset.baseCurrency;  // it should be the asset we are trying to buy or sell i.e. it's not a pair but a single coin
    data.asset.expiry = '';
    data.asset.name = assetInfo.asset.pair;
    data.asset.price.ask = Number(assetInfo?.pricing.price.offer) || 0;
    data.asset.price.bid = Number(assetInfo?.pricing.price.bid) || 0;
    data.asset.decimals = Number(assetInfo?.pricing.quotePrecision) || 0;
 
    // these come from the more detailed request
    data.asset.minQty = Number(assetInfo?.trade.settings.minQuantity) || 0;
    // if that has decimals, then fractional is true
    data.asset.fractional = true; // it's crypto afterall

    // use the number of decimals from the min qty
    data.asset.decimals = countDecimals(data.asset.minQty);

   // console.log('igAssetInfo asset object', data.asset);

    /* positions */
    let positions: any[];
    positions = await fetcher.globalblock.getPositions(
      network,
      pkpAuthSig,
      {
        env,
        source,
        payload: {
          credentials: {
            publicKey: params.payload.credentials.publicKey,
            secretKey: params.payload.credentials.secretKey,
          },
          quote: params.payload.base,
        }
      }
    );

    data.account.currencyCode = params.payload.base;
    data.account.currencySymbol = '';

    // needed first for our portfolio stats
    setAccountLeverageBalance(data);      
    formatPositions(data, positions, payload.base);
    calcExistingPosition(data);
    defaultOrderCalcUsingtheAccountBalance(data, triggerSettings, ideaType, params);       

  } catch (err: any) {
    console.log('err  in gb calc', err.message);
  }

  return data;
}

const calcExistingPosition = (data: IOrderCalc) => {
  // filter out our net portfolio
  const netPositions = data.portfolio.net;

  data.existingPosition.valueInBase = 0;
  data.existingPosition.currentPortfolioAllocation = 0;

  for (const p in netPositions) {
      if (p) {
        // console.log('netPositions[p].ticker', netPositions[p].ticker);
        // console.log('data.asset.ticker', data.asset.ticker);
        if (netPositions[p].ticker === data.asset.ticker) {
          data.existingPosition.valueInBase = netPositions[p].value;
          data.existingPosition.currentPortfolioAllocation = data.existingPosition.valueInBase / data.account.leverageBalance * 100;
          break;
        }
      }
  }
}


const formatPositions = (data: IOrderCalc, positions: any[], base: string) => {

  let totalValueInBase = 0;

  for (const i in positions) {
    if (i) {

      totalValueInBase = totalValueInBase + positions[i].base.value || 0;

      const netPosition = {
        ticker: positions[i].currency,
        size: positions[i].available,
        direction,
        bid: positions[i].base.bid || positions[i].base.rate,
        offer: positions[i].base.offer || positions[i].base.rate,
        value: positions[i].base.value,
      };
  
      data.portfolio.net.push(netPosition);

      // this is what we can spend now
      if (positions[i].currency === base) {
        data.portfolioStats.remaining = positions[i].base.value;

      }

    }
  }

  // they are the same thing in this case
  data.portfolio.raw = data.portfolio.net;


  data.account.balance = totalValueInBase;
  data.account.leverageBalance = totalValueInBase * data.account.leverage;

  // there is no concept of short with cash products
  data.portfolioStats.long = totalValueInBase;
  data.portfolioStats.short = 0;
  data.portfolioStats.net = totalValueInBase;

 
  return data;
}

// Add to Lit
const setAccountLeverageBalance = (data: IOrderCalc | IOrderCalcPortfolio) => {
    
    OrderCalc.functions.setAccountLeverageBalance(
        data,
        {
            leverageMultiple,
        }
    );
}

const defaultOrderCalcUsingtheAccountBalance = (data: any, triggerSettings: any,  ideaType: IdeaType, params) => {

  // we need to allow these to be passed in if we're going to use them
  const orderLimits = false;
  const conviction = 100;

  // this is the trigger object
  let defaultOrderSize = 0;
  let maxSizePortfolio = 0;
  defaultOrderSize = triggerSettings.orderSize;
  maxSizePortfolio = triggerSettings.maxPositionSize; 
  // console.log('defaultOrderSize', defaultOrderSize);
  // console.log('maxSizePortfolio', maxSizePortfolio);

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




