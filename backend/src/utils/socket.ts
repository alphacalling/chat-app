import type { Server } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
} from "../types/type.js";

let ioInstance: Server<
  ClientToServerEvents,
  ServerToClientEvents,
  {},
  SocketData
> | null = null;

export function setIO(
  io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>
): void {
  ioInstance = io;
}

export function getIO(): Server<
  ClientToServerEvents,
  ServerToClientEvents,
  {},
  SocketData
> | null {
  return ioInstance;
}
