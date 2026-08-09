import { drizzleZeroConfig } from 'drizzle-zero'
import * as drizzleSchema from './src/db/schema'

/**
 * Which of the database's tables and columns Zero knows about.
 *
 * This is a deliberate allowlist, not an oversight: `drizzle-zero` includes
 * only what is named here, so a table added to Drizzle stays invisible to the
 * sync engine until someone decides it should sync. The identity tables are the
 * reason that matters — `session` and `account` hold session tokens and Google
 * OAuth access/refresh tokens, and there is no version of the Lit Tracker that
 * needs them on a client.
 *
 * The matching restriction one layer down is the Postgres publication
 * (`zero_data`, created in the migration that adds these tables), which stops
 * those rows reaching zero-cache's replica in the first place. This file and
 * that publication have to be extended together when a feature adds a table.
 *
 * Column names below are the Drizzle field names (camelCase), not the database
 * column names.
 */
export default drizzleZeroConfig(drizzleSchema, {
  tables: {
    articles: {
      id: true,
      userId: true,
      title: true,
      authors: true,
      // `authorsSearch` is deliberately absent: it is a Postgres-generated
      // lowercase copy of `authors`, kept for a possible future server-side
      // search, and syncing it would duplicate data the client already has.
      publicationYear: true,
      venue: true,
      doi: true,
      abstract: true,
      notes: true,
      pdfObjectKey: true,
      semanticScholarId: true,
      status: true,
      extractionStatus: true,
      createdAt: true,
      updatedAt: true,
    },
    citationEdges: {
      id: true,
      userId: true,
      citingArticleId: true,
      citedArticleId: true,
      title: true,
      authors: true,
      publicationYear: true,
      semanticScholarId: true,
      createdAt: true,
      updatedAt: true,
    },
    uploadJobs: {
      id: true,
      userId: true,
      filename: true,
      status: true,
      failureReason: true,
      articleId: true,
      pdfObjectKey: true,
      createdAt: true,
      updatedAt: true,
    },
    user: false,
    session: false,
    account: false,
    verification: false,
  },
})
