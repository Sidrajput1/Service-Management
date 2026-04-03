import crypto from "crypto";
import { getTime } from "date-fns";

import { NextResponse } from "next/server";

export async function POST(){
    try {
        const timeStamp = Math.round(new Date().getTime()/1000);

        const paramsToSign = `timeStamp=${timeStamp}`;

        const signature = crypto
                .createHash('sha1')
                .update(paramsToSign + process.env.CLOUDINARY_API_SECRET)
                .digest("hex");
        
        return NextResponse.json({
            timeStamp,
            signature,
            apiKey:process.env.CLOUDINARY_API_KEY,
           cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        })
    } catch (err:any) {
        return NextResponse.json(
            {err:"signature error"},
            {status:500}
        )
    }
}