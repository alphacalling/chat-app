const isDev = process.env.NODE_ENV !== "production";

export function devLog(...args: any[]): void {
  if (isDev) console.log(...args);
}

export function devWarn(...args: any[]): void {
  if (isDev) console.warn(...args);
}

export function devError(...args: any[]): void {
  if (isDev) console.error(...args);
}
