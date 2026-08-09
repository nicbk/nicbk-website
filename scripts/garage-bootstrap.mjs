/**
 * Making a Garage node usable, over its admin API.
 *
 * A freshly started node answers no S3 request at all: it has no cluster
 * layout, so it reports `NO ROLE ASSIGNED` and reads and writes fail. Four
 * steps fix that — assign a layout, apply it, import the app's access key, and
 * create the bucket and grant the key access to it — none of which Garage does
 * on its own.
 *
 * ## Why HTTP rather than the `garage` CLI
 *
 * The official image is `scratch` plus one static binary — no shell, no
 * coreutils — so a shell script cannot run *inside* it, and administering it
 * from outside with the CLI would mean either a second image carrying the
 * binary or a bind-mounted Docker socket. The admin API exposes the same
 * operations over HTTP, so this needs nothing but `fetch`.
 *
 * ## Idempotency is this module's own responsibility
 *
 * Garage's admin API is not idempotent: importing an existing key answers 409
 * and creating an existing bucket answers `BucketAlreadyExists`. The Compose
 * job re-runs on every `up`, so each step checks first and skips work already
 * done — a second run is a no-op that logs what it found, rather than a
 * sequence of caught errors, which would hide a real failure.
 *
 * Plain `.mjs`, with no imports, because it runs in the production image, which
 * carries no node_modules and no build step. That is also why the integration
 * tier has its own TypeScript version (src/storage/test-support/test-garage.ts)
 * rather than importing this: the project does not enable `allowJs`, and
 * turning it on for one import would be the larger change. If the two ever
 * disagree about the sequence, the integration tests are what will notice.
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

/**
 * Runs the whole sequence against a node.
 *
 * @param {object} options
 * @param {string} options.adminUrl Base URL of the admin API, e.g. http://garage:3903
 * @param {string} options.adminToken
 * @param {string} options.accessKeyId
 * @param {string} options.secretAccessKey
 * @param {string} options.bucket
 * @param {(message: string) => void} [options.log]
 */
export async function bootstrapGarage({
  adminUrl,
  adminToken,
  accessKeyId,
  secretAccessKey,
  bucket,
  log = console.log,
}) {
  const api = createClient(adminUrl.replace(/\/$/, ''), adminToken)

  const status = await waitForNode(api, adminUrl, log)
  await assignLayout(api, status, log)
  await importAccessKey(api, { accessKeyId, secretAccessKey }, log)
  await createBucket(api, { bucket, accessKeyId }, log)
  log('Garage: ready.')
}

function createClient(adminUrl, adminToken) {
  return {
    /** A POST-shaped admin call. */
    async post(endpoint, body) {
      const response = await fetch(`${adminUrl}/v2/${endpoint}`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body ?? {}),
      })
      if (!response.ok) {
        throw new Error(
          `Garage admin ${endpoint} failed: ${response.status} ${await response.text()}`,
        )
      }
      return response.json()
    },

    /**
     * A GET-shaped admin call. A 404 is an answer — "this does not exist" — not
     * a fault, so it comes back as null for the does-this-already-exist probes.
     */
    async get(endpoint, params) {
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
    },
  }
}

/**
 * Waits for the node to answer at all.
 *
 * Compose can only gate the job on the container being up, which happens before
 * Garage has opened its listeners, so the first calls would otherwise race a
 * connection refusal.
 */
async function waitForNode(api, adminUrl, log) {
  const deadline = Date.now() + READY_TIMEOUT_MS
  let lastError
  while (Date.now() < deadline) {
    try {
      return await api.get('GetClusterStatus')
    } catch (error) {
      lastError = error
      await new Promise((resolve) =>
        setTimeout(resolve, READY_POLL_INTERVAL_MS),
      )
    }
  }
  log(`Garage: gave up waiting for ${adminUrl}.`)
  throw new Error(
    `Garage did not become reachable at ${adminUrl} within ${READY_TIMEOUT_MS}ms: ${lastError}`,
  )
}

/**
 * Gives the node a role in the cluster layout, which is what makes the S3 API
 * answer. Skipped when the node already holds one.
 */
async function assignLayout(api, status, log) {
  const [node] = status.nodes
  if (!node) {
    throw new Error('Garage reported no nodes; cannot assign a cluster layout.')
  }
  if (node.role) {
    log(`Garage: node ${node.id} already has a layout role; skipping.`)
    return
  }

  log(`Garage: assigning layout role to node ${node.id}…`)
  await api.post('UpdateClusterLayout', {
    roles: [{ id: node.id, zone: ZONE, capacity: CAPACITY_BYTES, tags: [] }],
  })
  // The version to apply is always one past the current one; Garage rejects a
  // mismatch rather than guessing, which is what makes a concurrent second run
  // fail loudly instead of clobbering a layout.
  const layout = await api.get('GetClusterLayout')
  await api.post('ApplyClusterLayout', { version: layout.version + 1 })
  log('Garage: layout applied.')
}

/**
 * Imports the app's access key with credentials chosen by configuration.
 *
 * `ImportKey` rather than `CreateKey` because the app reads its credentials
 * from `.env`: a generated key would have to be read back out of Garage and
 * written into the environment before the app could start.
 */
async function importAccessKey(api, { accessKeyId, secretAccessKey }, log) {
  if (await api.get('GetKeyInfo', { id: accessKeyId })) {
    log(`Garage: access key ${accessKeyId} already exists; skipping.`)
    return
  }

  log(`Garage: importing access key ${accessKeyId}…`)
  await api.post('ImportKey', {
    accessKeyId,
    secretAccessKey,
    name: 'nicbk-website',
  })
}

/** Creates the bucket if absent and grants the app's key read/write on it. */
async function createBucket(api, { bucket, accessKeyId }, log) {
  const existing = await api.get('GetBucketInfo', { globalAlias: bucket })
  const bucketId =
    existing?.id ?? (await api.post('CreateBucket', { globalAlias: bucket })).id

  log(
    existing
      ? `Garage: bucket ${bucket} already exists.`
      : `Garage: created bucket ${bucket}.`,
  )

  // Granted unconditionally: it is the one step whose absence is invisible
  // until a write fails, and re-granting an existing permission is accepted.
  await api.post('AllowBucketKey', {
    bucketId,
    accessKeyId,
    permissions: { read: true, write: true, owner: true },
  })
  log(`Garage: ${accessKeyId} may read and write ${bucket}.`)
}
