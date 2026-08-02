-- Hand-added: Drizzle Kit does not emit extension or publication statements,
-- so the two below are written here and must be carried forward if this
-- migration is ever regenerated.

-- Required by the trigram GIN index at the end of this file. Trusted since
-- Postgres 13, so the database owner can create it without superuser rights.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"authors" jsonb NOT NULL,
	"authors_search" text GENERATED ALWAYS AS (lower(jsonb_path_query_array(authors, '$[*].name')::text)) STORED,
	"publication_year" integer,
	"venue" text,
	"doi" text,
	"abstract" text,
	"notes" text,
	"pdf_object_key" text NOT NULL,
	"semantic_scholar_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"extraction_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_jobs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" text NOT NULL,
	"filename" text NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"failure_reason" text,
	"article_id" uuid,
	"pdf_object_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_jobs" ADD CONSTRAINT "upload_jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_jobs" ADD CONSTRAINT "upload_jobs_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "articles_authors_search_trgm_idx" ON "articles" USING gin ("authors_search" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "articles_user_id_idx" ON "articles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "upload_jobs_user_id_idx" ON "upload_jobs" USING btree ("user_id");--> statement-breakpoint
-- Hand-added: everything zero-cache is allowed to replicate, named explicitly.
--
-- Left to itself, zero-cache creates a publication over every table in the
-- public schema — which would stream Better Auth's `session` and `account`
-- rows, including Google OAuth access and refresh tokens, into its SQLite
-- replica. No client could query them, but there is no reason for them to be
-- on disk in a second place. Naming the tables instead means a table syncs
-- because someone decided it should.
--
-- pg-boss's tables are excluded by the same rule: they live in their own
-- `pgboss` schema, they are private to that library and unstable across its
-- versions, and `upload_jobs` is the app-owned projection clients read instead.
--
-- Every later feature that adds a synced table must ALTER this publication in
-- the same migration, and add the table to drizzle-zero.config.ts. Changing the
-- publication set forces zero-cache to resync its replica, so this is cheaper
-- to get right here than to widen later.
CREATE PUBLICATION zero_data FOR TABLE "articles", "upload_jobs";