/**
 * The Compose bootstrap job: makes Garage usable, then exits.
 *
 * A one-shot job in front of the app, the same shape as the `migrate` job, and
 * for the same reason — the app must not start against a store that cannot
 * accept a write. The work itself, and why it is needed at all, is in
 * garage-bootstrap.mjs; this file is only the entry point that reads the
 * environment.
 */
import { bootstrapGarage } from './garage-bootstrap.mjs'

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not set — see .env.example.`)
  }
  return value
}

await bootstrapGarage({
  adminUrl: requireEnv('GARAGE_ADMIN_URL'),
  adminToken: requireEnv('GARAGE_ADMIN_TOKEN'),
  accessKeyId: requireEnv('GARAGE_ACCESS_KEY_ID'),
  secretAccessKey: requireEnv('GARAGE_SECRET_ACCESS_KEY'),
  bucket: requireEnv('GARAGE_BUCKET'),
})
