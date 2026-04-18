
import { requireCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request:Request){
    try {
        const userId = requireCurrentUser();
        
        if(!userId){
            return NextResponse.json({
                error:"unauthorized",
                staus:401         
            })
        }
    } catch (error) {
        
    }
}