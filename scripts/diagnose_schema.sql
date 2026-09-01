-- Read-only diagnostic. Run this in the Supabase SQL Editor of the project
-- your app points at, to find out where (or whether) the TourGo tables exist.
--
-- Expected: the app's env.ts targets project ref "uqipjhmxntnmhixigsty".
-- Check the project switcher in the dashboard matches that before running.

-- 1. Which project am I actually connected to, and as whom?
SELECT
  current_database()            AS database,
  current_schema()              AS default_schema,
  current_user                  AS connected_as,
  version()                     AS pg_version;

-- 2. Every table TourGo uses, and which schema (if any) it lives in.
--    A NULL schema means that table does not exist anywhere.
SELECT
  t.expected_table,
  c.table_schema AS found_in_schema
FROM (VALUES
  ('trips'), ('trip_members'), ('trip_features'), ('profiles'),
  ('itinerary_items'), ('expenses'), ('expense_splits'), ('announcements'),
  ('polls'), ('poll_options'), ('poll_votes'), ('chat_messages'),
  ('checklist_items'), ('documents'), ('member_locations'), ('wishlist_items')
) AS t(expected_table)
LEFT JOIN information_schema.tables c
       ON c.table_name = t.expected_table
      AND c.table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY c.table_schema NULLS FIRST, t.expected_table;

-- 3. Everything that DOES exist in this database, in case the tables are
--    named differently or sitting in an unexpected schema.
SELECT table_schema, table_name
  FROM information_schema.tables
 WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
   AND table_type = 'BASE TABLE'
 ORDER BY table_schema, table_name;
