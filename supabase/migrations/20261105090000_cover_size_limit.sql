-- Spec 0009: covers are at most 150 KB (153600 bytes). Migration 4 left the limit
-- open; this sets it. The project already had this value, set in the dashboard,
-- so applying it there changes nothing.
update storage.buckets
  set file_size_limit = 153600
  where id = 'covers';
