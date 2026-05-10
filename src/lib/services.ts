import { Droplets, Milk, UtensilsCrossed, Newspaper, type LucideIcon } from "lucide-react";

export type ServiceType = "water" | "milk" | "tiffin" | "newspaper";

export interface ServiceMeta {
  type: ServiceType;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  colorVar: string; // tailwind text color class
  bgClass: string;
  description: string;
  prefix: string;
}

export const SERVICES: Record<ServiceType, ServiceMeta> = {
  water: {
    type: "water",
    label: "Water Supply",
    shortLabel: "Water",
    icon: Droplets,
    colorVar: "text-water",
    bgClass: "bg-water/10 text-water",
    description: "Deliver RO/cold water jars to homes and offices",
    prefix: "WS",
  },
  milk: {
    type: "milk",
    label: "Milk Supply",
    shortLabel: "Milk",
    icon: Milk,
    colorVar: "text-foreground",
    bgClass: "bg-milk/40 text-foreground",
    description: "Daily milk delivery in pre-set quantities",
    prefix: "MK",
  },
  tiffin: {
    type: "tiffin",
    label: "Tiffin Service",
    shortLabel: "Tiffin",
    icon: UtensilsCrossed,
    colorVar: "text-tiffin",
    bgClass: "bg-tiffin/15 text-tiffin",
    description: "Home-cooked meals across breakfast, lunch & dinner",
    prefix: "TF",
  },
  newspaper: {
    type: "newspaper",
    label: "Newspaper Delivery",
    shortLabel: "Newspaper",
    icon: Newspaper,
    colorVar: "text-newspaper",
    bgClass: "bg-newspaper/15 text-newspaper",
    description: "Daily papers with worker & holiday management",
    prefix: "NP",
  },
};

export const SERVICE_LIST: ServiceMeta[] = [
  SERVICES.water,
  SERVICES.milk,
  SERVICES.tiffin,
  SERVICES.newspaper,
];

export function formatINR(paise: number) {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(rupees);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function monthStartISO(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}