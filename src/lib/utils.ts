import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const statusLabel = {
  open: "Geöffnet",
  closed: "Geschlossen",
  limited: "Eingeschränkt",
  maintenance: "Vorübergehend nicht verfügbar"
} as const;
