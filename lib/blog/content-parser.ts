/**
 * Content Parser — Markdown → ContentStructure
 *
 * Parses blog post markdown into a structured analysis object
 * used by the content scorer. No LLM calls — pure parsing.
 */

export interface SectionAnalysis {
  heading: string;
  level: number;
  wordCount: number;
  hasAnswerFirst: boolean;
  dataPoints: number;
}

export interface ContentStructure {
  sections: SectionAnalysis[];
  totalWords: number;
  avgParagraphWords: number;
  internalLinkCount: number;
  externalLinkCount: number;
  imageCount: number;
  hasTLDR: boolean;
  hasFAQ: boolean;
}

/** Count words in a text string (strip markdown/HTML) */
function countWords(text: string): number {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/[#*_`\[\]()]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0).length;
}

/** Count data points: numbers with %, $, dates, statistics */
function countDataPoints(text: string): number {
  const patterns = [
    /\d+%/g,                          // percentages
    /\$[\d,.]+/g,                      // dollar amounts
    /\d{4}/g,                          // years
    /\d+\s*(days?|hours?|minutes?|km|miles?|USD|EUR)/gi, // measurements
    /\d+[.,]\d+/g,                     // decimal numbers
  ];
  let count = 0;
  for (const p of patterns) {
    const matches = text.match(p);
    if (matches) count += matches.length;
  }
  return count;
}

/** Check if section has answer within first 60 words after heading */
function hasAnswerFirst(sectionText: string): boolean {
  const lines = sectionText.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return false;

  // First non-empty line after heading should be the answer
  const firstParagraph = lines[0];
  const words = countWords(firstParagraph);
  // Answer-first: direct statement within 60 words
  return words > 0 && words <= 80; // slight tolerance over 60
}

/** Parse markdown content into structured analysis */
export function parseContent(content: string): ContentStructure {
  const lines = content.split('\n');

  // Detect TL;DR
  const hasTLDR = /^#{1,3}\s*(TL;?DR|Resumen|Summary)/im.test(content)
    || /\*\*TL;?DR\*\*/i.test(content);

  // Detect FAQ section
  const hasFAQ = /^#{1,3}\s*(FAQ|Preguntas\s+Frecuentes|Frequently\s+Asked)/im.test(content);

  // Count links
  const internalLinks = content.match(/\[INTERNAL_LINK:[^\]]+\]/g) || [];
  const markdownLinks = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
  const externalLinks = markdownLinks.filter(l => {
    const url = l.match(/\]\(([^)]+)\)/)?.[1] || '';
    return url.startsWith('http') && !url.includes('INTERNAL_LINK');
  });

  // Count images
  const images = content.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [];

  // Parse sections by headings
  const sections: SectionAnalysis[] = [];
  let currentHeading = '';
  let currentLevel = 0;
  let currentText = '';

  for (const line of lines) {
    const headingMatch = line.match(/^(#{2,3})\s+(.+)/);
    if (headingMatch) {
      // Save previous section
      if (currentHeading) {
        sections.push({
          heading: currentHeading,
          level: currentLevel,
          wordCount: countWords(currentText),
          hasAnswerFirst: hasAnswerFirst(currentText),
          dataPoints: countDataPoints(currentText),
        });
      }
      currentHeading = headingMatch[2].trim();
      currentLevel = headingMatch[1].length;
      currentText = '';
    } else {
      currentText += line + '\n';
    }
  }
  // Save last section
  if (currentHeading) {
    sections.push({
      heading: currentHeading,
      level: currentLevel,
      wordCount: countWords(currentText),
      hasAnswerFirst: hasAnswerFirst(currentText),
      dataPoints: countDataPoints(currentText),
    });
  }

  // Calculate paragraph stats
  const paragraphs = content
    .split(/\n\n+/)
    .filter(p => p.trim().length > 0 && !p.trim().startsWith('#'));
  const paragraphWordCounts = paragraphs.map(p => countWords(p));
  const avgParagraphWords = paragraphWordCounts.length > 0
    ? paragraphWordCounts.reduce((a, b) => a + b, 0) / paragraphWordCounts.length
    : 0;

  return {
    sections,
    totalWords: countWords(content),
    avgParagraphWords: Math.round(avgParagraphWords),
    internalLinkCount: internalLinks.length + markdownLinks.length - externalLinks.length,
    externalLinkCount: externalLinks.length,
    imageCount: images.length,
    hasTLDR,
    hasFAQ,
  };
}
