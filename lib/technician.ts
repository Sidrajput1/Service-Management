import Technician from "@/models/technician";
import { ApiAuthError, requireCurrentUser } from "./auth";

export async function requireTechnicianProfile() {
  const user = await requireCurrentUser();

  if (user.role !== "technician") {
    throw new ApiAuthError("Pro access required", 403);
  }

  const tech = await Technician.findOne({
    userId: user._id,
    isActive: { $ne: false },
  });

  if (!tech) {
    throw new ApiAuthError("Active Pro profile not found", 403);
  }

  return { user, tech };
}
