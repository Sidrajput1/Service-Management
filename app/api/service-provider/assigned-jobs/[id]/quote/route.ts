import { apiFailure, privateJson } from "@/lib/api-response";
import { ApiAuthError } from "@/lib/auth";
import { assertFinanceWrite } from "@/lib/finance-security";
import {
  providerQuoteView,
  submitJobQuote,
  submitQuoteSchema,
} from "@/lib/job-quotes";
import { objectIdSchema } from "@/lib/pagination";
import { requireProvider } from "@/lib/service-provider";
import Booking from "@/models/booking";
import Job from "@/models/job";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { provider } = await requireProvider();
    const id = objectIdSchema.parse((await params).id);
    const job = await Job.findOne({ _id: id, serviceProviderId: provider._id });
    const booking =
      job &&
      (await Booking.findOne({
        _id: job.bookingId,
        serviceProviderId: provider._id,
      }));
    if (!job || !booking) throw new ApiAuthError("Assigned job not found", 404);
    return privateJson(await providerQuoteView(job, booking));
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { provider, user } = await requireProvider();
    assertFinanceWrite(request);
    const id = objectIdSchema.parse((await params).id);
    const body = submitQuoteSchema.parse(await request.json());
    return privateJson(
      await submitJobQuote(id.toLowerCase(), provider._id, user._id, body),
    );
  } catch (error) {
    return apiFailure(error);
  }
}
