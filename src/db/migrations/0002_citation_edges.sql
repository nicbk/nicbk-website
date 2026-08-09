CREATE TABLE "citation_edges" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"citing_article_id" uuid NOT NULL,
	"cited_article_id" uuid,
	"title" text NOT NULL,
	"authors" jsonb NOT NULL,
	"publication_year" integer,
	"semantic_scholar_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "citation_edges_citing_s2_key" UNIQUE("citing_article_id","semantic_scholar_id")
);
--> statement-breakpoint
ALTER TABLE "citation_edges" ADD CONSTRAINT "citation_edges_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citation_edges" ADD CONSTRAINT "citation_edges_citing_article_id_articles_id_fk" FOREIGN KEY ("citing_article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citation_edges" ADD CONSTRAINT "citation_edges_cited_article_id_articles_id_fk" FOREIGN KEY ("cited_article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "citation_edges_citing_idx" ON "citation_edges" USING btree ("citing_article_id");--> statement-breakpoint
CREATE INDEX "citation_edges_cited_idx" ON "citation_edges" USING btree ("cited_article_id");--> statement-breakpoint
CREATE INDEX "citation_edges_user_s2_idx" ON "citation_edges" USING btree ("user_id","semantic_scholar_id") WHERE "citation_edges"."cited_article_id" is null;--> statement-breakpoint
-- Hand-added, as 0001 requires of every migration that adds a synced table:
-- widen the publication in the same migration that creates the table, and add
-- it to drizzle-zero.config.ts alongside.
--
-- The citation graph is read by the client (#10 traverses it), so unlike
-- pg-boss's tables it belongs in the replica. Nothing displays it yet; syncing
-- it now is what keeps this migration and its schema one decision.
ALTER PUBLICATION zero_data ADD TABLE "citation_edges";