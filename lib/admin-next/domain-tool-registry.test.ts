import {
  ADMIN_NEXT_DOMAIN_TOOL_REGISTRY,
  assertReadonlyPrototypeDomainTools,
  getAdminNextDomainTool,
  listAdminNextDomainTools,
  listAdminNextDomainToolsByDomain,
  requireAdminNextDomainTool,
  type AdminNextDomainToolMetadata,
} from './domain-tool-registry';

describe('Admin Next domain tool registry', () => {
  it('declares the Sprint 0.25D prototype read tools', () => {
    expect(listAdminNextDomainTools().map((tool) => tool.id)).toEqual([
      'planner.workbench.read',
      'opportunity.snapshot.read',
      'itinerary.timeline.read',
      'trace.inspector.read',
    ]);
  });

  it('exposes lookup helpers by id and domain', () => {
    expect(getAdminNextDomainTool('trace.inspector.read')).toMatchObject({
      domain: 'trace',
      label: 'Trace Inspector',
    });
    expect(requireAdminNextDomainTool('planner.workbench.read')).toMatchObject({
      domain: 'planner',
      operation: 'read',
    });
    expect(listAdminNextDomainToolsByDomain('opportunity')).toHaveLength(1);
    expect(listAdminNextDomainToolsByDomain('opportunity')[0]).toMatchObject({
      id: 'opportunity.snapshot.read',
    });
  });

  it('fails fast for unknown required tools', () => {
    expect(() =>
      requireAdminNextDomainTool(
        'planner.unknown.read' as Parameters<typeof requireAdminNextDomainTool>[0],
      ),
    ).toThrow('Unknown Admin Next domain tool: planner.unknown.read');
  });

  it('guards every prototype tool as readonly with no writes', () => {
    expect(assertReadonlyPrototypeDomainTools(listAdminNextDomainTools())).toBe(
      ADMIN_NEXT_DOMAIN_TOOL_REGISTRY,
    );
    expect(
      listAdminNextDomainTools().every(
        (tool) =>
          tool.access === 'readonly' &&
          tool.operation === 'read' &&
          tool.writes === false,
      ),
    ).toBe(true);
  });

  it('rejects accidental write-capable prototype metadata', () => {
    const writableTool = {
      ...requireAdminNextDomainTool('planner.workbench.read'),
      id: 'planner.workbench.read',
      access: 'write',
      operation: 'write',
      writes: true,
    } as unknown as AdminNextDomainToolMetadata;

    expect(() => assertReadonlyPrototypeDomainTools([writableTool])).toThrow(
      'Admin Next prototype domain tools must be read-only: planner.workbench.read',
    );
  });

  it('freezes registry metadata returned by list helpers', () => {
    const [plannerTool] = listAdminNextDomainTools();

    expect(Object.isFrozen(ADMIN_NEXT_DOMAIN_TOOL_REGISTRY)).toBe(true);
    expect(Object.isFrozen(plannerTool)).toBe(true);
    expect(Object.isFrozen(plannerTool?.capabilities)).toBe(true);
  });
});
