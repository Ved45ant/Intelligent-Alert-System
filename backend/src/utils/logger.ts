export function info(msg: string, meta?: any) {
  console.log("[info]", msg, meta || "");
}

export function error(msg: string, meta?: any) {
  console.error("[error]", msg, meta || "");
}
