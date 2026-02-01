# TypeScript Refactoring Patterns

Practical code examples for consistent TypeScript refactoring.

---

## file-structure | imports | organization

```ts
// 1. hashbang (if CLI entrypoint)
#!/usr/bin/env node

// 2. module doc (one-liner if any)
// Session management with persistence

// 3. imports: std → 3rd party → internal (absolute) → relative
import {readFile} from 'node:fs/promises'
import {z} from 'zod'
import {result_ok, result_err} from '@env/ts/util/result.ts'
import {session_validate} from './session_validate.ts'

// 4. main export (if entrypoint)
export const main = async (inp: MainInp = {}): Promise<Result<MainOut>> => { ... }

// 5. exported types
// 6. utility types
// 7. exported sub-fns
// 8. utility sub-fns

// 9. entrypoint runner (if CLI)
import.meta?.main && main().catch(err => { console.error(err); process.exit(1) })
```

---

## naming | module-function | snake-case

Naming mirrors directory structure for easy refactoring.

```ts
// BAD
findGitRepo()
buildTimeline()
formatToolUse()

// GOOD
git_repo_find()
timeline_build()
tool_use_fmt()

// file: util_git_repo_find.ts
// later becomes: @env/ts/util/git/repo_find.ts
import {git_repo_find} from './util_git_repo_find.ts'
```

---

## types-placement | colocation | types.ts

```ts
// COLOCATE: types tightly coupled to single export
// file: Button.tsx
type ButtonProps = {
  label: string
  onClick: () => void
}
export const Button = (props: ButtonProps) => { ... }

// SEPARATE: shared types across multiple exports
// file: types.ts
export type SessionState = { ... }
export type SessionEvent = { ... }

// file: session_create.ts
import type {SessionState} from './types.ts'
```

---

## input-output | single-arg-object | extensibility

```ts
// BAD: positional args break on changes
const fetch_user = (id: string, includeProfile: boolean, limit: number) => { ... }

// GOOD: named object, extensible
type FetchUserInp = {
  id: string
  include_profile?: boolean
  limit?: number
}
type FetchUserOut = {
  user: User
  profile?: Profile
}
export const user_fetch = (inp: FetchUserInp): Result<FetchUserOut> => { ... }

// starting simple, extensible later
export const action = (inp: ActionInp = {}): Result<ActionOut> => { ... }

// single primary thing + options
export const item_process = (item: Item, inp: ProcessInp = {}): Result<ItemOut> => { ... }
```

---

## assert-early | boundary | guard

```ts
// establish boundaries at function entry
export const session_create = (inp: SessionInp): Result<Session> => {
  assert(inp.user_id, 'user_id required')
  assert(inp.ttl > 0, 'ttl must be positive')

  // now we can trust the values
  const session = { ... }
  return result_ok(session)
}
```

---

## named-expressions | descriptive | one-liner

```ts
// BAD: unclear inline logic
if (user.role === 'admin' && user.verified && Date.now() - user.lastLogin < 86400000) {
  return allow()
}

// GOOD: named expressions reveal intent
const is_admin = user.role === 'admin'
const is_verified = user.verified
const login_recent = Date.now() - user.lastLogin < DAY_MS
const can_access = is_admin && is_verified && login_recent

if (can_access) return allow()
```

---

## early-return | guard-clause | flat

```ts
// BAD: deep nesting
const process = (inp: Inp) => {
  if (inp.valid) {
    if (inp.data) {
      if (inp.data.length > 0) {
        return do_work(inp.data)
      }
    }
  }
  return err
}

// GOOD: guard clauses, flat
const process = (inp: Inp) => {
  if (!inp.valid) return result_err('invalid input')
  if (!inp.data) return result_err('no data')
  if (inp.data.length === 0) return result_err('empty data')

  return do_work(inp.data)
}
```

---

## enum-ternary | switch-alternative | registry

```ts
// ternary chain for simple mapping
const status_code =
    status === 'ok' ? 200
  : status === 'created' ? 201
  : status === 'not_found' ? 404
  : 500

// ternary chain for actions
const handler =
    type === 'create' ? handle_create(inp)
  : type === 'update' ? handle_update(inp)
  : type === 'delete' ? handle_delete(inp)
  : handle_default(inp)

// registry pattern for extensible dispatch
const handlers = {
  create: handle_create,
  update: handle_update,
  delete: handle_delete,
} as const

type HandlerKey = keyof typeof handlers
const handler = handlers[type as HandlerKey] ?? handle_default
return handler(inp)
```

---

## registry pattern

```ts
import type {Entry} from './types.ts'

import {some_action} from './some_action.ts'
import {some_other} from './some_other.ts' // 2


type ValidRegistry = { [K in string]: Entry<K> }

export const reg = {
  some_action,
  some_other, // 3
} as const satisfies ValidRegistry

export type RegKey = keyof typeof reg

// types.ts
export type Entry<K extends string = string> = {
  tag: K, // discriminated union
  // ...
}

// some_action.ts // 1
import type {Entry} from './types.ts'

export const some_action = {
  tag: 'some_action',
  custom_field: '' as string,
} as const satisfies Entry
```

