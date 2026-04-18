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
  LocaleAdaptationOutputSchemaV1,
  LocaleAdaptationOutputSchemaV2,
  LocaleAdaptationOutputEnvelopeSchemaV2,
  LocaleAdaptationOutputSchema,
  normalizeLocaleAdaptationOutputEnvelope,
  type LocaleAdaptationOutput,
  type LocaleAdaptationOutputV1,
  type LocaleAdaptationOutputV2,
  type LocaleAdaptationOutputEnvelopeV2,
  type LocaleAdaptationPromptInput,
} from './locale-adaptation'
