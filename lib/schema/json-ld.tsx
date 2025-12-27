/**
 * JSON-LD Component for Next.js
 *
 * Renders structured data as a script tag in the document head.
 * Supports single or multiple schemas.
 */

interface JsonLdProps {
  /** Single schema object or array of schemas */
  data: object | object[];
}

/**
 * Renders JSON-LD structured data in a script tag.
 *
 * @example Single schema
 * ```tsx
 * <JsonLd data={organizationSchema} />
 * ```
 *
 * @example Multiple schemas
 * ```tsx
 * <JsonLd data={[organizationSchema, breadcrumbSchema, articleSchema]} />
 * ```
 */
export function JsonLd({ data }: JsonLdProps) {
  // Handle array of schemas - render each as separate script
  if (Array.isArray(data)) {
    return (
      <>
        {data.map((schema, index) => (
          <script
            key={`jsonld-${index}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
      </>
    );
  }

  // Single schema
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * Helper to safely stringify schema with error handling
 */
export function safeStringifySchema(schema: object): string {
  try {
    return JSON.stringify(schema, null, 0);
  } catch (error) {
    console.error('[JsonLd] Error stringifying schema:', error);
    return '{}';
  }
}

export default JsonLd;
