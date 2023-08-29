import 'dotenv/config';

import {
    D2EventListener
} from "./event-listener";

import * as express from 'express';
import * as cors from 'cors';
import * as bodyParser from 'body-parser';

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: false }));

const PORT = process.env.PORT || 3006;

app.get('/', (req, res) => {
    res.status(200).json({
        message: 'D2 Event Listener'
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('');
});

(async function main() {
    try {

        D2EventListener({
            network: 'mumbai',
            privateKey: process.env.WALLET_PRIVATE_KEY,
        });

    } catch (err: any) {
        console.log('Main Error: ', err?.message);
    }
})();