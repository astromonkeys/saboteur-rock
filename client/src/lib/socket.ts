import { io, Socket } from "socket.io-client";
import { writable } from "svelte/store";

const SERVER_URL = "http://localhost:8080"; // your Node server

export const connected = writable(false);

export const socket: Socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ["websocket"]
});

// connection lifecycle
socket.on("connect", () => {
  console.log("connected", socket.id);
  connected.set(true);
});

socket.on("disconnect", (reason) => {
  console.log("disconnected:", reason);
  connected.set(false);
});

export function connect() {
  if (!socket.connected) socket.connect();
}

export function disconnect() {
  socket.disconnect();
}
