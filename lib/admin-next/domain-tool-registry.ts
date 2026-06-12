export type AdminNextDomainToolDomain =
  | 'planner'
  | 'opportunity'
  | 'itinerary'
  | 'trace';

export type AdminNextDomainToolId =
  | 'planner.workbench.read'
  | 'opportunity.snapshot.read'
  | 'itinerary.timeline.read'
  | 'trace.inspector.read';

export type AdminNextDomainToolAccess = 'readonly';
export type AdminNextDomainToolOperation = 'read';

export interface AdminNextDomainToolMetadata {
  readonly id: AdminNextDomainToolId;
  readonly domain: AdminNextDomainToolDomain;
  readonly label: string;
  readonly description: string;
  readonly access: AdminNextDomainToolAccess;
  readonly operation: AdminNextDomainToolOperation;
  readonly writes: false;
  readonly capabilities: readonly string[];
}

const PROTOTYPE_DOMAIN_TOOLS = [
  {
    id: 'planner.workbench.read',
    domain: 'planner',
    label: 'Planner Workbench',
    description:
      'Read the Signature Planner Workbench snapshot for prototype review.',
    access: 'readonly',
    operation: 'read',
    writes: false,
    capabilities: ['planner.workbench.inspect', 'planner.context.read'],
  },
  {
    id: 'opportunity.snapshot.read',
    domain: 'opportunity',
    label: 'Opportunity Snapshot',
    description:
      'Read opportunity summary, traveler intent, budget, and missing-data signals.',
    access: 'readonly',
    operation: 'read',
    writes: false,
    capabilities: ['opportunity.summary.read', 'opportunity.signals.read'],
  },
  {
    id: 'itinerary.timeline.read',
    domain: 'itinerary',
    label: 'Itinerary Timeline',
    description:
      'Read itinerary segments and supplier-facing timeline context.',
    access: 'readonly',
    operation: 'read',
    writes: false,
    capabilities: ['itinerary.segments.read', 'itinerary.suppliers.read'],
  },
  {
    id: 'trace.inspector.read',
    domain: 'trace',
    label: 'Trace Inspector',
    description:
      'Read trace evidence and decision provenance for the prototype inspector.',
    access: 'readonly',
    operation: 'read',
    writes: false,
    capabilities: ['trace.events.read', 'trace.provenance.read'],
  },
] as const satisfies readonly AdminNextDomainToolMetadata[];

export const ADMIN_NEXT_DOMAIN_TOOL_REGISTRY =
  freezePrototypeDomainTools(PROTOTYPE_DOMAIN_TOOLS);

const domainToolsById = new Map<AdminNextDomainToolId, AdminNextDomainToolMetadata>(
  ADMIN_NEXT_DOMAIN_TOOL_REGISTRY.map((tool) => [tool.id, tool]),
);

export function listAdminNextDomainTools(): readonly AdminNextDomainToolMetadata[] {
  return ADMIN_NEXT_DOMAIN_TOOL_REGISTRY;
}

export function listAdminNextDomainToolsByDomain(
  domain: AdminNextDomainToolDomain,
): readonly AdminNextDomainToolMetadata[] {
  return ADMIN_NEXT_DOMAIN_TOOL_REGISTRY.filter((tool) => tool.domain === domain);
}

export function getAdminNextDomainTool(
  id: AdminNextDomainToolId,
): AdminNextDomainToolMetadata | undefined {
  return domainToolsById.get(id);
}

export function requireAdminNextDomainTool(
  id: AdminNextDomainToolId,
): AdminNextDomainToolMetadata {
  const tool = getAdminNextDomainTool(id);

  if (!tool) {
    throw new Error(`Unknown Admin Next domain tool: ${id}`);
  }

  return tool;
}

export function assertReadonlyPrototypeDomainTools(
  tools: readonly AdminNextDomainToolMetadata[],
): readonly AdminNextDomainToolMetadata[] {
  const unsafeTools = tools.filter(
    (tool) =>
      tool.access !== 'readonly' ||
      tool.operation !== 'read' ||
      tool.writes !== false,
  );

  if (unsafeTools.length > 0) {
    throw new Error(
      `Admin Next prototype domain tools must be read-only: ${unsafeTools
        .map((tool) => tool.id)
        .join(', ')}`,
    );
  }

  return tools;
}

function freezePrototypeDomainTools(
  tools: readonly AdminNextDomainToolMetadata[],
): readonly AdminNextDomainToolMetadata[] {
  const readonlyTools = assertReadonlyPrototypeDomainTools(tools);

  return Object.freeze(
    readonlyTools.map((tool) =>
      Object.freeze({
        ...tool,
        capabilities: Object.freeze([...tool.capabilities]),
      }),
    ),
  );
}
