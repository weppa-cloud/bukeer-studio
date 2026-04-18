import type { DataSourceCode } from '@bukeer/website-contract';
import { DataSourceBadge } from './data-source-badge';

const EXPLANATIONS: Record<DataSourceCode, string> = {
  flutter: 'Se edita en Bukeer Flutter. Cambios propagan al siguiente render.',
  studio: 'Se edita aquí mismo. Override específico de esta landing.',
  ai: 'Generado por IA. Si lo editas manualmente, se bloquea para futuras regeneraciones.',
  aggregation: 'Se calcula desde productos hijos del paquete. Para cambiar, edita los hijos.',
  computed: 'Derivado automáticamente (e.g., precio mínimo de opciones, ratings agregados). No editable directo.',
  google: 'Viene de Google Places / Reviews. Se actualiza cada cierto tiempo según el API.',
  hardcoded: 'Texto por defecto del sistema. Sobreescribe vía Studio para personalizar.',
};

export interface FieldTooltipExplainerProps {
  source: DataSourceCode;
  fieldLabel: string;
  formula?: string;
}

export function FieldTooltipExplainer({ source, fieldLabel, formula }: FieldTooltipExplainerProps) {
  return (
    <div
      role="tooltip"
      className="max-w-sm rounded-md border border-border bg-popover p-3 text-sm shadow-md"
    >
      <header className="mb-2 flex items-center justify-between gap-2">
        <span className="font-medium text-foreground">{fieldLabel}</span>
        <DataSourceBadge source={source} />
      </header>
      <p className="text-xs text-muted-foreground">{EXPLANATIONS[source]}</p>
      {formula && (
        <p className="mt-2 rounded bg-muted/50 p-2 font-mono text-[11px] text-muted-foreground">
          {formula}
        </p>
      )}
    </div>
  );
}
