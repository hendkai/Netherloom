export type JsonRpcValue = string | number | boolean | null | JsonRpcValue[] | { [key: string]: JsonRpcValue };

export type JsonRpcResponse<T = JsonRpcValue> = {
  id: string | number;
  jsonrpc: "2.0";
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: JsonRpcValue;
  };
};

export async function callI2PControl<T = JsonRpcValue>(
  method: string,
  params: Record<string, JsonRpcValue> = {},
  token?: string,
): Promise<JsonRpcResponse<T>> {
  const response = await fetch("./api/i2pcontrol", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: Date.now(),
      jsonrpc: "2.0",
      method,
      params: token ? { ...params, Token: token } : params,
    }),
  });

  if (!response.ok) {
    throw new Error(`I2PControl proxy returned ${response.status}`);
  }
  return response.json() as Promise<JsonRpcResponse<T>>;
}

export async function authenticateI2PControl(password: string) {
  return callI2PControl<{ Token: string }>("Authenticate", { API: 1, Password: password });
}

export async function readRouterMetrics(token: string) {
  return callI2PControl("RouterInfo", {
    "i2p.router.status": "",
    "i2p.router.uptime": "",
    "i2p.router.net.status": "",
    "i2p.router.net.bw.inbound.1s": "",
    "i2p.router.net.bw.outbound.1s": "",
    "i2p.router.net.tunnels.participating": "",
    "i2p.router.netdb.knownpeers": "",
    "i2p.router.netdb.activepeers": "",
  }, token);
}
