import {
  createSettingsAdapter,
  type AdminNextSettingsReadonlySupabaseClient,
} from '@/lib/admin-next/settings-adapter';

describe('admin-next settings adapter', () => {
  it('feeds Settings from fixture source by default', async () => {
    const adapter = createSettingsAdapter();

    await expect(adapter.getSettings()).resolves.toMatchObject({
      agency: expect.objectContaining({ name: 'ColombiaTours.travel' }),
      users: expect.any(Array),
      permissionMatrix: expect.any(Array),
    });
  });

  it('maps readonly account, users and permission matrix into settings fixture', async () => {
    const supabase = createReadonlySupabaseMock({
      accounts: {
        data: [
          {
            id: 'acct-1',
            name: 'Demo Agency',
            website: 'demo.bukeer.com',
            default_language: 'es',
            primary_currency: 'COP',
            reporting_currency: null,
            enabled_currencies: ['COP', 'USD'],
            enabled_languages: ['es', 'en'],
            number_id: '901555428-1',
            mail: 'ops@demo.test',
            phone: '+57 300 000 0000',
            status: 'active',
            payment_methods: [{ type: 'card' }],
            settings: {},
          },
        ],
        error: null,
      },
      get_account_users_with_roles: {
        data: [],
        error: null,
      },
      user_roles: {
        data: [
          {
            id: 1,
            user_id: 'user-1',
            is_active: true,
            created_at: '2026-01-01T10:00:00Z',
            updated_at: '2026-06-10T10:00:00Z',
            roles: { role_name: 'admin' },
          },
          {
            id: 2,
            user_id: 'user-2',
            is_active: false,
            created_at: '2026-01-01T10:00:00Z',
            updated_at: null,
            roles: { role_name: 'agent' },
          },
        ],
        error: null,
      },
      contacts: {
        data: [
          {
            id: 'contact-1',
            user_id: 'user-1',
            name: 'Carolina',
            last_name: 'Ruiz',
            email: 'carolina@demo.test',
            phone: '+57',
            updated_at: '2026-06-10T10:00:00Z',
          },
          {
            id: 'contact-2',
            user_id: 'user-2',
            name: 'Daniel',
            last_name: 'Perez',
            email: 'daniel@demo.test',
            phone: '+57',
            updated_at: null,
          },
        ],
        error: null,
      },
    });
    const adapter = createSettingsAdapter({
      mode: 'readonly',
      supabase,
      accountId: 'acct-1',
    });

    const fixture = await adapter.getSettings();

    expect(supabase.calls).toEqual([
      expect.objectContaining({
        kind: 'from',
        table: 'accounts',
        filters: expect.arrayContaining([['id', 'acct-1']]),
        limit: 1,
      }),
      expect.objectContaining({
        kind: 'from',
        table: 'user_roles',
        filters: expect.arrayContaining([['account_id', 'acct-1']]),
        limit: 100,
      }),
      expect.objectContaining({
        kind: 'from',
        table: 'contacts',
        filters: expect.arrayContaining([
          ['account_id', 'acct-1'],
          ['user_id:in', ['user-1', 'user-2']],
        ]),
        limit: 2,
      }),
    ]);
    expect(fixture.agency).toMatchObject({
      name: 'Demo Agency',
      website: 'demo.bukeer.com',
      locale: 'es, en',
      currency: 'COP, USD',
      taxId: '901555428-1',
    });
    expect(fixture.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'contact-1',
          name: 'Carolina Ruiz',
          role: 'admin',
          status: 'Activo',
        }),
        expect.objectContaining({
          id: 'contact-2',
          role: 'agent',
          status: 'Inactivo',
        }),
      ]),
    );
    expect(fixture.permissionMatrix).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'admin-next-view',
          permission: 'admin_next.view',
          admin: true,
          agent: false,
          accounting: false,
        }),
        expect.objectContaining({
          id: 'payments-manage',
          permission: 'payments.manage',
          accounting: false,
        }),
      ]),
    );
    expect(fixture.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'users', label: '2 usuarios' }),
        expect.objectContaining({ id: 'permissions', label: '6 permisos' }),
      ]),
    );
  });

  it('throws when readonly settings reads return an error', async () => {
    const adapter = createSettingsAdapter({
      mode: 'readonly',
      supabase: createReadonlySupabaseMock({
        accounts: {
          data: null,
          error: { message: 'permission denied' },
        },
        get_account_users_with_roles: { data: [], error: null },
        user_roles: { data: [], error: null },
        contacts: { data: [], error: null },
      }),
      accountId: 'acct-1',
    });

    await expect(adapter.getSettings()).rejects.toThrow(
      'Settings readonly adapter failed for accounts: permission denied',
    );
  });
});

function createReadonlySupabaseMock(rows: {
  accounts: {
    data: unknown[] | null;
    error: { message?: string } | null;
  };
  get_account_users_with_roles: {
    data: unknown[] | null;
    error: { message?: string } | null;
  };
  user_roles: {
    data: unknown[] | null;
    error: { message?: string } | null;
  };
  contacts: {
    data: unknown[] | null;
    error: { message?: string } | null;
  };
}): AdminNextSettingsReadonlySupabaseClient & {
  calls: Array<
    | {
        kind: 'from';
        table: string;
        columns: string;
        filters: Array<[string, unknown]>;
        limit: number | null;
      }
  >;
} {
  const calls: Array<
    | {
        kind: 'from';
        table: string;
        columns: string;
        filters: Array<[string, unknown]>;
        limit: number | null;
      }
  > = [];

  return {
    calls,
    from(table: 'accounts' | 'user_roles' | 'contacts') {
      return {
        select(columns: string) {
          const call = {
            kind: 'from' as const,
            table,
            columns,
            filters: [] as Array<[string, unknown]>,
            limit: null as number | null,
          };
          calls.push(call);
          const query = {
            eq(column: string, value: unknown) {
              call.filters.push([column, value]);
              return query;
            },
            in(column: string, values: readonly unknown[]) {
              call.filters.push([`${column}:in`, values]);
              return query;
            },
            limit(count: number) {
              call.limit = count;
              return query;
            },
            then(
              resolve: (value: unknown) => unknown,
              reject?: (reason: unknown) => unknown,
            ) {
              return Promise.resolve(rows[table]).then(resolve, reject);
            },
          };

          return query;
        },
      };
    },
  } as unknown as AdminNextSettingsReadonlySupabaseClient & {
    calls: Array<
      | {
          kind: 'from';
          table: string;
          columns: string;
          filters: Array<[string, unknown]>;
          limit: number | null;
        }
    >;
  };
}
