"use client";
import { toast } from "sonner";
export function AdminAction({label,message,className=""}:{label:string;message:string;className?:string}){return <button onClick={()=>toast.success(message)} className={className}>{label}</button>}
