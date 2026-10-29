import { requireProvider } from "@/lib/service-provider";
import { ServiceRequest } from "@/models";
import { apiFailure, privateJson } from "@/lib/api-response";
import { readPage, pageResult } from "@/lib/pagination";
import {
  coverageForRequest,
  coverageReviewToken,
} from "@/lib/request-coverage";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const { provider } = await requireProvider();
    const { cursor, limit } = readPage(request);
    const requests = await ServiceRequest.find({
      serviceProviderId: provider._id,
      status: "open",
      ...(cursor ? { _id: { $lt: cursor } } : {}),
    })
      .select(
        "serviceName customerId serviceOfferingId address preferredDate description pricing status coverage.status coverage.requiresProviderConfirmation coverage.addressIdentity updatedAt createdAt",
      )
      .populate("customerId", "name")
      .populate(
        "serviceOfferingId",
        "name price offerEnabled offerName discountType discountValue",
      )
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean();
    const page = pageResult(requests, limit);
    return privateJson({
      success: true,
      requests: page.items.map((row) => {
        const currentCoverage = coverageForRequest(provider, row.address);
        return {
          ...row,
          coverage: {
            status: row.coverage?.status || currentCoverage.status,
            requiresProviderConfirmation:
              row.coverage?.requiresProviderConfirmation === true ||
              currentCoverage.requiresProviderConfirmation,
            currentStatus: currentCoverage.status,
          },
          coverageReviewToken: coverageReviewToken(row),
        };
      }),
      nextCursor: page.nextCursor,
    });
  } catch (error) {
    return apiFailure(error);
  }
}
