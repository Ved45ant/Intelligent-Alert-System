export function info(msg: string, meta?: any) {
  // eslint-disable-next-line no-console
  console.log("[info]", msg, meta || "");
}

export function error(msg: string, meta?: any) {
  // eslint-disable-next-line no-console
  console.error("[error]", msg, meta || "");
}
