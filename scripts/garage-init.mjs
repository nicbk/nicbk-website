/**
 * Bootstrap a Garage node until its S3 API is usable, then exit.
 *
 * A freshly started Garage node answers no S3 request at all: it has no cluster
 * layout, so every node reports `NO ROLE ASSIGNED` and reads and writes fail.
 * Making it usable takes four steps — assign a layout, apply it, import the
 * app's access key, create the bucket and grant the key access to it — none of
 * which Garage does on its own.
 *
 * This runs as a one-shot Compose job in front of the app, the same shape as
 * the `migrate` job, and for the same reason: the app must not start against a
 * store that cannot accept a write.
 *
 * ## Why HTTP rather than the `garage` CLI
 *
 * The official image is `scratch` plus one static binary — no shell, no
 * coreutils — so a shell script cannot run *inside* it, and administering it
 * from outside with the CLI would mean either a second image carrying the
 * binary or a bind-mounted Docker socket. Garage's admin API exposes the same
 * operations over HTTP, so this runs in the app's own image with `fetch` and no
 * dependencies at all.
 *
 * ## Idempotency is this script's own responsibility
 *
 * Garage's admin API is not idempotent: importing an existing key answers 409
 * and creating an existing bucket answers `BucketAlreadyExists`. Because the
 * job re-runs on every `docker compose up`, each step below checks first and
 * skips work already done, so a second run is a no-op that logs what it found
 * rather than a sequence of caught errors — which would hide a real failure.
 */

/** Fixed by docker/garage.toml, and by the layout Garage refuses to run without. */
const ZONE = 'dc1'

/**
 * Advertised capacity. Garage uses it only to weight data across nodes, so with
 * one node the value is arbitrary — but it must be present and non-zero, or the
 * layout will not apply.
 */
const CAPACITY_BYTES = 1_000_000_000

/** How long to wait for the node's admin API to answer before giving up. */
const READY_TIMEOUT_MS = 60_000
const READY_POLL_INTERVAL_MS = 1_000

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not set — see .env.example.`)
  }
  return value
}

const adminUrl = requireEnv('GARAGE_ADMIN_URL').replace(/\/$/, '')
const adminToken = requireEnv('GARAGE_ADMIN_TOKEN')
const accessKeyId = requireEnv('GARAGE_ACCESS_KEY_ID')
const secretAccessKey = requireEnv('GARAGE_SECRET_ACCESS_KEY')
const bucket = requireEnv('GARAGE_BUCKET')

/**
 * One admin API call.
 *
 * `expectedFailure` names a status this caller treats as information rather
 * than an error — used for the "does this already exist" probes, where a 404 is
 * the answer rather than a fault.
 */
async function admin(endpoint, body, { expectedFailure } = {}) {
  const response = await fetch(`${adminUrl}/v2/${endpoint}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${adminToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
  })

  if (response.status === expectedFailure) {
    return null
  }
  if (!response.ok) {
    throw new Error(
      `Garage admin ${endpoint} failed: ${response.status} ${await response.text()}`,
    )
  }
  return response.json()
}

/** GET-shaped admin endpoints, which reject a body. */
async function adminGet(endpoint, params) {
  const query = params ? `?${new URLSearchParams(params)}` : ''
  const response = await fetch(`${adminUrl}/v2/${endpoint}${query}`, {
    headers: { authorization: `Bearer ${adminToken}` },
  })
  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error(
      `Garage admin ${endpoint} failed: ${response.status} ${await response.text()}`,
    )
  }
  return response.json()
}

/**
 * Waits for the node to answer at all.
 *
 * Compose can only gate this job on the container being up, which happens
 * before Garage has opened its listeners, so the first calls would otherwise
 * race a connection refusal.
 */
async function waitForNode() {
  const deadline = Date.now() + READY_TIMEOUT_MS
  let lastError
  while (Date.now() < deadline) {
    try {
      return await adminGet('GetClusterStatus')
    } catch (error) {
      lastError = error
      await new Promise((resolve) =>
        setTimeout(resolve, READY_POLL_INTERVAL_MS),
      )
    }
  }
  throw new Error(
    `Garage did not become reachable at ${adminUrl} within ${READY_TIMEOUT_MS}ms: ${lastError}`,
  )
}

/**
 * Gives the node a role in the cluster layout, which is what makes the S3 API
 * answer. Skipped when the node already holds one.
 */
async function assignLayout(status) {
  const [node] = status.nodes
  if (!node) {
    throw new Error('Garage reported no nodes; cannot assign a cluster layout.')
  }
  if (node.role) {
    console.log(`Garage: node ${node.id} already has a layout role; skipping.`)
    return
  }

  console.log(`Garage: assigning layout role to node ${node.id}…`)
  await admin('UpdateClusterLayout', {
    roles: [{ id: node.id, zone: ZONE, capacity: CAPACITY_BYTES, tags: [] }],
  })
  // The version to apply is always one past the current one; Garage rejects a
  // mismatch rather than guessing, which is what makes a concurrent second run
  // fail loudly instead of clobbering a layout.
  const layout = await adminGet('GetClusterLayout')
  await admin('ApplyClusterLayout', { version: layout.version + 1 })
  console.log('Garage: layout applied.')
}

/**
 * Imports the app's access key with credentials chosen by configuration.
 *
 * `ImportKey` rather than `CreateKey` because the app reads its credentials
 * from `.env`: a generated key would have to be read back out of Garage and
 * written into the environment before the app could start.
 */
async function importAccessKey() {
  const existing = await adminGet('GetKeyInfo', { id: accessKeyId })
  if (existing) {
    console.log(`Garage: access key ${accessKeyId} already exists; skipping.`)
    return
  }

  console.log(`Garage: importing access key ${accessKeyId}…`)
  await admin('ImportKey', {
    accessKeyId,
    secretAccessKey,
    name: 'nicbk-website',
  })
}

/** Creates the bucket if absent and grants the app's key read/write on it. */
async function createBucket() {
  const existing = await adminGet('GetBucketInfo', { globalAlias: bucket })
  const bucketId =
    existing?.id ?? (await admin('CreateBucket', { globalAlias: bucket })).id

  console.log(
    existing
      ? `Garage: bucket ${bucket} already exists.`
      : `Garage: created bucket ${bucket}.`,
  )

  // Granted unconditionally: it is the one step whose absence is invisible
  // until a write fails, and re-granting an existing permission is accepted.
  await admin('AllowBucketKey', {
    bucketId,
    accessKeyId,
    permissions: { read: true, write: true, owner: true },
  })
  console.log(`Garage: ${accessKeyId} may read and write ${bucket}.`)
}

const status = await waitForNode()
await assignLayout(status)
await importAccessKey()
await createBucket()
console.log('Garage: ready.')
