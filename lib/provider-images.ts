import crypto from "node:crypto";
import { ApiAuthError } from "@/lib/auth";
export const providerImageLimit = 3 * 1024 * 1024;
export function imageFormat(buffer: Uint8Array) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
    return "jpg";
  if (
    Buffer.from(buffer.subarray(0, 8)).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    )
  )
    return "png";
  if (
    Buffer.from(buffer.subarray(0, 4)).toString() === "RIFF" &&
    Buffer.from(buffer.subarray(8, 12)).toString() === "WEBP"
  )
    return "webp";
  return null;
}
function cloudinaryConfig() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME,
    key = process.env.CLOUDINARY_API_KEY,
    secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret)
    throw new ApiAuthError(
      "Business image uploads are temporarily unavailable",
      503,
    );
  return { cloud, key, secret };
}
export async function cloudinaryAction(
  action: "upload" | "destroy",
  fields: Record<string, string>,
  file?: Blob,
) {
  const { cloud, key, secret } = cloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signed = { ...fields, timestamp };
  const signature = crypto
    .createHash("sha1")
    .update(
      Object.entries(signed)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, value]) => `${name}=${value}`)
        .join("&") + secret,
    )
    .digest("hex");
  const data = new FormData();
  for (const [name, value] of Object.entries(signed)) data.set(name, value);
  data.set("api_key", key);
  data.set("signature", signature);
  if (file) data.set("file", file, "business-image");
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/${action}`,
    {
      method: "POST",
      body: data,
      signal: AbortSignal.timeout(25000),
      cache: "no-store",
    },
  );
  if (!response.ok)
    throw new ApiAuthError(
      "The image service could not complete the request. Please retry.",
      502,
    );
  return response.json() as Promise<{
    secure_url?: string;
    public_id?: string;
    bytes?: number;
    format?: string;
    width?: number;
    height?: number;
    result?: string;
  }>;
}
export async function readImageFile(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new ApiAuthError("Choose an image", 400);
  const parts: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > providerImageLimit + 65536) {
      await reader.cancel();
      throw new ApiAuthError("The image must be at most 3 MB", 413);
    }
    parts.push(value);
  }
  const data = await new Response(Buffer.concat(parts), {
    headers: { "content-type": request.headers.get("content-type") || "" },
  }).formData();
  const file = data.get("file");
  if (!(file instanceof File) || !file.size || file.size > providerImageLimit)
    throw new ApiAuthError("Choose an image of at most 3 MB", 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const format = imageFormat(bytes);
  if (!format || !["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new ApiAuthError("Use a JPEG, PNG or WebP image", 400);
  return new Blob([bytes], { type: file.type });
}
