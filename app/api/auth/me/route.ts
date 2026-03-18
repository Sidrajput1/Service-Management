import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(request:Request){
    try {
        const {userId} = getAuth();

        if(!userId){
            return NextResponse.json({
                error:"unauthorized",
                staus:401         
            })
        }
    } catch (error) {
        
    }
}