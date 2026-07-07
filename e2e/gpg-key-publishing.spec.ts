import { expect, test } from './fixtures'

// The WKD direct-method hash for nicolas@nicbk.com (z-base-32 SHA-1 of the
// lowercased local part), cross-checked with `gpg-wks-client --print-wkd-hash`.
// A wrong generated hash would move the file and 404 the first assertion below.
const WKD_HASH = 'egg3eb1dsgmi4atdj5obrtipjpcjyocr'

test.describe('GPG key publishing (served static artifacts)', () => {
  test('serves the WKD binary key at the direct-method path', async ({
    request,
  }) => {
    const response = await request.get(`/.well-known/openpgpkey/hu/${WKD_HASH}`)
    expect(response.status()).toBe(200)

    // A binary OpenPGP transferable public key begins with a public-key
    // packet (old-format tag byte 0x98), not armor text — this is the WKD
    // form a mail client imports.
    const body = await response.body()
    expect(body.length).toBeGreaterThan(0)
    expect(body[0]).toBe(0x98)
  })

  test('serves the WKD policy file', async ({ request }) => {
    const response = await request.get('/.well-known/openpgpkey/policy')
    expect(response.status()).toBe(200)
  })

  test('serves the armored public key for humans to download', async ({
    request,
  }) => {
    const response = await request.get('/pgp/nicbk.asc')
    expect(response.status()).toBe(200)
    expect(await response.text()).toContain(
      '-----BEGIN PGP PUBLIC KEY BLOCK-----',
    )
  })
})
