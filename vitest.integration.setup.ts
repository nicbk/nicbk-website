// The integration tier reaches modules that read `src/env.ts` at import time
// (the storage client, the queue), and that schema has to be satisfiable before
// any of them can be imported. These placeholders make it so; each test then
// points the variables it has real infrastructure for — the database URL, the
// Garage endpoint and credentials — at its own containers before importing the
// modules under test.
import { applyPlaceholderEnv } from './vitest.env-defaults'

applyPlaceholderEnv()
