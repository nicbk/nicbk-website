-- What the backup round trip backs up (deploy/test/round-trip.sh): two users,
-- each signed in, with papers, annotations, a tag and a contents fold. Enough
-- of every kind of row that a restore which dropped one kind would show in the
-- counts. Their PDFs are written to Garage by the script, under these keys.

insert into "user" (id, name, email, email_verified)
values ('roundTripUserA000000000000000000', 'Reader A', 'a@example.com', true),
       ('roundTripUserB000000000000000000', 'Reader B', 'b@example.com', true);

-- Sessions, so a restore can show that users stay signed in (BK13).
insert into session (id, expires_at, token, updated_at, user_id)
values ('roundTripSessionA', now() + interval '30 days', 'round-trip-token-a', now(), 'roundTripUserA000000000000000000'),
       ('roundTripSessionB', now() + interval '30 days', 'round-trip-token-b', now(), 'roundTripUserB000000000000000000');

insert into articles (id, user_id, title, authors, pdf_object_key, status)
values
  ('00000000-0000-4000-8000-00000000000a', 'roundTripUserA000000000000000000',
   'A Paper About Backups', '[{"name": "A. Author"}]',
   'lit-tracker/roundTripUserA000000000000000000/00000000-0000-4000-8000-00000000000a/source.pdf', 'reading'),
  ('00000000-0000-4000-8000-00000000000b', 'roundTripUserA000000000000000000',
   'A Second Paper', '[{"name": "B. Author"}]',
   'lit-tracker/roundTripUserA000000000000000000/00000000-0000-4000-8000-00000000000b/source.pdf', 'reading'),
  ('00000000-0000-4000-8000-00000000000c', 'roundTripUserB000000000000000000',
   'Another Reader''s Paper', '[{"name": "C. Author"}]',
   'lit-tracker/roundTripUserB000000000000000000/00000000-0000-4000-8000-00000000000c/source.pdf', 'reading');

insert into annotations (id, user_id, article_id, type, page_index, payload)
values ('00000000-0000-4000-8000-0000000000a1', 'roundTripUserA000000000000000000',
        '00000000-0000-4000-8000-00000000000a', 'highlight', 0, '{}');

insert into tags (id, user_id, name)
values ('00000000-0000-4000-8000-0000000000f1', 'roundTripUserA000000000000000000', 'to-read');

insert into article_tags (id, article_id, tag_id)
values ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-00000000000a',
        '00000000-0000-4000-8000-0000000000f1');

insert into article_contents (article_id, user_id, source, entries, expanded)
values ('00000000-0000-4000-8000-00000000000a', 'roundTripUserA000000000000000000', 'outline',
        '[{"title": "Introduction", "level": 0, "page": 1}]', '[0]');
