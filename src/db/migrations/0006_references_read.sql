ALTER TABLE "articles" ADD COLUMN "reference_count" integer;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "references_read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "citation_edges" ADD COLUMN "raw_text" text;