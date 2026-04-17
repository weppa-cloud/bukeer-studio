import { z } from 'zod';

export const TrustCertificationSchema = z.object({
  code: z.string().min(1).max(64),
  label: z.string().min(1).max(120),
});

export const TrustContentSchema = z.object({
  rnt_number: z.string().min(1).max(64).optional(),
  years_active: z.number().int().positive().max(200).optional(),
  travelers_count: z.number().int().positive().max(10_000_000).optional(),
  insurance_provider: z.string().min(1).max(120).optional(),
  certifications: z.array(TrustCertificationSchema).max(20).optional(),
});

export type TrustCertification = z.infer<typeof TrustCertificationSchema>;
export type TrustContent = z.infer<typeof TrustContentSchema>;