-> additative: adding a new entry is 1. one new file, 2. one import line added, 3. one entry in the reg added; then typing available across! clean!
-> single point of contact: instead of register_handle('slug', fn) spread across the codebase, single clear flow there reg is defined and all it imports; could cleanly make another alternative reg.
-> extendable: satisfies EntryT ensures they follow base, as const and reg object with tagged union brings specific typing, '' as string counteracts as const's narrowing to litteral, allowing it to be used for typing and later type-mapping cleanly.

-> ok to group multiple entries in single file if they're related and small
-> though keep each entry as top-level exported to minimize nesting and improve composability, and make slit to own file easier if later needed
-> aim to have identifiers consistent; ie. instead of all entries exporting the same named const, export with unique names matching the tag, to make identifier consistent across.

---

## config-object | constants | as-const

```ts
// BAD: scattered SCREAMING_CONSTANTS
const MAX_RETRIES = 3
const TIMEOUT_MS = 5000
const DEFAULT_HOST = 'localhost'

// GOOD: grouped config object
const config = {
  max_retries: 3,
  timeout_ms: 5000,
  default_host: 'localhost',
  cache: {
    enabled: true,
    ttl_ms: 60_000,
  },
} as const

// easy to make dynamic later
const config = load_config() ?? defaults
```

---

## composition | no-flags | small-fns

```ts
// BAD: monolithic with flags
const fetch_data = (opts: {
  includeUsers?: boolean
  includeProducts?: boolean
  includeLogs?: boolean
}) => {
  let result = {}
  if (opts.includeUsers) result.users = fetch_users()
  if (opts.includeProducts) result.products = fetch_products()
  if (opts.includeLogs) result.logs = fetch_logs()
  return result
}

// GOOD: composable pieces
export const users_fetch = () => { ... }
export const products_fetch = () => { ... }
export const logs_fetch = () => { ... }

// compose as needed
const data = {
  users: users_fetch(),
  products: products_fetch(),
}
```

---

## file-size | split-threshold | refactor

```
<50 lines   : small, fine if expecting growth
50-150      : optimal
150-300     : large, consider splitting
>300        : split required
>500        : definitely split

exceptions: data files, generated code (add lint comment)
```

```ts
// file: commands.ts (>500 lines)
// SPLIT INTO:
// cmd/status.ts
// cmd/build.ts
// cmd/deploy.ts
// commands.ts (thin composition)

export const commands = {
  status: cmd_status,
  build: cmd_build,
  deploy: cmd_deploy,
}
```

---

## module-boundary | import.ts | no-index

```ts
// BAD: index.ts re-exports everything
// util/index.ts
export * from './string.ts'
export * from './number.ts'
export * from './date.ts'
// doesn't scale with many modules

// GOOD: direct imports
import {str_truncate} from '@env/ts/util/str/truncate.ts'
import {date_fmt_iso} from '@env/ts/util/date/fmt_iso.ts'

// module-internal: import.ts gathers external deps
// my_module/import.ts (internal only, not exported)
export {z} from 'zod'
export {result_ok, result_err} from '@env/ts/util/result.ts'

// my_module/core.ts
import {z, result_ok} from './import.ts'
```

---

## dag-structure | testable | isolation

```ts
// structure for independent testability
// BAD: circular, everything depends on everything
// cmd.ts imports state.ts imports cmd.ts

// GOOD: DAG-like, leaf modules have no internal deps
//
// cmd/status.ts ──┐
// cmd/build.ts  ──┼──> state.ts ──> types.ts
// cmd/deploy.ts ──┘
//
// types.ts: no deps (leaf)
// state.ts: depends on types.ts only
// cmd/*.ts: depends on state.ts, types.ts

// easy to test state.ts in isolation
// easy to slice out cmd/build.ts as new entrypoint
```

---

## todo-stub | assert | incremental

```ts
import {todo, assert, unreachable} from './assert.ts'

// stub during development
const feature_new = (inp: Inp): Result<Out> => {
  todo('implement feature_new')
}

// mark unreachable branches
const handle = (type: 'a' | 'b') => {
  if (type === 'a') return handle_a()
  if (type === 'b') return handle_b()
  unreachable(type) // type is 'never' here
}
```

---

## utils-extraction | util.ts | submodules

```ts
// start with util.ts catch-all
// file: util.ts (<200 lines)
export const str_truncate = ...
export const date_fmt = ...
export const arr_chunk = ...

// when >200 lines, extract to submodules
// util/str.ts
// util/date.ts
// util/arr.ts

// or further if needed
// util/str/truncate.ts
// util/str/pad.ts
```

---

## Result-pattern | error-handling | type-safe

```ts
type Result<T, E = Error> =
  | {ok: true, value: T}
  | {ok: false, error: E}

const result_ok = <T>(value: T): Result<T> => ({ok: true, value})
const result_err = <E>(error: E): Result<never, E> => ({ok: false, error})

// usage
const user_fetch = (id: string): Result<User, 'not_found' | 'forbidden'> => {
  const user = db.find(id)
  if (!user) return result_err('not_found')
  if (!user.visible) return result_err('forbidden')
  return result_ok(user)
}

// caller
const result = user_fetch('123')
if (!result.ok) {
  // result.error is 'not_found' | 'forbidden'
  return handle_error(result.error)
}
// result.value is User
```

---

_Extend this file as new patterns emerge during refactoring._
