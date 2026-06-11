import {
  compileTheme,
  EVOLUCION_PRESET,
  type CssVariable,
} from '@bukeer/theme-sdk';

type EvolucionAppearance = 'light' | 'dark';
type CssVariableMap = Record<`--${string}`, string>;
export type EvolucionThemeStyle = CssVariableMap;

const compiledEvolucionTheme = compileTheme(
  EVOLUCION_PRESET.tokens,
  EVOLUCION_PRESET.profile,
  { target: 'web' }
);

const webTheme = compiledEvolucionTheme.web;

if (!webTheme) {
  throw new Error('Evolución web theme compilation failed.');
}

const invariantVars = toCssVariableMap(webTheme.invariant);
const lightVars = toCssVariableMap(webTheme.light);
const darkVars = toCssVariableMap(webTheme.dark);

export const evolucionFontImports = webTheme.fontImports;

export const evolucionThemeMetadata = {
  presetSlug: EVOLUCION_PRESET.metadata.slug,
  presetName: EVOLUCION_PRESET.profile.brand.name,
  inputHash: compiledEvolucionTheme.inputHash,
  outputHash: webTheme.metadata.outputHash,
};

export function getEvolucionThemeStyle(
  appearance: EvolucionAppearance
): EvolucionThemeStyle {
  const modeVars = appearance === 'dark' ? darkVars : lightVars;

  return {
    ...invariantVars,
    ...modeVars,
    ...toNextColorVars(modeVars),
    ...toAdminNextAliases(modeVars),
  };
}

export function getEvolucionThemeCss(appearance: EvolucionAppearance): string {
  return Object.entries(getEvolucionThemeStyle(appearance))
    .map(([name, value]) => `${name}: ${value};`)
    .join('\n');
}

function toCssVariableMap(variables: CssVariable[]): CssVariableMap {
  return Object.fromEntries(
    variables.map((variable) => [`--${variable.name}`, variable.value])
  ) as CssVariableMap;
}

function toNextColorVars(modeVars: CssVariableMap): CssVariableMap {
  const colorNames = [
    'background',
    'foreground',
    'card',
    'card-foreground',
    'popover',
    'popover-foreground',
    'primary',
    'primary-foreground',
    'secondary',
    'secondary-foreground',
    'muted',
    'muted-foreground',
    'accent',
    'accent-foreground',
    'destructive',
    'destructive-foreground',
    'border',
    'input',
    'ring',
    'chart-1',
    'chart-2',
    'chart-3',
    'chart-4',
    'chart-5',
    'sidebar',
    'sidebar-foreground',
    'sidebar-primary',
    'sidebar-primary-foreground',
    'sidebar-accent',
    'sidebar-accent-foreground',
    'sidebar-border',
    'sidebar-ring',
  ] as const;

  const entries = colorNames.flatMap((name) => {
    const sourceName = `--${name}` as `--${string}`;
    const value = modeVars[sourceName];

    if (!value) {
      return [];
    }

    const cssColor = toCssColor(value);
    return [
      [sourceName, cssColor],
      [`--color-${name}`, cssColor],
    ];
  });

  return Object.fromEntries(entries) as CssVariableMap;
}

function toAdminNextAliases(modeVars: CssVariableMap): CssVariableMap {
  return {
    '--bukeer-structural': requiredVar(modeVars, '--primary'),
    '--bukeer-live': requiredVar(modeVars, '--secondary'),
    '--bukeer-human-loop': requiredVar(modeVars, '--tertiary'),
    '--bukeer-on-surface': requiredVar(modeVars, '--foreground'),
    '--bukeer-on-surface-muted': requiredVar(modeVars, '--muted-foreground'),
    '--bukeer-on-surface-color': toCssColor(requiredVar(modeVars, '--foreground')),
    '--bukeer-on-surface-muted-color': toCssColor(
      requiredVar(modeVars, '--muted-foreground')
    ),
    '--bukeer-success': requiredVar(modeVars, '--chart-2'),
    '--bukeer-approved': requiredVar(modeVars, '--chart-2'),
    '--bukeer-warning': requiredVar(modeVars, '--chart-5'),
    '--bukeer-surface-rail': requiredVar(modeVars, '--surface-container-lowest'),
    '--bukeer-surface-panel': requiredVar(modeVars, '--surface-container-high'),
    '--bukeer-surface-panel-strong': requiredVar(
      modeVars,
      '--surface-container-highest'
    ),
    '--bukeer-trace-line': requiredVar(modeVars, '--border'),
  };
}

function requiredVar(modeVars: CssVariableMap, name: `--${string}`): string {
  const value = modeVars[name];
  if (!value) {
    throw new Error(`Evolución theme variable ${name} is missing.`);
  }
  return value;
}

function toCssColor(value: string): string {
  return value.includes('(') ? value : `hsl(${value})`;
}
