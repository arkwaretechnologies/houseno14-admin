export const DEMO_MODE_COOKIE = "pv-demo-mode";

export function setDemoCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${DEMO_MODE_COOKIE}=1; Path=/; SameSite=Lax`;
}

export function clearDemoCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${DEMO_MODE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function hasDemoCookie(
  cookieHeaderOrStore:
    | string
    | undefined
    | { get: (name: string) => { value: string } | undefined }
) {
  if (!cookieHeaderOrStore) return false;

  if (typeof cookieHeaderOrStore === "string") {
    return cookieHeaderOrStore
      .split(";")
      .some((part) => part.trim() === `${DEMO_MODE_COOKIE}=1`);
  }

  return cookieHeaderOrStore.get(DEMO_MODE_COOKIE)?.value === "1";
}
