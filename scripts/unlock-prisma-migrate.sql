-- Release any session still holding Prisma Migrate's advisory lock.
SELECT pg_terminate_backend(l.pid)
FROM pg_locks l
JOIN pg_stat_activity a ON a.pid = l.pid
WHERE l.locktype = 'advisory'
  AND l.objid = 72707369
  AND l.pid <> pg_backend_pid();
