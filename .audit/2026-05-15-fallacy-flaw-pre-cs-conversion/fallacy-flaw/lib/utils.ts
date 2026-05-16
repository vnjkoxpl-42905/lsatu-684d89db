import clsx, { type ClassValue } from 'clsx';

export function cn(...args: ClassValue[]) {
  return clsx(...args);
}

export function pct(num: number, denom: number) {
  if (denom === 0) return 0;
  return Math.round((num / denom) * 100);
}
