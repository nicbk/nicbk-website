import type { StartedTestContainer } from 'testcontainers'
import { GenericContainer, Wait } from 'testcontainers'

/**
 * A throwaway Garage for the integration tier.
 *
 * The point of these tests is a **real object store**, not a mocked S3 client
 * (the task's testing.md is explicit about it): a mock would happily accept a
 * key layout Garage rejects, or a signature it would refuse, and the round-trip
 * assertions would prove nothing about the store the app actually writes to.
 *
 * The bootstrap here mirrors `scripts/garage-init.mjs` step for step, because it
 * is the same requirement — a fresh node has no cluster layout and answers no
 * S3 request until one is applied. It is deliberately a second, short
 * implementation rather than an import of that script: the script is a
 * standalone `.mjs` with a top-level side effect, meant to be run as a process,
 * and importing it would run it. If the two ever disagree about the sequence,
 * the integration tests are what will notice.
 */

/** The same image tag docker-compose.yml pins, so tests exercise the real version. */
const GARAGE_IMAGE = 'dxflrs/garage:v2.3.0'

const S3_PORT = 3900
const ADMIN_PORT = 3903

/** Fixed test credentials. Garage requires the `GK`-plus-hex shape for key ids. */
export const TEST_ACCESS_KEY_ID = `GK${'1'.repeat(24)}`
export const TEST_SECRET_ACCESS_KEY = 'a'.repeat(64)
export const TEST_BUCKET = 'nicbk-website-test'

const ADMIN_TOKEN = 'integration-test-admin-token'
const RPC_SECRET = '0'.repeat(64)

/**
 * Written into the container rather than bind-mounted from docker/garage.toml:
 * that file names `garage` as its RPC public address, which is the Compose
 * service name and does not resolve here.
 */
const CONFIG = `
metadata_dir = "/var/lib/garage/meta"
data_dir = "/var/lib/garage/data"
db_engine = "sqlite"
replication_factor = 1
rpc_bind_addr = "[::]:3901"
rpc_public_addr = "127.0.0.1:3901"

[s3_api]
s3_region = "garage"
api_bind_addr = "[::]:${S3_PORT}"
root_domain = ".s3.garage.internal"

[admin]
api_bind_addr = "[::]:${ADMIN_PORT}"
`

export interface TestGarage {
  /** S3 endpoint on the host, with the container's mapped port. */
  endpoint: string
  /** Removes every object, so each test starts from an empty bucket. */
  reset: () => Promise<void>
  /** Whether an object exists — for asserting that a refusal stored nothing. */
  has: (key: string) => Promise<boolean>
  stop: () => Promise<void>
}

/** Starts Garage and bootstraps it until the S3 API accepts reads and writes. */
export async function startTestGarage(): Promise<TestGarage> {
  const container = await new GenericContainer(GARAGE_IMAGE)
    .withExposedPorts(S3_PORT, ADMIN_PORT)
    .withEnvironment({
      GARAGE_RPC_SECRET: RPC_SECRET,
      GARAGE_ADMIN_TOKEN: ADMIN_TOKEN,
    })
    .withCopyContentToContainer([
      { content: CONFIG, target: '/etc/garage.toml' },
    ])
    // Not the default port-listening strategy: it probes from *inside* the
    // container with a shell command, and this image is `scratch` plus one
    // static binary — there is no shell for it to run, so it times out while
    // Garage is in fact listening. The log line is emitted at the moment the
    // S3 listener opens.
    .withWaitStrategy(Wait.forLogMessage(/S3 API server listening/))
    .start()

  const adminUrl = `http://${container.getHost()}:${container.getMappedPort(ADMIN_PORT)}`
  await bootstrap(adminUrl)
  await assertHealthy(adminUrl)

  const endpoint = `http://${container.getHost()}:${container.getMappedPort(S3_PORT)}`
  return {
    endpoint,
    reset: () => emptyBucket(endpoint),
    has: (key) => objectExists(endpoint, key),
    stop: () => stopQuietly(container),
  }
}

