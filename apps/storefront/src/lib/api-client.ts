export const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000/api/v1";

type ApiFailure = { ok: false; error?: { message?: string } };
let refreshPromise:Promise<boolean>|null=null;
async function refreshAccess(){if(refreshPromise)return refreshPromise;refreshPromise=(async()=>{const refreshed=await fetch(`${apiBase}/auth/refresh`,{method:"POST",headers:{"X-Client-Type":"storefront"},credentials:"include"});if(!refreshed.ok)return false;const payload=await refreshed.json() as {ok:true;data:{accessToken:string}};sessionStorage.setItem("buyhksim-access-token",payload.data.accessToken);return true})().catch(()=>false).finally(()=>{refreshPromise=null});return refreshPromise}

export async function apiRequest<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = typeof window === "undefined" ? null : sessionStorage.getItem("buyhksim-access-token");
  const headers = new Headers(init.headers);
  headers.set("x-client-type","storefront");
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);
  const response = await fetch(`${apiBase}${path}`, { ...init, headers, credentials: "include" });
  if (response.status === 401 && retry && path !== "/auth/refresh") {
    if(await refreshAccess())return apiRequest<T>(path,init,false);
    sessionStorage.removeItem("buyhksim-access-token");
  }
  const payload = await response.json() as T | ApiFailure;
  if (!response.ok || (typeof payload === "object" && payload !== null && "ok" in payload && payload.ok === false)) {
    throw new Error((payload as ApiFailure).error?.message ?? `请求失败（${response.status}）`);
  }
  return payload as T;
}

export async function endSession() {
  try { await apiRequest("/auth/logout", { method: "POST" }, false); }
  finally { sessionStorage.removeItem("buyhksim-access-token"); }
}
