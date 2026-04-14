# Database Schema Conventions

## Table Naming

- Tables: **plural_snake_case** (e.g., `itineraries`, `products`, `contact_activities`)
- NEVER use inverted naming like `id_contact` or `id_user`

## Required Columns (ALL TABLES)

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
```

## Column Naming

| Type | Convention | Example |
|------|------------|---------|
| Foreign key | `table_id` | `contact_id`, `user_id`, `product_id` |
| Boolean | `is_` or `has_` prefix | `is_active`, `has_discount`, `is_verified` |
| Timestamps | `_at` suffix | `created_at`, `updated_at`, `deleted_at` |
| Counts | `_count` suffix | `item_count`, `view_count` |
| Amounts | descriptive name | `total_amount`, `margin_amount` |

## Table Template

```sql
CREATE TABLE table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Foreign keys
  related_table_id UUID NOT NULL REFERENCES related_table(id) ON DELETE CASCADE,

  -- Business columns
  name VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(15,2) DEFAULT 0,

  -- Booleans
  is_active BOOLEAN DEFAULT true,
  has_items BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ALWAYS enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- ALWAYS create indexes for foreign keys
CREATE INDEX idx_table_name_account_id ON table_name(account_id);
CREATE INDEX idx_table_name_related_table_id ON table_name(related_table_id);
```

## Index Guidelines

```sql
-- Always index foreign keys
CREATE INDEX idx_[table]_[column] ON [table]([column]);

-- Composite indexes for common queries
CREATE INDEX idx_itineraries_account_status ON itineraries(account_id, status);

-- Partial indexes for filtered queries
CREATE INDEX idx_contacts_active ON contacts(account_id) WHERE is_active = true;

-- GIN index for text search
CREATE INDEX idx_products_name_gin ON products USING gin(to_tsvector('english', name));
```

## Constraints

```sql
-- Check constraints for validation
rating INTEGER CHECK (rating >= 1 AND rating <= 5),
status VARCHAR(50) CHECK (status IN ('draft', 'confirmed', 'cancelled')),

-- Unique constraints
CONSTRAINT unique_email_per_account UNIQUE (account_id, email),

-- Exclusion constraints for date ranges
CONSTRAINT no_overlapping_periods EXCLUDE USING gist (
  account_id WITH =,
  daterange(start_date, end_date) WITH &&
)
```

## RPC Function Naming

```sql
-- Use snake_case
create_itinerary_payment(...)
calculate_itinerary_totals(...)
get_account_active_channels(...)

-- Prefix with action
get_*     -- Read operations
create_*  -- Create operations
update_*  -- Update operations
delete_*  -- Delete operations
calculate_* -- Computation
validate_*  -- Validation
```

## Migration Files

```
supabase/migrations/
├── 20240101120000_create_reviews_table.sql
├── 20240102150000_add_reviews_indexes.sql
└── 20240103100000_update_reviews_rls.sql
```

Name format: `[timestamp]_[descriptive_name].sql`

## Common Patterns

### Soft Delete

```sql
deleted_at TIMESTAMPTZ DEFAULT NULL,
is_deleted BOOLEAN GENERATED ALWAYS AS (deleted_at IS NOT NULL) STORED

-- Query active records
WHERE deleted_at IS NULL
```

### Audit Trail

```sql
created_by UUID REFERENCES users(id),
updated_by UUID REFERENCES users(id),
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
```

### Currency Storage

```sql
-- Store amounts as integers (cents)
amount_cents INTEGER NOT NULL,
currency_code CHAR(3) NOT NULL DEFAULT 'USD'

-- Or as DECIMAL for precision
amount DECIMAL(15,2) NOT NULL,
currency CHAR(3) NOT NULL DEFAULT 'USD'
```
