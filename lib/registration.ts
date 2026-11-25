import { z } from "zod";
import { text } from "@/lib/marketplace-validation";
export { accountPassword as registrationPassword } from "@/lib/password-policy";
import { accountPassword as registrationPassword } from "@/lib/password-policy";
export const registrationPhone = z
  .string()
  .transform((value) => value.replace(/[\s()-]/g, ""))
  .pipe(
    z
      .string()
      .regex(/^\+?[1-9]\d{9,14}$/, "Enter a phone number with country code"),
  );
export const customerRegistration = z.object({
  name: text(100).pipe(z.string().min(2)),
  email: z
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  phone: registrationPhone,
  password: registrationPassword,
});
export const providerRegistration = z.object({
  ownerName: text(100).pipe(z.string().min(2)),
  companyName: text(120).pipe(z.string().min(2)),
  email: z
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  phone: registrationPhone,
  password: registrationPassword,
  businessType: text(80).default(""),
  city: text(80).default(""),
  state: text(80).default(""),
});
