const isDev = import.meta.env.DEV;

export function devLog(...args: any[]): void {
  if (isDev) console.log(...args);
}

export function devWarn(...args: any[]): void {
  if (isDev) console.warn(...args);
}

export function devError(...args: any[]): void {
  if (isDev) console.error(...args);
}
