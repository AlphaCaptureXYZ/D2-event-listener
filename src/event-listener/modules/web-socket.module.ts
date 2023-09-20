import * as http from "http";
import * as https from "https";

import WebSocket, { Server as WebSocketServer } from "ws";

import {
  EventEmitterModule as EventEmitter,
  EventType
} from '../modules/event-emitter.module';

const initialize = (server: https.Server | http.Server): void => {
  let walletAddress = null;

  const wss = new WebSocketServer({
    server,
    verifyClient: async (info, done) => {
      const url = info?.req?.url;
      const qs = url?.split("/?")[1];
      const queryParams = new URLSearchParams(qs);

      walletAddress = queryParams?.get("walletAddress");
      
      done(true);
    },
  });

  wss.on("connection", async (ws: any) => {
    if (walletAddress !== undefined && walletAddress !== null) {
      ws.clientInfo = {
        walletAddress
      };
    }
    wsDataHandler(wss, ws);
  });

  EventEmitter().listen().subscribe((res: any) => {
    const event = res.type as EventType;
    const data = res?.data || null;

    switch (event) {
      case "WS_LOG":
        wss?.clients?.forEach((client: any) => {
          client.send(JSON.stringify(data));
        });
        break;
    }
  });
};

const wsDataHandler = (wss: WebSocketServer, ws: WebSocket) => {
  try {
    ws.on("message", async (message) => {
      try {
        wss.clients.forEach((client: any) => {
          if (client?.clientInfo?.isDeveloper) {
            client.send(message?.toString());
          }
        });
      } catch (err) {
        console.log("ERROR: WebSocketHandler", err.message);
      }
    });
  } catch (err) {
    console.log("ERROR: WebSocketHandler", err.message);
  }
};

export const WebSocketModule = {
  initialize,
};
