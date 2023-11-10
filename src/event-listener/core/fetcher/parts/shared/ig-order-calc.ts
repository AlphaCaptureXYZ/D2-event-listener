// NOTE: pending to better to have one standard way to calculate the order of different brokers

import { EnvType, FetcherSource } from '../../../../../event-listener/interfaces/shared.i';

import * as fetcher from '../../';

import { isNullOrUndefined } from '../../../../helpers/helpers';

export type DirectionType = 'buy' | 'sell';

const countDecimals = (value: number): number => {
  if (Math.floor(value) === value) return 0;
  return value.toString().split(".")[1].length || 0;
}

const currencyInfo = {
  GBP: {
    symbol: '£',
  },
  USD: {
    symbol: '$',
  },
  EUR: {
    symbol: '€',
  },
}

interface IPositionInfo {
  ticker: string
  size: number
  direction: string
  bid: number
  offer: number
  value: number
}

export interface IOrderCalc {
  asset: {
    ticker: string
    name: string
    price: {
      ask: number
      bid: number
    }
    minQty: number
    fractional: boolean
    decimals: number
  }
  account: {
    balance: number
    leverage: number
    leverageBalance: number
    currencySymbol: string
    currencyCode: string
  }
  existingPosition: {
    valueInBase: number
    currentPortfolioAllocation: number
    remainingValue: number
  }
  portfolio: {
    net: Array<IPositionInfo>
    raw: Array<IPositionInfo>
  }
  portfolioStats: {
    long: number
    short: number
    net: number
    remaining: number
  }
  order: {
    default: {
      value: number
      valueWithConviction: number
      portfolioAllocation: number
    }
    settings: {
      conviction: number
      maxPortfolioSize: number
      maxPortfolioValue: number
    }
    calc: {
      maxPortfolioValueExceeded: boolean
      maxPortfolioValueExceededBy: number
      overrideLimits: boolean
      exceedsMinQty: boolean
      maxPortfolioExposureExceeded: boolean
      maxPortfolioExposureExceededBy: number
    }
    potential: {
      direction: string
      value: number
      quantity: number
      orderSizePercentage: number
      portfolio: {
        value: number
        allocation: number
      }
      price: {
        value: number
        type: string
      }
    }
    final: {
      direction: DirectionType
      value: number
      quantity: {
        raw: number
        rounded: number
      }
      orderSizePercentage: number
      portfolio: {
        value: number
        allocation: number
      }
      price: {
        value: number
        type: string
      }
    }
  }
}

const defaultOrderCalc: IOrderCalc = {
  asset: {
    ticker: '',
    name: '',
    price: {
      ask: 0,
      bid: 0,
    },
    minQty: 1,
    fractional: false,
    decimals: 1,
  },
  account: {
    balance: 0,
    leverage: 1,
    leverageBalance: 0,
    currencySymbol: '$',
    currencyCode: 'USD',
  },
  existingPosition: {
    valueInBase: 0,
    currentPortfolioAllocation: 0,
    remainingValue: 0,
  },
  portfolio: {
    net: [
      {
        ticker: '',
        size: 0,
        direction: '',
        bid: 0,
        offer: 0,
        value: 0,
      }
    ],
    raw: [
      {
        ticker: '',
        size: 0,
        direction: '',
        bid: 0,
        offer: 0,
        value: 0,
      }
    ]
  },
  portfolioStats: {
    long: 0,
    short: 0,
    net: 0,
    remaining: 0,
  },
  order: {
    default: {
      value: 0,
      valueWithConviction: 0,
      portfolioAllocation: 0,
    },
    settings: {
      conviction: 0,
      maxPortfolioSize: 1,
      maxPortfolioValue: 0,
    },
    calc: {
      maxPortfolioValueExceeded: false,
      maxPortfolioValueExceededBy: 0,
      overrideLimits: false,
      exceedsMinQty: true,
      maxPortfolioExposureExceeded: false,
      maxPortfolioExposureExceededBy: 0,
    },
    potential: {
      direction: '',
      value: 0,
      quantity: 0,
      orderSizePercentage: 0,
      portfolio: {
        value: 0,
        allocation: 0,
      },
      price: {
        value: 0,
        type: '',
      }
    },
    final: {
      direction: null as any,
      value: 0,
      quantity: {
        raw: 0,
        rounded: 0,
      },
      orderSizePercentage: 0,
      portfolio: {
        value: 0,
        allocation: 0,
      },
      price: {
        value: 0,
        type: '',
      }
    }
  }
}

