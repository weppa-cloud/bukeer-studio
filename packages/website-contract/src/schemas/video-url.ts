import { z } from 'zod';

const DANGEROUS_PROTOCOLS = /^(javascript|data|vbscript|file):/i;

export const VideoUrlSchema = z
  .string()
  .url({ message: 'Debe ser una URL válida' })
  .refine((url) => !DANGEROUS_PROTOCOLS.test(url), {
    message: 'Protocolo no permitido',
  })
  .refine((url) => /^https?:\/\//i.test(url), {
    message: 'URL debe empezar con http:// o https://',
  });

export const VideoUpdateRequestSchema = z.object({
  video_url: VideoUrlSchema.nullable(),
  video_caption: z.string().max(200).nullable(),
});

export type VideoUpdateRequest = z.infer<typeof VideoUpdateRequestSchema>;
