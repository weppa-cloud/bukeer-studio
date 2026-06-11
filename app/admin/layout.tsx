import {
  evolucionFontImportCss,
  getEvolucionThemeCss,
} from '@/lib/admin-next/evolucion-theme';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style
        id="admin-next-evolucion-fonts"
        dangerouslySetInnerHTML={{ __html: evolucionFontImportCss }}
      />
      <style
        id="admin-next-evolucion-theme"
        dangerouslySetInnerHTML={{
          __html: `
:root,
body,
.bukeer-admin-signature {
${getEvolucionThemeCss('light')}
  font-family: var(--font-body), var(--font-sans), ui-sans-serif, system-ui, sans-serif;
  font-weight: var(--font-body-weight);
  letter-spacing: var(--letter-spacing);
}

.bukeer-admin-signature.dark {
${getEvolucionThemeCss('dark')}
  color-scheme: dark;
}

.bukeer-admin-signature h1,
.bukeer-admin-signature h2,
.bukeer-admin-signature h3,
.bukeer-admin-signature .bukeer-display {
  font-family: var(--font-heading), var(--font-sans), ui-sans-serif, system-ui, sans-serif;
  font-weight: var(--font-heading-weight);
  letter-spacing: var(--letter-spacing);
}
`,
        }}
      />
      <div className="bukeer-admin-signature">{children}</div>
    </>
  );
}