const defaultOrderCalcUsingtheAccountBalance = (
  initialObject: IOrderCalc,
  valuesToSet: {
    orderLimits: boolean,
    defaultOrderSize: number,
    conviction: number,
    maxSizePortofolio: number,
    direction: DirectionType,
  }
): any => {

  // updatye our override setting
  initialObject.order.calc.overrideLimits =
    valuesToSet.orderLimits;

  // we're just calculating the default
  initialObject.order.default.portfolioAllocation =
    valuesToSet.defaultOrderSize;

  initialObject.order.default.value =
    (valuesToSet.defaultOrderSize / 100) * initialObject.account.balance;

  initialObject.order.default.valueWithConviction =
    initialObject.order.default.value * (valuesToSet.conviction / 100);

  initialObject.order.settings.conviction =
    valuesToSet.conviction;

  initialObject.order.settings.maxPortfolioSize =
    valuesToSet.maxSizePortofolio;

  initialObject.order.settings.maxPortfolioValue =
    (initialObject.order.settings.maxPortfolioSize / 100) * initialObject.account.leverageBalance;

  // does the calculated value exceed the max?
  // we need the combined value of the order and the existing portfolio value
  const aggregatePosition =
    initialObject.existingPosition.valueInBase + initialObject.order.default.valueWithConviction;

  if (aggregatePosition > initialObject.order.settings.maxPortfolioValue) {

    initialObject.order.calc.maxPortfolioValueExceeded = true;

    initialObject.order.calc.maxPortfolioValueExceededBy =
      initialObject.order.default.valueWithConviction -
      initialObject.order.settings.maxPortfolioValue;

  } else {
    initialObject.order.calc.maxPortfolioValueExceeded = false;
    initialObject.order.calc.maxPortfolioValueExceededBy = 0;
  }

  // our remaining position size (related to the existing portfolio position) needs to be calculated here
  initialObject.existingPosition.remainingValue =
    initialObject.order.settings.maxPortfolioValue - initialObject.existingPosition.valueInBase;

  // now we check to see if our maximum (total/net) portfolio exposure would be exceeded
  // initialObject.portfolio.net
  // initialObject.account.leverageBalance
  // maxPortfolioExposureExceeded
  // initialObject.order.default.valueWithConviction
  if (initialObject.order.default.valueWithConviction > initialObject.portfolioStats.remaining) {

    initialObject.order.calc.maxPortfolioExposureExceeded = true;

    initialObject.order.calc.maxPortfolioExposureExceededBy =
      initialObject.order.default.valueWithConviction - initialObject.portfolioStats.remaining;
  }

  // PRE

  // the potential order size is that before any vaidations are appliued
  initialObject.order.potential.value =
    initialObject.order.default.valueWithConviction;

  initialObject.order.potential.portfolio.value =
    initialObject.existingPosition.valueInBase + initialObject.order.default.valueWithConviction;

  initialObject.order.potential.portfolio.allocation =
    initialObject.order.potential.portfolio.value / initialObject.account.leverageBalance * 100;

  // qty needs to be worked out based on the price
  // if the direction 'buy' we using the bid
  initialObject.order.potential.direction = valuesToSet.direction;

  // and sell, we use the ask
  if (initialObject.order.potential.direction.toLowerCase() === 'sell') {
    initialObject.order.potential.price.type = 'sell';
    initialObject.order.potential.price.value = initialObject.asset.price.bid;
  } else {
    initialObject.order.potential.price.type = 'buy';
    initialObject.order.potential.price.value = initialObject.asset.price.ask;
  }

  // now we have a price, we can work out the qty

  initialObject.order.potential.quantity =
    initialObject.order.potential.value / initialObject.order.potential.price.value;

  // FINAL
  // work out our final values

  // qty needs to be worked out based on the price
  // if the direction 'buy' we using the bid
  initialObject.order.final.direction =
    valuesToSet.direction;

  // are we above the minimum qty
  if (initialObject.order.final.quantity.raw < initialObject.asset.minQty) {
    initialObject.order.calc.exceedsMinQty = true;
  } else {
    initialObject.order.calc.exceedsMinQty = false;
  }

  // and sell, we use the ask
  if (initialObject.order.final.direction.toLowerCase() === 'sell') {
    initialObject.order.final.price.type = 'sell';
    initialObject.order.final.price.value = initialObject.asset.price.bid;
  } else {
    initialObject.order.final.price.type = 'buy';
    initialObject.order.final.price.value = initialObject.asset.price.ask;
  }

  // allow for the min qty and exceeding any portfolio values (or not)
  // if it's below the minimum, then everything goes to zero
  if (!initialObject.order.calc.exceedsMinQty) {

    initialObject.order.final.value = 0;
    initialObject.order.final.quantity.raw = 0;
    initialObject.order.final.quantity.rounded = 0;
    initialObject.order.final.orderSizePercentage = 0;

  } else {

    let howBigAPositionCanWeHave = initialObject.existingPosition.remainingValue;

    // if our total portfolio exposure is exceeded, then this is ou
    if (initialObject.order.calc.maxPortfolioExposureExceeded) {

      // if this is greater than the limit we can have for a single positionm 
      // then we need to reduce our position
      if (initialObject.order.calc.maxPortfolioExposureExceededBy > howBigAPositionCanWeHave) {
        howBigAPositionCanWeHave = howBigAPositionCanWeHave - initialObject.order.calc.maxPortfolioExposureExceededBy;
      }
    }

    // if the validations don't pass, we need to restrict the order value to the remaining position
    // unless the user explcitly says to do otherwise
    if (initialObject.order.calc.maxPortfolioValueExceededBy) {

      // if the user is overriding the settings we use the potential
      if (!initialObject.order.calc.overrideLimits) {

        // use the remaining value
        initialObject.order.final.value = howBigAPositionCanWeHave;
        initialObject.order.final.orderSizePercentage = initialObject.order.final.value / initialObject.account.leverageBalance * 100;
        initialObject.order.final.portfolio.value = initialObject.existingPosition.valueInBase + initialObject.order.final.value;
        initialObject.order.final.portfolio.allocation = initialObject.order.potential.portfolio.value / initialObject.account.leverageBalance * 100;

      } else {

        // use the potential (without adjustment)
        initialObject.order.final.value = initialObject.order.default.valueWithConviction;
        initialObject.order.final.orderSizePercentage = initialObject.order.final.value / initialObject.account.leverageBalance * 100;
        initialObject.order.final.portfolio.value = initialObject.existingPosition.valueInBase + initialObject.order.final.value;
        initialObject.order.final.portfolio.allocation = initialObject.order.potential.portfolio.value / initialObject.account.leverageBalance * 100;

      }

    } else {

      initialObject.order.final.value = initialObject.order.default.valueWithConviction;
      initialObject.order.final.orderSizePercentage = initialObject.order.final.value / initialObject.account.leverageBalance * 100;
      initialObject.order.final.portfolio.value = initialObject.existingPosition.valueInBase + initialObject.order.final.value;
      initialObject.order.final.portfolio.allocation = initialObject.order.potential.portfolio.value / initialObject.account.leverageBalance * 100;

    }

    // now we have a price, we can work out the qty
    initialObject.order.final.quantity.raw = initialObject.order.final.value / initialObject.order.final.price.value;

    // round the qty
    if (initialObject.asset.fractional) {
      initialObject.order.final.quantity.rounded = parseFloat(initialObject.order.final.quantity.raw.toFixed(initialObject.asset.decimals));
    } else {
      // if fraction isn't supported, then we need an int
      initialObject.order.final.quantity.rounded = Math.floor(initialObject.order.final.quantity.raw);
    }

    // then we need to deal with custom qty and value
    // if the validations all pass, then we can use our standard 
    return initialObject;

  }
}

