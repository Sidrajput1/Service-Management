import { z } from "zod";
export const gpsReadingSchema = z
  .object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    accuracy: z.number().finite().positive().max(100000),
    observedAt: z.number().int().positive(),
  })
  .strict();
export const destinationCaptureSchema = gpsReadingSchema
  .extend({ confirmed: z.literal(true) })
  .strict();
