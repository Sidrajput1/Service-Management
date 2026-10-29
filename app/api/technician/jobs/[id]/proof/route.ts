import { z } from "zod";
import { requireRole, ApiAuthError } from "@/lib/auth";
import { requireTechnicianProfile } from "@/lib/technician";
import { connectToDb } from "@/lib/db";
import { apiFailure, privateJson } from "@/lib/api-response";
import { withAssignedJob } from "@/lib/assigned-job-transaction";
import JobProof from "@/models/jobProof";

const ProofSchema = z.object({
  proofNote: z.string().optional().nullable(),
  proofs: z
    .array(
      z.object({
        url: z.string().min(1),
        type: z
          .enum([
            "photo",
            "before_photo",
            "after_photo",
            "signature",
            "video",
            "other",
          ])
          .optional(),
        thumbnailUrl: z.string().optional().nullable(),
        metadata: z.record(z.string(), z.any()).optional(),
      }),
    )
    .min(1, "At least one proof is required"),
});
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requireRole(["technician"]);
    const { tech } = await requireTechnicianProfile();
    await connectToDb();
    const parsed = ProofSchema.parse(await request.json());
    const result = await withAssignedJob(
      id,
      String(tech._id),
      async ({ job, session }) => {
        if (
          !["in_progress", "on_hold", "arrived", "accepted"].includes(
            job.status,
          )
        )
          throw new ApiAuthError("Cannot upload proof in current status", 400);
        const proofDocs = await JobProof.insertMany(
          parsed.proofs.map((proof) => ({
            jobId: job._id,
            uploadedBy: tech.userId,
            type: proof.type || "photo",
            url: proof.url,
            thumbnailUrl: proof.thumbnailUrl || undefined,
            metadata: {
              ...proof.metadata,
              note: parsed.proofNote || undefined,
            },
          })),
          { session },
        );
        job.proofIds = [
          ...(job.proofIds || []),
          ...proofDocs.map((proof) => proof._id),
        ];
        job.proofSubmittedAt = new Date();
        await job.save({ session });
        return { proofs: proofDocs, job };
      },
    );
    return privateJson(result);
  } catch (error) {
    return apiFailure(error);
  }
}
