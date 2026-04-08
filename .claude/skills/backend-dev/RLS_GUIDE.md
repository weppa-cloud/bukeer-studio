# Row Level Security (RLS) Guide

## Core Principle

**ALL tables must have RLS enabled and policies defined.**

```sql
-- Enable RLS (required)
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

## Multi-Tenancy Pattern

Every table must filter by `account_id`:

```sql
-- Get user's account_id from JWT claims
auth.jwt() ->> 'account_id'

-- Or from users table
(SELECT account_id FROM users WHERE id = auth.uid())
```

## Standard Policies Template

```sql
-- SELECT: User can read own account's data
CREATE POLICY "Users can view own account data"
ON table_name FOR SELECT
USING (account_id = (SELECT account_id FROM users WHERE id = auth.uid()));

-- INSERT: User can create in own account
CREATE POLICY "Users can insert in own account"
ON table_name FOR INSERT
WITH CHECK (account_id = (SELECT account_id FROM users WHERE id = auth.uid()));

-- UPDATE: User can update own account's data
CREATE POLICY "Users can update own account data"
ON table_name FOR UPDATE
USING (account_id = (SELECT account_id FROM users WHERE id = auth.uid()))
WITH CHECK (account_id = (SELECT account_id FROM users WHERE id = auth.uid()));

-- DELETE: User can delete from own account
CREATE POLICY "Users can delete from own account"
ON table_name FOR DELETE
USING (account_id = (SELECT account_id FROM users WHERE id = auth.uid()));
```

## RBAC Integration

Bukeer uses 4 roles: SuperAdmin, Admin, Agent, Operations

```sql
-- Helper function to check role
CREATE OR REPLACE FUNCTION user_has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
    AND r.name = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy using role check
CREATE POLICY "Only admins can delete"
ON sensitive_table FOR DELETE
USING (
  account_id = (SELECT account_id FROM users WHERE id = auth.uid())
  AND user_has_role('Admin')
);
```

## SuperAdmin Pattern

SuperAdmin can access all data across accounts:

```sql
CREATE POLICY "SuperAdmin can view all"
ON table_name FOR SELECT
USING (
  (SELECT role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = auth.uid()) = 'SuperAdmin'
  OR
  account_id = (SELECT account_id FROM users WHERE id = auth.uid())
);
```

## Common Patterns

### Owner-Only Edit

```sql
CREATE POLICY "Only owner can edit"
ON documents FOR UPDATE
USING (
  account_id = (SELECT account_id FROM users WHERE id = auth.uid())
  AND created_by = auth.uid()
);
```

### Status-Based Access

```sql
CREATE POLICY "View published or own drafts"
ON articles FOR SELECT
USING (
  account_id = (SELECT account_id FROM users WHERE id = auth.uid())
  AND (status = 'published' OR created_by = auth.uid())
);
```

### Time-Based Access

```sql
CREATE POLICY "View only current period"
ON billing_periods FOR SELECT
USING (
  account_id = (SELECT account_id FROM users WHERE id = auth.uid())
  AND start_date <= NOW()
  AND end_date >= NOW()
);
```

### Related Table Access

```sql
-- User can view items if they can view parent
CREATE POLICY "View items of accessible itineraries"
ON itinerary_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM itineraries i
    WHERE i.id = itinerary_items.itinerary_id
    AND i.account_id = (SELECT account_id FROM users WHERE id = auth.uid())
  )
);
```

## Testing RLS Policies

```sql
-- Test as specific user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "user-uuid", "account_id": "account-uuid"}';

-- Run queries to verify policies
SELECT * FROM table_name;

-- Reset
RESET ROLE;
```

## Common Issues

### Policy Not Applied

```sql
-- Ensure RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'your_table';

-- Should return: rowsecurity = true
```

### Performance Issues

```sql
-- Create indexes for policy columns
CREATE INDEX idx_table_account_id ON table_name(account_id);

-- Use materialized views for complex policies
```

### Service Role Bypass

```sql
-- Service role bypasses RLS by default
-- Use SECURITY DEFINER functions for admin operations

CREATE OR REPLACE FUNCTION admin_delete_all(target_account_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs as function owner, not caller
AS $$
BEGIN
  DELETE FROM table_name WHERE account_id = target_account_id;
END;
$$;
```

## Anti-Patterns (AVOID)

```sql
-- WRONG: No account_id check
CREATE POLICY "Anyone can view"
ON table_name FOR SELECT
USING (true);

-- WRONG: Only checking auth.uid()
CREATE POLICY "User can view"
ON table_name FOR SELECT
USING (created_by = auth.uid());
-- Missing: account_id check!

-- CORRECT: Always include account_id
CREATE POLICY "User can view own account data"
ON table_name FOR SELECT
USING (
  account_id = (SELECT account_id FROM users WHERE id = auth.uid())
);
```
