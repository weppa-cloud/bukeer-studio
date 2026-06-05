import {
  AdminDataSourceModeSchema,
  TravelOntologySnapshotSchema,
} from './index';

describe('Travel Ontology v1 contract', () => {
  it('declares fixture and readonly source modes', () => {
    expect(AdminDataSourceModeSchema.options).toEqual(['fixture', 'readonly']);
  });

  it('validates a minimal readonly opportunity snapshot', () => {
    const parsed = TravelOntologySnapshotSchema.parse({
      version: 'travel_ontology_v1',
      sourceMode: 'readonly',
      generatedAt: '2026-05-18T00:00:00.000Z',
      opportunities: [
        {
          ref: {
            kind: 'opportunity',
            id: 'opp-1',
            label: 'Cartagena family trip',
          },
          traveler: {
            kind: 'traveler',
            id: 'traveler-1',
          },
          destination: 'Cartagena',
          pax: {
            adults: 2,
            children: 2,
          },
          budget: {
            amount: 4800,
            currency: 'USD',
          },
        },
      ],
      itinerarySegments: [],
      missingData: ['Children ages'],
    });

    expect(parsed.version).toBe('travel_ontology_v1');
    expect(parsed.opportunities[0]?.pax.children).toBe(2);
  });
});
