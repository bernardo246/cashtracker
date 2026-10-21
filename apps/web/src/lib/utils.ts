import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// `text-display` é um tamanho de fonte do @theme; sem isto o tailwind-merge o trata como cor.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["display"] }] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
