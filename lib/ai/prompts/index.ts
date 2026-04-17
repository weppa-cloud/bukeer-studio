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
