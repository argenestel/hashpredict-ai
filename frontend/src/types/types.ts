import { z } from "zod";

export const scopedPayloadSchema = z.object({
  aud: z.string(),
  azp: z.string().optional(),
  email: z.string(),
  email_verified: z.boolean(),
  exp: z.number(),
  family_name: z.string().optional(),
  given_name: z.string().optional(),
  iat: z.number(),
  iss: z.string(),
  locale: z.string().optional(),
  name: z.string().optional(),
  nonce: z.string(),
  picture: z.string().optional(),
  sub: z.string(),
});

export type EncryptedScopedIdToken = z.infer<typeof scopedPayloadSchema>;
