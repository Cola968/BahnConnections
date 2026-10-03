export const APP_VERSION = "41.0";
export const APP_VERSION_LABEL = `V${APP_VERSION}`;

export function isNewerAppVersion(candidate: string, current = APP_VERSION) {
  const parse = (value: string) => value.replace(/^v/i, "").split(".").map((part) => Number.parseInt(part, 10) || 0);
  const left = parse(candidate);
  const right = parse(current);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    if (a !== b) return a > b;
  }
  return false;
}
