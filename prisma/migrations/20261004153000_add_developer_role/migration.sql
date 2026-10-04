-- Add DEVELOPER as a distinct application role without granting ADMIN privileges.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'DEVELOPER';
