import { z } from "zod";
import { text, pinSchema } from "./marketplace-validation";
export const providerProfileSchema = z.object({
  companyName: text(120).pipe(z.string().min(2)),
  businessType: text(80).pipe(z.string().min(2)),
  description: text(2000).optional(),
  email: z.email().max(254),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[1-9][\d ()-]{9,18}$/),
  address: z.object({
    addressLine: text(300),
    city: text(80),
    state: text(80),
    pincode: z.union([pinSchema, z.literal("")]),
  }),
});