export const orderCalc = async (
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
  const data = defaultOrderCalc;

  const form = {
    conviction: 100,
    orderLimits: false,
    maxLeverage: 1,
    defaultOrderSize: 2,
    maxSizePortofolio: 10,
    direction: params.payload.direction,
  };

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
    const accountCurrencySymbol = (currencyInfo as any)[currency || 'GBP']?.symbol;

    // check to see if there are any assets other than the base currency of the account
    const diffAssets = positions?.filter((res) => res.position.currency !== currency) || [];

    // console.log('diffAssets', diffAssets);

    // good example to do, the demo account have 2 existing positions in USD and the other in GBP
    if (diffAssets.length > 0) {
      // pending to add the conversion and logic, etc
    }

    data.account.currencyCode = currency;
    data.account.currencySymbol = accountCurrencySymbol;
    data.account.leverageBalance = data.account.balance * data.account.leverage;

    // reset our portfolio
    data.portfolio.raw = [];
    data.portfolio.net = [];
    // and reset our portfolio stats
    data.portfolioStats.long = 0;
    data.portfolioStats.short = 0;
    data.portfolioStats.net = 0;

    // loop through the positions to get the totafl existing exposure
    for (const p in positions) {
      if (p) {

        let val = 0;
        let direction = 'Neutral';
        if (positions[p].position.direction === 'SELL') {
          val = positions[p].market.bid * positions[p].position.contractSize;
          direction = 'Short';
          data.portfolioStats.short = data.portfolioStats.short + val;
        } else {
          val = positions[p].market.offer * positions[p].position.contractSize;
          direction = 'Long';
          data.portfolioStats.long = data.portfolioStats.long + val;
        }
        data.portfolioStats.net = data.portfolioStats.long - data.portfolioStats.short;


        // always add the raw
        const rawPosition = {
          ticker: positions[p].market.epic,
          size: positions[p].position.contractSize,
          direction,
          bid: positions[p].market.bid,
          offer: positions[p].market.offer,
          value: val,
        }
        data.portfolio.raw.push(rawPosition);

        // create our net 
        const existing = data.portfolio.net.filter(res => res.ticker === positions[p].market.epic) || [];
        if (existing.length > 0) {
          // console.log('existing position for ', positions[p].market.epic);

          data.portfolio.net.filter(res => {
            // console.log('check the existing position for ', positions[p].market.epic);
            if (res.ticker === positions[p].market.epic) {

              // console.log('update the existing position for ', positions[p].market.epic);
              if (rawPosition.direction === 'SELL' || rawPosition.direction === 'Short') {
                res.size = res.size - rawPosition.size;
                res.value = res.value - rawPosition.value;
              } else if (rawPosition.direction === 'BUY' || rawPosition.direction === 'Long') {
                res.size = res.size + rawPosition.size;
                res.value = res.value + rawPosition.value;
              }

              // set the overall direction
              if (res.size > 0) {
                res.direction = 'Long';
              } else if (res.size < 0) {
                res.direction = 'Short';
              } else {
                res.direction = 'Neutral';
              }
              // console.log('updated res', res);
            }
            return res;
          })
        } else {

          // console.log('add the new existing position for ', positions[p].market.epic);
          // console.log('add the new existing position for ', rawPosition);
          data.portfolio.net.push(rawPosition);
        }

      }
    }
    // console.log('data.portfolio', data.portfolio);

    const accountBalance = account?.balance?.balance || 0;

    data.account.balance = accountBalance;
    data.account.leverageBalance = accountBalance * data.account.leverage;

    // update our total remaining portfolo 'space'
    data.portfolioStats.remaining = data.account.leverageBalance - data.portfolioStats.net;

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

    defaultOrderCalcUsingtheAccountBalance(
      data,
      {
        orderLimits: form.orderLimits,
        defaultOrderSize: form.defaultOrderSize,
        conviction: form.conviction,
        maxSizePortofolio: form.maxSizePortofolio,
        direction: form.direction as DirectionType,
      }
    );

  } catch (err: any) {

  }

  return data;
}