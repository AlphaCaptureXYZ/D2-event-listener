import { isNullOrUndefined, countDecimals, currencyInfo } from '../../../helpers/helpers';

import { IAssetInfo } from './_interfaces/asset-info.i';
import { IPositionInfo } from './_interfaces/position.i';
import { IAccount } from './_interfaces/account.i';

import * as fetcher from '../../../../../src/event-listener/core/fetcher';

import { FetcherSource, EnvType } from "../../../../event-listener/interfaces/shared.i";

import {
  DirectionType,
  IOrderCalc,
  OrderCalc,
} from './shared/order-calculation';


export const OrderCalcPre = async (
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
      }
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
  
      // we can use the above for these...
      data.asset.ticker = igAssetInfo?.instrument?.epic;
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
  
      const currency: any = account.currency;
      data.account.currencyCode = (currencyInfo as any)[currency || 'GBP']?.symbol;
  
      // check to see if there are any assets other than the base currency of the account
      const diffAssets = positions?.filter((res) => res.position.currency !== currency) || [];
  
      // console.log('diffAssets', diffAssets);
  
      // good example to do, the demo account have 2 existing positions in USD and the other in GBP
      if (diffAssets.length > 0) {
        // pending to add the conversion and logic, etc
      }

      calcAccountBalanceAndPositions(data, account, positions);
      calcExistingPosition(data);
      defaultOrderCalcUsingtheAccountBalance(data);       

    } catch (err: any) {
  
    }
  
    return data;
  }

  
// Calculation
// these calculations are a direct from from D2 (with minor changes to params only)

const calcAccountBalanceAndPositions = (data: IOrderCalc, account: IAccount, positions: any[]) => {
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

const defaultOrderCalcUsingtheAccountBalance = (data: any) => {
    // these need to come from the weaver store
    // OR the nft order details

    const orderLimits = false;
    const defaultOrderSize = 5;
    const conviction = 100;
    const maxSizePortofolio = 10;
    const direction = 'Long' as DirectionType;

    OrderCalc.functions.defaultOrderCalcUsingtheAccountBalance(
        data,
        {
            orderLimits,
            defaultOrderSize,
            conviction,
            maxSizePortofolio,
            direction,
        }
    );
}

const formatRawPositions = (data: IOrderCalc, positions: any[]) => {
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

const formatNetPositions = (data: IOrderCalc) => {
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

const portfolioStats = (data: IOrderCalc) => {
    // and reset our portfolio stats
    data.portfolioStats.long = 0;
    data.portfolioStats.short = 0;
    data.portfolioStats.net = 0;

    for (const m in data.portfolio.net) {
        if (m) {
        if (data.portfolio.net[m].direction === 'Long') {
            data.portfolioStats.long = data.portfolioStats.long + data.portfolio.net[m].value;
        } else if (data.portfolio.net[m].direction === 'Short') {
            data.portfolioStats.short = data.portfolioStats.short + data.portfolio.net[m].value;
        }
        }
    }

    // net positions
    data.portfolioStats.net = data.portfolioStats.long - data.portfolioStats.short;

    // update our total remaining portfolo 'space'
    data.portfolioStats.remaining = data.account.leverageBalance - data.portfolioStats.net;
    // console.log('in portfolioStats', this.data.portfolioStats);

    return data;
}