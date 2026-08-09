CREATE TABLE "article_tags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"article_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "article_tags_article_id_tag_id_key" UNIQUE("article_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_tags_tag_id_idx" ON "article_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "tags_user_id_idx" ON "tags" USING btree ("user_id");--> statement-breakpoint
-- Hand-added, as 0001 requires of every migration that adds a synced table:
-- widen the publication in the same migration that creates the table, and add
-- it to drizzle-zero.config.ts alongside.
--
-- Both tables are read by the client — the card draws an article's tags and the
-- filter rail lists them — so both belong in the replica. Adding them together
-- is also the cheaper order: changing the publication set forces zero-cache to
-- resync its whole replica, and doing that once beats doing it twice.
ALTER PUBLICATION zero_data ADD TABLE "tags", "article_tags";