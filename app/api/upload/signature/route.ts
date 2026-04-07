import crypto from "crypto";
import { getTime } from "date-fns";

import { NextResponse } from "next/server";

export async function POST(){
    try {
        const timestamp = Math.round(new Date().getTime()/1000);

        const paramsToSign = `timestamp=${timestamp}`;

        const signature = crypto
                .createHash('sha1')
                .update(paramsToSign + process.env.CLOUDINARY_API_SECRET)
                .digest("hex");
        
        return NextResponse.json({
            timestamp,
            signature,
            api_key:process.env.CLOUDINARY_API_KEY,
           cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        })
    } catch (err:any) {
        return NextResponse.json(
            {err:"signature error"},
            {status:500}
        )
    }
}