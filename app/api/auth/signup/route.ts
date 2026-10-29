import { POST as createCustomer } from "./customer/route";
import { privateJson } from "@/lib/api-response";
export async function POST(request: Request) {
  const body = await request.clone().json().catch(() => null);
  if (!body || (body.role && body.role !== "customer")) return privateJson({ error: "This endpoint only supports customer registration" }, 403);
  return createCustomer(request);
}
