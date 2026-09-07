import clsx, { type ClassValue } from "clsx";

/** Thin wrapper around clsx for conditional class composition. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
