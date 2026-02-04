import { useContext } from "react";
import { SocketContext } from "./socketContext";

export const useSocketContext = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error("useSocketContext must be used within SocketProvider");
  }
  return ctx;
};