import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

export function dateStr(date: Date) {
  return format(date, "yyyy-MM-dd");
}
