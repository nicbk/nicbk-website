import { createServer } from 'node:http'

/**
 * Stands in for GROBID, as a small HTTP server the app server is simply pointed
 * at.
 *
 * **A config swap, not an interception library** — which is what
 * research/testing-qa/mocking-external-services.md asks for, and the reason it
 * can work here where the Google stub could not: `GROBID_URL` is ordinary
 * configuration, so nothing has to be patched inside the process making the
 * call. The decided mock-server *container* is not used only because a container
 * buys nothing over this: the call originates on the host in this tier, the
 * responses are a few hundred bytes of XML, and a container would add an image
 * pull to every run.
 *
 * The accepted consequence is stated plainly in the task's testing.md: **e2e
 * never exercises the real GROBID.** Extraction quality against real papers is
 * checked by hand, in the browser, where it is the actual question.
 *
 * ## How a test chooses the response
 *
 * Per uploaded file, from the file itself. A PDF may carry a directive line:
 *
 *     % grobid-stub {"title":"A Paper","authors":["Marta Oliveira"]}
 *     % grobid-stub {"fail":"unreadable"}
 *
 * and the stub answers accordingly. Keeping the instruction in the upload is
 * what lets one test submit several files that resolve differently — the case
 * the pipeline is most likely to get wrong — without a control channel, and
 * without the stub holding state between requests.
 */

const DIRECTIVE = /% grobid-stub (\{.*\})/

/** What GROBID answers for a file it cannot read. Verified against 0.9.1-crf. */
const UNREADABLE_BODY =
  '[BAD_INPUT_DATA] PDF to XML conversion failed with error code: 1'

/** …and for a service that has no capacity, which the worker must retry. */
const OVERLOADED_BODY = 'no engine available'

/**
 * Starts the stub on `port`, resolving once it is accepting connections.
 *
 * Returns a handle with `close()`, so the launcher can shut it down with
 * everything else.
 */
export function startGrobidStub(port) {
  const server = createServer((request, response) => {
    if (!request.url?.startsWith('/api/processFulltextDocument')) {
      response.writeHead(404).end()
      return
    }

    const chunks = []
    request.on('data', (chunk) => chunks.push(chunk))
    request.on('end', () => {
      const instruction = readInstruction(
        Buffer.concat(chunks).toString('latin1'),
      )
      answer(response, instruction)
    })
  })

  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '0.0.0.0', () => {
      resolve({
        close: () =>
          new Promise((done) => {
            server.close(() => done())
          }),
      })
    })
  })
}

/**
 * The directive carried by the uploaded file, or the default.
 *
 * The whole multipart body is searched rather than parsed: the only thing here
 * that has to be right is which file was sent, and the marker is unique enough
 * to find without a multipart parser.
 */
function readInstruction(body) {
  const match = body.match(DIRECTIVE)
  if (!match?.[1]) {
    return { title: 'An Extracted Paper', authors: ['Marta Oliveira'] }
  }
  try {
    return JSON.parse(match[1])
  } catch {
    return { fail: 'unreadable' }
  }
}

function answer(response, instruction) {
  if (instruction.fail === 'unreadable') {
    response.writeHead(500, { 'content-type': 'text/plain' })
    response.end(UNREADABLE_BODY)
    return
  }
  if (instruction.fail === 'overloaded') {
    response.writeHead(503, { 'content-type': 'text/plain' })
    response.end(OVERLOADED_BODY)
    return
  }

  response.writeHead(200, { 'content-type': 'application/xml; charset=UTF-8' })
  response.end(teiFor(instruction))
}

/**
 * A TEI document shaped like GROBID's own, so the real parser is what reads it.
 *
 * A hand-built object would test the pipeline against a fixture the parser
 * never sees; this way an e2e failure can still be a parser failure, which is
 * the point of running the whole chain.
 */
function teiFor({ title, authors = [] }) {
  const authorElements = authors
    .map((name) => {
      const [given, ...rest] = name.split(' ')
      return `<author><persName><forename type="first">${escapeXml(given)}</forename><surname>${escapeXml(rest.join(' '))}</surname></persName></author>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<TEI xml:space="preserve" xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader xml:lang="en">
    <fileDesc>
      <titleStmt>${title ? `<title level="a" type="main">${escapeXml(title)}</title>` : ''}</titleStmt>
      <publicationStmt><publisher/></publicationStmt>
      <sourceDesc>
        <biblStruct>
          <analytic>${authorElements}</analytic>
          <monogr><imprint><date type="published" when="2024">2024</date></imprint></monogr>
        </biblStruct>
      </sourceDesc>
    </fileDesc>
    <profileDesc>
      <abstract><div><p>An abstract produced by the stubbed extraction service.</p></div></abstract>
    </profileDesc>
  </teiHeader>
  <text xml:lang="en"><body><div><p>Body text.</p></div></body></text>
</TEI>
`
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
