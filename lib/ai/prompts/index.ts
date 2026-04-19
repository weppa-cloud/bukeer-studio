/**
 * Centralized prompt management for AI features.
 *
 * @see ADR-006 — Streaming-First AI Integration
 */

export { buildStudioChatPrompt } from './studio-chat'
export { buildPublicChatPrompt } from './public-chat'
export { buildSectionGeneratorPrompt } from './section-generator'
export {
  buildImproveTextPrompt,
  ACTION_PROMPTS,
  IMPROVEMENT_ACTIONS,
  type ImprovementAction,
} from './improve-text'
export {
  buildImageMetadataPrompt,
  parseImageMetadataResponse,
  type ImageMetadataContext,
  type ImageMetadataResult,
} from './image-metadata'
export {
  buildPackageHighlightsPrompt,
  type PackageHighlightsInput,
} from './package-highlights'
export {
  buildLocaleAdaptationPrompt,
  LOCALE_ADAPTATION_SCHEMA_VERSION_V2,
  LOCALE_ADAPTATION_SCHEMA_VERSION_V2_1,
  LocaleAdaptationOutputSchemaV1,
  LocaleAdaptationOutputSchemaV2,
  LocaleAdaptationOutputSchemaV2_1,
  LocaleAdaptationOutputEnvelopeSchemaV2,
  LocaleAdaptationOutputEnvelopeSchemaV2_1,
  LocaleAdaptationOutputEnvelopeSchema,
  LocaleAdaptationOutputSchema,
  normalizeLocaleAdaptationOutputEnvelope,
  type LocaleAdaptationOutput,
  type LocaleAdaptationOutputV1,
  type LocaleAdaptationOutputV2,
  type LocaleAdaptationOutputV2_1,
  type LocaleAdaptationOutputEnvelopeV2,
  type LocaleAdaptationOutputEnvelopeV2_1,
  type LocaleAdaptationOutputEnvelope,
  type LocaleAdaptationPromptInput,
} from './locale-adaptation'
