import mongoose from "mongoose";
import crypto from "node:crypto";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const apply = process.argv.includes("--apply");
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is required. No image assets were changed.");
  process.exit(1);
}
try {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const candidates = await db
    .collection("providerimageassets")
    .find({
      $or: [
        { status: "cleanup" },
        { updatedAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) } },
      ],
    })
    .limit(50)
    .toArray();
  let removed = 0,
    referenced = 0;
  for (const asset of candidates) {
    if (
      await db
        .collection("serviceproviders")
        .findOne(
          { "businessImage.publicId": asset.publicId },
          { projection: { _id: 1 } },
        )
    ) {
      referenced++;
      if (apply)
        await db
          .collection("providerimageassets")
          .updateOne(
            { _id: asset._id },
            { $set: { status: "attached", updatedAt: new Date() } },
          );
      continue;
    }
    if (
      !String(asset.publicId).startsWith(
        `servizato/providers/${asset.providerId}/brand-`,
      )
    )
      continue;
    if (apply) {
      const cloud = process.env.CLOUDINARY_CLOUD_NAME,
        key = process.env.CLOUDINARY_API_KEY,
        secret = process.env.CLOUDINARY_API_SECRET;
      if (!cloud || !key || !secret)
        throw new Error("Cloudinary configuration is required for cleanup");
      const timestamp = String(Math.floor(Date.now() / 1000));
      const signature = crypto
        .createHash("sha1")
        .update(
          `invalidate=true&public_id=${asset.publicId}&timestamp=${timestamp}${secret}`,
        )
        .digest("hex");
      const data = new FormData();
      Object.entries({
        public_id: asset.publicId,
        invalidate: "true",
        timestamp,
        api_key: key,
        signature,
      }).forEach(([name, value]) => data.set(name, value));
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/destroy`,
        { method: "POST", body: data, signal: AbortSignal.timeout(25000) },
      );
      if (!response.ok)
        throw new Error(
          "Cloudinary cleanup did not complete; asset remains queued",
        );
      const result = await response.json();
      if (!["ok", "not found"].includes(result.result)) continue;
      await db.collection("providerimageassets").deleteOne({ _id: asset._id });
    }
    removed++;
  }
  console.log(
    JSON.stringify({
      mode: apply ? "APPLIED" : "DRY RUN",
      checked: candidates.length,
      unreferencedCandidates: removed,
      referencedAssetsPreserved: referenced,
    }),
  );
} finally {
  await mongoose.disconnect();
}