async function admin(
  adminUrl: string,
  endpoint: string,
  body: unknown,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${adminUrl}/v2/${endpoint}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${ADMIN_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(
      `Garage admin ${endpoint} failed: ${response.status} ${await response.text()}`,
    )
  }
  return response.json()
}

async function adminGet(
  adminUrl: string,
  endpoint: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${adminUrl}/v2/${endpoint}`, {
    headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
  })
  if (!response.ok) {
    throw new Error(`Garage admin ${endpoint} failed: ${response.status}`)
  }
  return response.json()
}

/** Layout, key, bucket, permission — the four steps that make the S3 API answer. */
async function bootstrap(adminUrl: string): Promise<void> {
  const status = (await adminGet(adminUrl, 'GetClusterStatus')) as {
    nodes: { id: string }[]
  }
  const nodeId = status.nodes[0]?.id
  if (!nodeId) {
    throw new Error('Garage reported no nodes.')
  }

  await admin(adminUrl, 'UpdateClusterLayout', {
    roles: [{ id: nodeId, zone: 'dc1', capacity: 1_000_000_000, tags: [] }],
  })
  await admin(adminUrl, 'ApplyClusterLayout', { version: 1 })
  await admin(adminUrl, 'ImportKey', {
    accessKeyId: TEST_ACCESS_KEY_ID,
    secretAccessKey: TEST_SECRET_ACCESS_KEY,
    name: 'integration-tests',
  })
  const bucket = await admin(adminUrl, 'CreateBucket', {
    globalAlias: TEST_BUCKET,
  })
  await admin(adminUrl, 'AllowBucketKey', {
    bucketId: bucket['id'],
    accessKeyId: TEST_ACCESS_KEY_ID,
    permissions: { read: true, write: true, owner: true },
  })
}

/**
 * Confirms the bootstrap actually made the store usable.
 *
 * Garage answers `/health` with 503 — "quorum is not available … reads and
 * writes will fail" — until a layout is applied, so this turns a bootstrap that
 * silently did the wrong thing into a failure here, rather than into every
 * storage test failing for an unrelated-looking reason.
 */
async function assertHealthy(adminUrl: string): Promise<void> {
  const response = await fetch(`${adminUrl}/health`)
  if (!response.ok) {
    throw new Error(
      `Garage is not healthy after bootstrap: ${response.status} ${await response.text()}`,
    )
  }
}

/**
 * The S3 client used for housekeeping.
 *
 * Built here rather than reusing `pdf-storage.ts`'s: that one is configured
 * from the validated environment at import time, and these helpers have to
 * reach the container's mapped port, which is only known at runtime.
 */
async function client(endpoint: string) {
  const { S3Client } = await import('@aws-sdk/client-s3')
  return new S3Client({
    endpoint,
    region: 'garage',
    forcePathStyle: true,
    credentials: {
      accessKeyId: TEST_ACCESS_KEY_ID,
      secretAccessKey: TEST_SECRET_ACCESS_KEY,
    },
  })
}

async function emptyBucket(endpoint: string): Promise<void> {
  const { DeleteObjectCommand, ListObjectsV2Command } = await import(
    '@aws-sdk/client-s3'
  )
  const s3 = await client(endpoint)
  const listed = await s3.send(
    new ListObjectsV2Command({ Bucket: TEST_BUCKET }),
  )
  for (const object of listed.Contents ?? []) {
    if (object.Key) {
      await s3.send(
        new DeleteObjectCommand({ Bucket: TEST_BUCKET, Key: object.Key }),
      )
    }
  }
}

async function objectExists(endpoint: string, key: string): Promise<boolean> {
  const { HeadObjectCommand } = await import('@aws-sdk/client-s3')
  const s3 = await client(endpoint)
  try {
    await s3.send(new HeadObjectCommand({ Bucket: TEST_BUCKET, Key: key }))
    return true
  } catch {
    return false
  }
}

async function stopQuietly(container: StartedTestContainer): Promise<void> {
  await container.stop()
}
