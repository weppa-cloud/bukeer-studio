/**
 * Keep template as a pass-through to avoid shipping animation runtime
 * on every public route. Page-level sections can still animate when needed.
 */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return children;
}
