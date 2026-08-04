const apiBase=process.env.NEXT_PUBLIC_API_BASE_URL??"http://127.0.0.1:4000/api/v1";
type Failure={ok:false;error?:{message?:string}};
let refreshPromise:Promise<boolean>|null=null;
async function refreshAccess(){if(refreshPromise)return refreshPromise;refreshPromise=(async()=>{const response=await fetch(`${apiBase}/auth/refresh`,{method:"POST",headers:{"X-Client-Type":"admin"},credentials:"include"});if(!response.ok)return false;const payload=await response.json() as {ok:true;data:{accessToken:string}};sessionStorage.setItem("buyhksim-admin-access-token",payload.data.accessToken);return true})().catch(()=>false).finally(()=>{refreshPromise=null});return refreshPromise}
async function readJson<T>(response:Response):Promise<T|Failure>{
  const contentType=response.headers.get("content-type")?.toLowerCase()??"";
  if(!contentType.includes("application/json"))throw new Error(response.ok?"服务返回了无法识别的数据格式":`服务暂时不可用（${response.status}）`);
  try{return await response.json() as T|Failure}catch{throw new Error("服务返回的数据格式错误，请稍后重试")}
}
export async function adminApi<T>(path:string,init:RequestInit={},retry=true):Promise<T>{
  const headers=new Headers(init.headers);const token=typeof window==="undefined"?null:sessionStorage.getItem("buyhksim-admin-access-token");
  headers.set("x-client-type","admin");
  if(init.body&&!headers.has("content-type")&&!(init.body instanceof FormData))headers.set("content-type","application/json");if(token)headers.set("authorization",`Bearer ${token}`);
  const response=await fetch(`${apiBase}${path}`,{...init,headers,credentials:"include"});
  if(response.status===401&&retry&&path!=="/auth/refresh"){if(await refreshAccess())return adminApi<T>(path,init,false);sessionStorage.removeItem("buyhksim-admin-access-token")}
  const payload=await readJson<T>(response);if(!response.ok||(typeof payload==="object"&&payload!==null&&"ok" in payload&&payload.ok===false))throw new Error((payload as Failure).error?.message??`请求失败（${response.status}）`);return payload as T;
}
