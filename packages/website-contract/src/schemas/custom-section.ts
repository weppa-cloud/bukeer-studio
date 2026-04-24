import { z } from 'zod';

const BaseFields = {
  id: z.string().uuid().or(z.string().min(1)),
  position: z.number().int().nonnegative(),
};

export const CustomSectionTextSchema = z.object({
  ...BaseFields,
  type: z.literal('text'),
  content: z.object({
    html: z.string().max(5000),
  }),
});

export const CustomSectionImageTextSchema = z.object({
  ...BaseFields,
  type: z.literal('image_text'),
  content: z.object({
    image: z.string().url(),
    text: z.string().max(2000),
    alignment: z.enum(['left', 'right']),
  }),
});

export const CustomSectionCtaSchema = z.object({
  ...BaseFields,
  type: z.literal('cta'),
  content: z.object({
    label: z.string().min(1).max(80),
    href: z.string().url(),
    variant: z.enum(['primary', 'secondary']),
  }),
});

export const CustomSectionSpacerSchema = z.object({
  ...BaseFields,
  type: z.literal('spacer'),
  content: z.object({
    height: z.enum(['sm', 'md', 'lg']),
  }),
});

export const StrictCustomSectionSchema = z.discriminatedUnion('type', [
  CustomSectionTextSchema,
  CustomSectionImageTextSchema,
  CustomSectionCtaSchema,
  CustomSectionSpacerSchema,
]);

const CustomSectionExtensionSchema = z.object({
  id: z.string().uuid().or(z.string().min(1)),
  type: z.string().min(1),
}).passthrough();

export const CustomSectionSchema = z.union([
  StrictCustomSectionSchema,
  CustomSectionExtensionSchema,
]);

export const CustomSectionsArraySchema = z.array(CustomSectionSchema).max(20);

export type CustomSection = z.infer<typeof CustomSectionSchema>;
export type CustomSectionText = z.infer<typeof CustomSectionTextSchema>;
export type CustomSectionImageText = z.infer<typeof CustomSectionImageTextSchema>;
export type CustomSectionCta = z.infer<typeof CustomSectionCtaSchema>;
export type CustomSectionSpacer = z.infer<typeof CustomSectionSpacerSchema>;
