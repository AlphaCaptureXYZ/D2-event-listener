import 'dotenv/config';

const APP_ENV: 'development' | 'production' =
    (process.env.APP_ENV as any) || 'development';

const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;

export {
    APP_ENV,
    WALLET_PRIVATE_KEY,
}