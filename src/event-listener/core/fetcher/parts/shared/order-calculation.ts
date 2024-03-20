import { decimalAdjust } from '../../../../helpers/helpers';
import { IOrderCalcPortfolio } from './portfolio-calculation';

export type DirectionType = 'buy' | 'sell';

export type IdeaType = 'open' | 'adjust' | 'close' | 'manual' | 'portfolio';

//////

export interface IOrderCalc {
  asset: {
    ticker: string,
    expiry: string,
    name: string,
    price: {
      ask: number,
      bid: number,
    },
    minQty: number,
    fractional: boolean,
    decimals: number,
  },
  account: {
    balance: number,
    leverage: number,
    leverageBalance: number,
    currencySymbol: string,
    currencyCode: string,
  },
  existingPosition: {
    valueInBase: number,
    currentPortfolioAllocation: number,
    remainingValue: number,
  },
  portfolio: {
    net: Array<{
      ticker: string,
      size: number,
      direction: string,
      bid: number,
      offer: number,
      value: number,
    }>,
    raw: Array<{
      ticker: string,
      size: number,
      direction: string,
      bid: number,
      offer: number,
      value: number,
    }>
  },
  portfolioStats: {
    long: number,
    short: number,
    net: number,
    remaining: number,
  },
  order: {
    type: {
      value: string,
    }
    default: {
      value: number,
      valueWithConviction: number,
      portfolioAllocation: number,
    },
    settings: {
      conviction: number,
      maxPortfolioSize: number,
      maxPortfolioValue: number,
    },
    calc: {
      maxPortfolioValueExceeded: boolean,
      maxPortfolioValueExceededBy: number,
      overrideLimits: boolean,
      exceedsMinQty: boolean,
      maxPortfolioExposureExceeded: boolean,
      maxPortfolioExposureExceededBy: number,
      existingPositionOnOpenIdea: boolean,
    },
    potential: {
      portfolio: {
        value: number,
        allocation: number,
      },
      order: {
        direction: string,
        value: number,
        quantity: number,
        percentage: number,
      },
      price: {
        value: number,
        type: string,
      }
    },
    final: {
      order: {
        percentage: number,
        quantity: {
          raw: number,
          rounded: number,
        },
        direction: DirectionType,
        value: number,
      },
      portfolio: {
        value: number,
        allocation: number,
      },
      price: {
        value: number,
        type: string,
      }
    }
  }
}
const defaultOrderCalc: IOrderCalc = {
  asset: {
    ticker: '',
    name: '',
    expiry: '',
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
    currencySymbol: '£',
    currencyCode: 'GBP',
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
    type: {
      value: '',
    },
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
      existingPositionOnOpenIdea: false,
    },
    potential: {
      portfolio: {
        value: 0,
        allocation: 0,
      },
      order: {
        direction: '',
        value: 0,
        quantity: 0,
        percentage: 0,
      },
      price: {
        value: 0,
        type: '',
      }
    },
    final: {
      order: {
        percentage: 0,
        quantity: {
          raw: 0,
          rounded: 0,
        },
        direction: null as any,
        value: 0,
      },
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

//////


const setAccountLeverageBalance = (
  initialObject: IOrderCalc | IOrderCalcPortfolio,
  valuesToSet: {
    leverageMultiple: number,
  }
): any => {

  try{

    // update our trigger settings
    initialObject.account.leverage = valuesToSet.leverageMultiple;
    // the leverage balance was original using the default value of 1
    initialObject.account.leverageBalance = initialObject.account.balance * initialObject.account.leverage;

    return initialObject;

  } catch(err) {
    // console.log('error on order-calc', err);
  }

}

const defaultOrderCalcUsingtheAccountBalance = (
  initialObject: IOrderCalc,
  ideaType: IdeaType,
  valuesToSet: {
    orderLimits: boolean,
    defaultOrderSize: number,
    conviction: number,
    maxSizePortofolio: number,
    direction: DirectionType,
    leverageMultiple: number,
  }
): any => {

  try{

    initialObject.order.type.value = ideaType;

    // update our  setting
    initialObject.order.calc.overrideLimits = valuesToSet.orderLimits;

    // update our trigger settings
    initialObject.account.leverage = valuesToSet.leverageMultiple;
    // the leverage balance was original using the default value of 1
    initialObject.account.leverageBalance = initialObject.account.balance * initialObject.account.leverage;

    // DEFAULT ORDER SIZE
    initialObject.order.default.portfolioAllocation = valuesToSet.defaultOrderSize;
    initialObject.order.default.value = (valuesToSet.defaultOrderSize / 100) * initialObject.account.leverageBalance;
    initialObject.order.default.valueWithConviction = initialObject.order.default.value * (valuesToSet.conviction / 100);
    initialObject.order.settings.conviction = valuesToSet.conviction;
    initialObject.order.settings.maxPortfolioSize = valuesToSet.maxSizePortofolio;
    initialObject.order.settings.maxPortfolioValue = (initialObject.order.settings.maxPortfolioSize / 100) * initialObject.account.leverageBalance;

    // EXISTING POSITION SIZE IN THE PORTFOLIO + OUR ORDER
    const aggregatePosition = initialObject.existingPosition.valueInBase + initialObject.order.default.valueWithConviction;

    // our remaining position size (related to the existing portfolio position) needs to be calculated here
    initialObject.existingPosition.remainingValue = initialObject.order.settings.maxPortfolioValue - initialObject.existingPosition.valueInBase;
    initialObject.existingPosition.currentPortfolioAllocation = (initialObject.existingPosition.valueInBase / initialObject.account.leverageBalance) * 100 || 0;

    // CHECK THIS DOESN'T EXCEED OUR MAX PORTFOLIO VALUE
    // does the calculated value exceed the max?
    if (aggregatePosition > initialObject.order.settings.maxPortfolioValue) {

      initialObject.order.calc.maxPortfolioValueExceeded = true;

      initialObject.order.calc.maxPortfolioValueExceededBy =
        Math.abs(initialObject.order.default.valueWithConviction -
        initialObject.order.settings.maxPortfolioValue);

    } else {
      initialObject.order.calc.maxPortfolioValueExceeded = false;
      initialObject.order.calc.maxPortfolioValueExceededBy = 0;
    }

    // now we check to see if our maximum (total/net) portfolio exposure would be exceeded
    if (initialObject.order.default.valueWithConviction > initialObject.portfolioStats.remaining) {

      initialObject.order.calc.maxPortfolioExposureExceeded = true;

      initialObject.order.calc.maxPortfolioExposureExceededBy =
        initialObject.order.default.valueWithConviction - initialObject.portfolioStats.remaining;
    }

    // POTENTIAL ORDER SIZE
    // the potential order size is that before any vaidations are applied
    initialObject.order.potential.order.value = initialObject.order.default.valueWithConviction;
    initialObject.order.potential.portfolio.value = initialObject.existingPosition.valueInBase + initialObject.order.default.valueWithConviction;

    initialObject.order.potential.portfolio.allocation = initialObject.order.potential.portfolio.value / initialObject.account.leverageBalance * 100;

    initialObject.order.potential.order.percentage = initialObject.order.potential.order.value / initialObject.account.leverageBalance * 100;

    // qty needs to be worked out based on the price
    // if the direction 'buy' we using the bid
    initialObject.order.potential.order.direction = valuesToSet.direction;

    // and sell, we use the ask
    if (initialObject.order.potential.order.direction.toLowerCase() === 'sell') {
      initialObject.order.potential.price.type = 'sell';
      initialObject.order.potential.price.value = initialObject.asset.price.bid;
    } else {
      initialObject.order.potential.price.type = 'buy';
      initialObject.order.potential.price.value = initialObject.asset.price.ask;
    }

    // now we have a price, we can work out the qty
    initialObject.order.potential.order.quantity = initialObject.order.potential.order.value / initialObject.order.potential.price.value;

    let howBigAPositionCanWeHave = initialObject.existingPosition.remainingValue;
    // if our total portfolio exposure is exceeded, then this is ou
    if (initialObject.order.calc.maxPortfolioExposureExceeded) {

      // if this is greater than the limit we can have for a single positionm 
      // then we need to reduce our position
      if (initialObject.order.calc.maxPortfolioExposureExceededBy > howBigAPositionCanWeHave) {
        howBigAPositionCanWeHave = howBigAPositionCanWeHave - initialObject.order.calc.maxPortfolioExposureExceededBy;
      }
    }

    // FINAL CALC

    initialObject.order.final.order.direction = valuesToSet.direction;

    // and sell, we use the ask
    if (initialObject.order.final.order.direction.toLowerCase() === 'sell') {
      initialObject.order.final.price.type = 'sell';
      initialObject.order.final.price.value = initialObject.asset.price.bid;
    } else {
      initialObject.order.final.price.type = 'buy';
      initialObject.order.final.price.value = initialObject.asset.price.ask;
    }

    // IF THE USER OVERRIDES, THEN NO RULES APPLY
    if (initialObject.order.calc.overrideLimits) { 

      initialObject.order.final.order.value = initialObject.order.default.valueWithConviction;
      initialObject.order.final.order.percentage = initialObject.order.final.order.value / initialObject.account.leverageBalance * 100;
      initialObject.order.final.portfolio.value = initialObject.existingPosition.valueInBase + initialObject.order.final.order.value;
      initialObject.order.final.portfolio.allocation = initialObject.order.potential.portfolio.value / initialObject.account.leverageBalance * 100;

    } else {

      // if the validations don't pass, we need to restrict the order value to the remaining position
      // unless the user explcitly says to do otherwise
      if (initialObject.order.calc.maxPortfolioValueExceededBy > 0) {
          // use the remaining value
          initialObject.order.final.order.value = howBigAPositionCanWeHave;
          initialObject.order.final.order.percentage = initialObject.order.final.order.value / initialObject.account.leverageBalance * 100;
          initialObject.order.final.portfolio.value = Math.abs(initialObject.existingPosition.valueInBase) + Math.abs(initialObject.order.final.order.value);
          initialObject.order.final.portfolio.allocation = Math.abs(initialObject.order.potential.portfolio.value) / initialObject.account.leverageBalance * 100;

      } else if (Math.abs(initialObject.existingPosition.valueInBase) > 0 && ideaType === 'open') {
          // if the intent is to open a new position, but one is already open, then we don't buy anything

          initialObject.order.final.order.value = 0;
          initialObject.order.final.order.percentage = 0;
          initialObject.order.final.portfolio.value = Math.abs(initialObject.existingPosition.valueInBase);
          initialObject.order.final.portfolio.allocation = initialObject.order.final.portfolio.value / initialObject.account.leverageBalance * 100;

          // update our error too
          initialObject.order.calc.existingPositionOnOpenIdea = true;

      } else {  
          // use the potential (without adjustment)
          initialObject.order.final.order.value = initialObject.order.default.valueWithConviction;
          initialObject.order.final.order.percentage = initialObject.order.final.order.value / initialObject.account.leverageBalance * 100;
          initialObject.order.final.portfolio.value = Math.abs(initialObject.existingPosition.valueInBase) + Math.abs(initialObject.order.final.order.value);
          initialObject.order.final.portfolio.allocation = initialObject.order.final.portfolio.value / initialObject.account.leverageBalance * 100;
      }      

    }

    
    // now we have a price, we can work out the qty
    initialObject.order.final.order.quantity.raw = initialObject.order.final.order.value / initialObject.order.final.price.value;

    // round the qty
    if (initialObject.asset.fractional) {

      // decimals are reflected in the negative so...
      const assetDecimalsNeg = 0 - initialObject.asset.decimals;

      // initialObject.order.final.quantity.rounded = parseFloat(initialObject.order.final.quantity.raw.toFixed(initialObject.asset.decimals));
      initialObject.order.final.order.quantity.rounded = decimalAdjust("floor", initialObject.order.final.order.quantity.raw, assetDecimalsNeg);

    } else {
      // if fraction isn't supported, then we need an int
      initialObject.order.final.order.quantity.rounded = Math.floor(initialObject.order.final.order.quantity.raw);
    }


    // are we above the minimum qty
    if (initialObject.order.final.order.quantity.rounded < initialObject.asset.minQty) {
      initialObject.order.calc.exceedsMinQty = true;
    } else {
      initialObject.order.calc.exceedsMinQty = false;
    }

    // allow for the min qty and exceeding any portfolio values (or not)
    // if it's below the minimum, then everything goes to zero
    if (initialObject.order.calc.exceedsMinQty) {
      initialObject.order.final.order.value = 0;
      initialObject.order.final.order.quantity.raw = 0;
      initialObject.order.final.order.quantity.rounded = 0;
      initialObject.order.final.order.percentage = 0;
    }
    return initialObject;

  } catch(err) {
    // console.log('error on order-calc', err);
  }

}

export const OrderCalc = {
  constants: {
    defaultOrderCalc,
  },
  functions: {
    defaultOrderCalcUsingtheAccountBalance,
    setAccountLeverageBalance,
  }
}