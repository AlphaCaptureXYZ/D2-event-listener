import { rejects } from 'assert';
import { decimalAdjust } from '../../../../helpers/helpers';

export interface IOrderPortfolioActions {
    new: any[],
    decrease: any[],
    same: any[],
    increase: any[],
    close: any[],
}

export interface IOrderCalcPortfolio {
    account: {
      balance: number,
      leverage: number,
      leverageBalance: number,
      currencySymbol: string,
      currencyCode: string,
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
}
  
const defaultOrderCalcPortfolio: IOrderCalcPortfolio = {
    account: {
        balance: 0,
        leverage: 1,
        leverageBalance: 0,
        currencySymbol: '£',
        currencyCode: 'GBP',
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

}

const actions: IOrderPortfolioActions = {
    new: [],
    decrease: [],
    same: [],
    increase: [],
    close: [],
}

  //////
const currentPortfolio = (
  settings: {
    leverage: number,
    slippage: number,
  },
  portfolio: any[],
  account: {
    balance: number,
  }
): any => {

    // calc the leveraged balance

    // loop through the current portfolio from the broker
    // work out for each asset what the portflio percentage is

    // and return
}

const calculatePortfolio = (
    settings: {
      leverage: number,
      slippage: number,
    },
    portfolio: {
        intended: any[],
        current: any[],
    },
    account: {
      balance: number,
    }
  ): any => {
  
    // total allocation check
    const allocationExceeded = totalAllocationCheck(portfolio);

    if (allocationExceeded.exceeded) {
        return allocationExceeded;
    }

    // duplication check
    const duplicates = duplicateChecks(portfolio);
    if (duplicates) {
        const msg = 'Duplicate tickers';
        return msg;
    }

    const leverageBalance = account.balance * settings.leverage * ((100 - settings.slippage)/100);
    // adjusted for slippage
    const adjustedLeverageBalance = account.balance * settings.leverage * ((100 - settings.slippage)/100);

    // console.log('adjustedLeverageBalance', adjustedLeverageBalance);

    // work out the allocation of the current portfolio
    for (const i in portfolio.current) {
        if (i) {
            // use the leveraged non-slippage adjusted value...
            portfolio.current[i].allocation = portfolio.current[i].value / leverageBalance * 100;
        }
    }

    for (const i in portfolio.current) {
        if (i) {

            // what assets are in the current portfolio that are not in the intended portfolio
            // these will need to be sold i.e. removed completely
            const asset = portfolio.intended.filter(row => row.ticker === portfolio.current[i].ticker);
            if (asset.length === 0) {
                actions.close.push(portfolio.current[i]);
            } else {

                // we only have a single object here (in all cases, as we check for duplicates above)
                // intended equals...
                if (asset[0].allocation === portfolio.current[i].allocation) {
                    actions.same.push(asset[0]);
                } else if (asset[0].allocation > portfolio.current[i].allocation) {
                    // add the increase in value
                    // add what the final value should be

                    // value
                    const valueIntended = asset[0].allocation * adjustedLeverageBalance;
                    const valueCurrent = asset[0].allocation;
                    const valueDiff = valueIntended - valueCurrent;

                    const value = {
                        intended: valueIntended,
                        current: valueCurrent,
                        diff: valueDiff,
                    };
                    asset[0].value = value;
                    actions.increase.push(asset[0]);
                } else {
                    // add the decrease in value
                    // add what the final value should be

                    // value
                    const valueIntended = asset[0].allocation * adjustedLeverageBalance;
                    const valueCurrent = asset[0].allocation;
                    const valueDiff = valueCurrent - valueIntended;

                    const value = {
                        intended: valueIntended,
                        current: valueCurrent,
                        diff: valueDiff,
                    };
                    asset[0].value = value;
                    actions.decrease.push(asset[0]);
                }
            }
        }
    }

    for (const i in portfolio.intended) {
        if (i) {

            // what assets are in the current portfolio that are not in the intended portfolio
            // these will need to be sold i.e. removed completely
            if (portfolio.current.filter(row => row.ticker === portfolio.intended[i].ticker).length === 0) {
                actions.new.push(portfolio.intended[i]);
            }
            
        }
    }

    // calculate the actual orders
    // new orders are the easiest

    for (const m in actions.new) {
        if (m) {
         actions.new[m].value = adjustedLeverageBalance * (actions.new[m].allocation / 100);
        }
    }

    // we need to update the quantities
    // but first we need to get the data from the broker
    // and get current qty and the pricing so we can work out what to buy or sell
 
    // for (const m in actions.increase) {
    //     if (m) {
    //      actions.increase[m].value = adjustedLeverageBalance * (actions.increase[m].allocation / 100);         
    //     }
    // }

    // for (const m in actions.decrease) {
    //     if (m) {
    //      actions.decrease[m].value = adjustedLeverageBalance * (actions.decrease[m].allocation / 100);         
    //     }
    // }


    return actions;

}
 
const totalAllocationCheck = (
    portfolio: {
        intended: any[],
    },
  ): any => {

    let totalExceeded = false;
    let totalAllocation = 0;

    for (const i in portfolio.intended) {
        if (i) {
            totalAllocation = totalAllocation + portfolio.intended[i].allocation || 0;
        }
    }

    if (totalAllocation > 100) {
        totalExceeded = true;
    }

    const response = {
        total: totalAllocation,
        exceeded: totalExceeded,
    }

    return response;
}

const duplicateChecks = (
    portfolio: {
        intended: any[],
    },
  ): any => {

    let duplicates = false;
    
    const set = new Set();
    
    if (portfolio.intended.some((object) => set.size === (set.add(object.ticker), set.size))) {
        // console.log('Array has duplicated property values!');
        duplicates = true;
    }    
    return duplicates;
}

// const rebalancePortfolio = (data: IOrderPortfolioActions): any => {

//     // now we have everything we need to place trades

//     // we'll need to place the order in the correct brokerage
//     // we'll keep the code here just to test


//     return duplicates;
// }


export const OrderCalcPortfolio = {
  constants: {
    defaultOrderCalcPortfolio,
  },
  functions: {
    currentPortfolio,
    calculatePortfolio
  }
}