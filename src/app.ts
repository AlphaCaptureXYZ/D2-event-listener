import 'dotenv/config';

import {
    D2EventListener
} from "./event-listener";

import {
    WebSocketModule
} from "./event-listener/modules/web-socket.module";

import {
    EventEmitterModule as EventEmitter,
    EventType
} from './event-listener/modules/event-emitter.module';

import * as http from "http";
import * as express from 'express';
import * as cors from 'cors';
import * as bodyParser from 'body-parser';

const app = express();

app.use(cors());
app.enable("trust proxy");
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: false }));

const PORT = process.env.PORT || 3006;

app.get('/', (req, res) => {
    EventEmitter().emit('WS_LOG', { ping: true });
    res.status(200).json({
        message: 'D2 Event Listener API running...',
        status: 'success',
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
            network: 'mumbai',
            privateKey: process.env.WALLET_PRIVATE_KEY,
        });
    } catch (err: any) {
        console.log('Main Error: ', err?.message);
    }
})();