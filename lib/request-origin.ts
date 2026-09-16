type RequestWithOrigin = {
  headers: Pick<Headers, "get">;
  nextUrl: { protocol: string };
};

/** Compare the browser's Origin with the requested host, not the server bind address. */
export function isSameOrigin(request: RequestWithOrigin): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  const host = request.headers.get("host");
  if (!host) return false;

  try {
    const browserOrigin = new URL(origin);
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const protocol = forwardedProtocol || request.nextUrl.protocol.slice(0, -1);
    return browserOrigin.host.toLowerCase() === host.toLowerCase()
      && browserOrigin.protocol === `${protocol}:`;
  } catch {
    return false;
  }
}
