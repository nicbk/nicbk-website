CREATE TABLE "article_contents" (
	"article_id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source" text NOT NULL,
	"entries" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "article_contents" ADD CONSTRAINT "article_contents_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_contents" ADD CONSTRAINT "article_contents_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_contents_user_id_idx" ON "article_contents" USING btree ("user_id");--> statement-breakpoint
-- Hand-added, as 0001 requires of every migration that adds a synced table:
-- widen the publication in the same migration that creates the table, and add
-- it to drizzle-zero.config.ts alongside.
--
-- The article page's contents tab reads this table (features/a-paper-shows-its-contents),
-- so it belongs in the replica from the moment it exists.
ALTER PUBLICATION zero_data ADD TABLE "article_contents";
