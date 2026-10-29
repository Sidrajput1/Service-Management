import { requireCustomerProfile } from "@/lib/customer";
import { apiFailure, privateJson } from "@/lib/api-response";
export async function GET() {
  try {
    const { customer, user } = await requireCustomerProfile();
    return privateJson({ user: { id: user._id, name: user.name, email: user.email, phone: user.phone }, customer });
  } catch (error) { return apiFailure(error); }
}