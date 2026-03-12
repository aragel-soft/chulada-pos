-- 1. Create a temporary table WITH the exact original constraints (minus the UNIQUE on username)
CREATE TABLE "users_dg_tmp" (
  "id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "role_id" TEXT NOT NULL,
  "is_active" INTEGER NOT NULL DEFAULT 1 CHECK("is_active" IN (0, 1)),
  "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "deleted_at" TEXT,
  "avatar_url" TEXT,
  PRIMARY KEY("id"),
  FOREIGN KEY("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT
);

-- 2. Copy data from the current users table
INSERT INTO "users_dg_tmp" ("id", "username", "password_hash", "full_name", "role_id", "is_active", "created_at", "updated_at", "deleted_at", "avatar_url")
SELECT "id", "username", "password_hash", "full_name", "role_id", "is_active", "created_at", "updated_at", "deleted_at", "avatar_url"
FROM "users";

-- 3. Drop the old table
DROP TABLE "users";

-- 4. Rename the temporary table to the original name
ALTER TABLE "users_dg_tmp" RENAME TO "users";

-- 5. Recreate the existing indices for performance
CREATE INDEX IF NOT EXISTS "idx_users_is_active" ON "users" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_users_role_id" ON "users" ("role_id");
CREATE INDEX IF NOT EXISTS "idx_users_username" ON "users" ("username");

-- 6. Create the NEW partial unique index ONLY for active/non-deleted users
CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_username_active" 
ON "users" ("username") 
WHERE "deleted_at" IS NULL;