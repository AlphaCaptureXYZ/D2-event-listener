import 'dotenv/config';

import {
    D2EventListener
} from "./event-listener";

import {
    WebSocketModule
} from "./event-listener/modules/web-socket.module";

import * as http from "http";
import * as express from 'express';
import * as cors from 'cors';
import * as bodyParser from 'body-parser';

import { wsLogger } from './event-listener/utils/utils';

const app = express();

app.use(cors());
app.enable("trust proxy");
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: false }));

const PORT = process.env.PORT || 3006;
const version = process.env.version || '5';

app.get('/', (req, res) => {

    wsLogger({
        type: 'info',
        message: 'Ping'
    });

    const d2Status = process.env.D2_STATUS || null;

    let message = 'D2 Event Listener API running...';
    let status = 'success';

    if (d2Status === 'pending') {
        message = 'THE D2 EVENT LISTENER HAS NOT YET STARTED';
        status = 'pending';
    }

    res.status(200).json({
        message,
        status,
        d2Status: status,
        version,
    });
});

const server = http.createServer(app);

server.setTimeout(120_000);

server.on("clientError", (err, socket) => {
    console.error(err);
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

server.addListener("sessionError", (err, session) => session.destroy(err));

server.addListener("session", (session) =>
    session.setTimeout(60_000, () => session.destroy(new Error("TIMEOUT")))
);

server.addListener("stream", (stream) =>
    stream.addListener("error", (err) => stream.destroy(err))
);

server.timeout = 600000;

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('');
});

WebSocketModule.initialize(server);

(async function main() {
    try {
        await D2EventListener({
            network: 'polygon',
            privateKey: process.env.WALLET_PRIVATE_KEY,
        });
    } catch (err: any) {
        console.log('Main Error: ', err?.message);
    }
})();