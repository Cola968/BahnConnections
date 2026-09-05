import type { CSSProperties } from "react";

export type RailCategory = "fern" | "regional" | "sbahn" | "ubahn";

const FALLBACK_COLORS: Record<RailCategory, string> = {
  fern: "#ec0016",
  regional: "#1455a0",
  sbahn: "#2f8f57",
  ubahn: "#596b75",
};

const BERLIN_LINE_COLORS: Record<string, string> = {
  u1:"#7dad4c", u2:"#da421e", u3:"#16683d", u4:"#f0d722", u5:"#7e5330",
  u6:"#8c6dab", u7:"#528dba", u8:"#224f86", u9:"#f3791d",
  s1:"#d84b9b", s2:"#16733f", s25:"#16733f", s26:"#16733f", s3:"#146eb4",
  s5:"#f37935", s7:"#7452a2", s8:"#64a545", s9:"#8d3f82", s15:"#d84b9b",
  s41:"#aa3c24", s42:"#cf6b2d", s45:"#b2477b", s46:"#b2477b", s47:"#b2477b",
  s75:"#7452a2", s85:"#16733f",
};

function validHex(value?: string) {
  const hex = value?.trim().replace(/^#/, "");
  return hex && /^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex) ? `#${hex.toLowerCase()}` : undefined;
}

function contrastText(background: string) {
  const compact = background.slice(1);
  const hex = compact.length === 3 ? compact.split("").map((character) => character + character).join("") : compact;
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 > 154 ? "#172b35" : "#ffffff";
}

export function serviceColors(category: RailCategory, routeColor?: string, routeTextColor?: string, lineName?: string, networkHint?: string) {
  const lineKey = lineName?.replace(/\s+/g, "").toLocaleLowerCase("de");
  const berlin = /berlin|bvg|s-bahn berlin/i.test(networkHint ?? "");
  const officialFallback = berlin && lineKey ? BERLIN_LINE_COLORS[lineKey] : undefined;
  const background = validHex(routeColor) ?? officialFallback ?? FALLBACK_COLORS[category];
  return { background, text:validHex(routeTextColor) ?? contrastText(background) };
}

export function serviceBadgeStyle(category: RailCategory, routeColor?: string, routeTextColor?: string, lineName?: string, networkHint?: string): CSSProperties {
  const colors = serviceColors(category, routeColor, routeTextColor, lineName, networkHint);
  return { backgroundColor:colors.background, borderColor:colors.background, color:colors.text };
}

export function cleanDestination(value?: string) {
  const cleaned = value?.trim().replace(/\s+/g, " ");
  return cleaned || undefined;
}
