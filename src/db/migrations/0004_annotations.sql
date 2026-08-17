CREATE TABLE "annotations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"article_id" uuid NOT NULL,
	"type" text NOT NULL,
	"page_index" integer NOT NULL,
	"contents" text,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "annotations_article_page_idx" ON "annotations" USING btree ("article_id","page_index");--> statement-breakpoint
-- Hand-added, as 0001 requires of every migration that adds a synced table:
-- widen the publication in the same migration that creates the table, and add
-- it to drizzle-zero.config.ts alongside.
--
-- The reader subscribes to this table directly — a mark drawn in one window
-- reaches another by sync and by nothing else — so it belongs in the replica
-- from the moment it exists. Doing it here rather than later also avoids a
-- second full replica resync, which is what changing the publication set costs.
ALTER PUBLICATION zero_data ADD TABLE "annotations";