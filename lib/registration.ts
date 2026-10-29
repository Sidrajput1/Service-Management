import { z } from "zod";
import { text } from "@/lib/marketplace-validation";
export const registrationPassword = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(72)
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "Password must fit within 72 UTF-8 bytes",
  );
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
