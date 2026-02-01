# React Web Patterns

Practical code examples for consistent React patterns.

Builds on: `ts-refactoring-patterns.md` → `memory-patterns-index.md`

---

## app-root-structure | main | provider | separation

Separation of concerns: DOM attachment → env lifecycle → provider declaration → app logic.

```tsx
// main.tsx - DOM attachment only (non-HMR)
const root_component = (
  <StrictMode>
    <AppErrorBoundary>
      <Suspense fallback={<AppSkeleton />}>
        <AppRoot />
      </Suspense>
    </AppErrorBoundary>
  </StrictMode>
)

const container = document.getElementById('root')!
createRoot(container).render(root_component)

// AppRoot.tsx - env lifecycle (HMR-compatible)
export const AppRoot = () => {
  const env = useInstantiateEnv<MyEnv>(() => env_make(...))

  return (
    <AppProvider env={env}>
      <App />
    </AppProvider>
  )
}

// AppProvider.tsx - inert declaration (no lifecycle logic)
export const AppProvider = ({env, children}: {
  env: EnvIns<MyEnv>
  children: ReactNode
}) => (
  <CsaProvider env={env}>
    <ThemeProvider>
      <PopoverProvider>
        {children}
      </PopoverProvider>
    </ThemeProvider>
  </CsaProvider>
)

// App.tsx - clean app logic (all context guaranteed)
export const App = () => {
  const router = useRouter()  // hooks work, providers exist
  return <RouterOutlet />
}
```

---

## active-passive | component-roles | data-separation

Clear separation: active (data projection) vs passive (presentation).

```tsx
// PASSIVE: rendering only, no data fetching
// - props: pointers (ids), not data
// - props: semantic layout hints, style variants
// - uses hooks for data access (via context from active parent)
const UserCard = ({className}: {className?: string}) => {
  const {name, avatar} = useUser()  // from context, not props
  const style = useStyle(UserCardStyle)
  return (
    <div className={style.$cn(className)}>
      <img src={avatar} />
      <span>{name}</span>
    </div>
  )
}

// ACTIVE: data projection + context provision
// - provides scoped/narrowed context
// - remaps from env to child needs
// - composes passive + other active components
const UserCardActive = ({id}: {id: UserId}) => {
  const {state, actions} = useUserItem(id)  // from global env

  return (
    <User.Provider value={state}>
      <User.Card />
      <User.Actions onEdit={actions.edit} />
    </User.Provider>
  )
}

// DOM_BRIDGE: narrow wrapper for browser APIs
// - event handler bindings
// - DOM element refs
// - used by both active + passive
const Draggable = ({onDrop, children}) => {
  const ref = useRef<HTMLDivElement>(null)
  useDragHandler(ref, {onDrop})
  return <div ref={ref}>{children}</div>
}
```

---

## list-active-pattern | ids-not-data | context

Lists should map ids to active components, not pass data as props.

```tsx
// BAD: passing data through list
{items.map(item => (
  <Item key={item.id} data={item} />  // data as prop
))}

// GOOD: pass id, active component fetches via context
{ids.map(id => (
  <ItemActive key={id} id={id} />  // id only
))}

// ItemActive.tsx
const ItemActive = ({id}: {id: ItemId}) => {
  const item = useItem(id)  // from provider context

  return (
    <Item.Provider value={item}>
      <Item.Card />  // passive, uses useItem() hook
    </Item.Provider>
  )
}

// Note: passing data as props acceptable during partial refactoring
// when full active/passive separation would involve too much surface area
```

---

## no-local-state | data-layer | decoupling

Avoid useState in components. Data lives in external layer.

```tsx
// BAD: state trapped in component
const Form = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  // state lost on unmount, can't persist, can't share
}

// GOOD: external data layer with atoms
// data layer (vanilla, no React)
const formAtom = atom({name: '', email: ''})
const formLoadingAtom = atom(false)

// react bridge (env/react_web)
const useForm = () => useAtomValue(formAtom)
const useFormActions = () => {
  const setForm = useSetAtom(formAtom)
  return {
    setName: (name: string) => setForm(v => ({...v, name})),
    submit: () => { /* fire and forget, loading reflected reactively */ }
  }
}

// component (thin client)
const Form = () => {
  const form = useForm()
  const {setName, submit} = useFormActions()
  // UI never awaits - triggers fire-and-forget, state updates reactively
}
```

Key principles:
- External data source → internal data layer (source of truth)
- Atoms for reactivity (implementation detail, not exposed)
- Hooks as bridge to React (atoms hidden behind hooks)
- UI triggers actions, never awaits - stays fully interactive
- View state layer separate from data layer (enables persist across refresh)

---

## env-layers | browser | react-bridge | dag

Environment layers form a DAG: `ts → browser → react_web → entrypoint`

```
env/
├── ts/              # pure TypeScript, no platform deps
│   └── util/
├── browser/         # browser APIs, DOM, no React
│   ├── file_download.ts
│   ├── clipboard.ts
│   └── drag_drop.ts
└── react_web/       # React bridge over browser + ts
    ├── hooks/
    └── components/
```

```tsx
// env/browser/file_download.ts - pure browser API
export const file_download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// env/react_web/hooks/useFileDownload.ts - React bridge
export const useFileDownload = () => {
  return useCallback((blob: Blob, filename: string) => {
    file_download(blob, filename)
  }, [])
}

// Later: electron entrypoint uses same hook
// but bridges to IPC → native fs instead of browser API
```

---

## thin-ui-layer | core-separation | testable

UI as minimal shell over portable business logic.

```
feature/
├── core/           # pure TypeScript, no UI deps
│   ├── types.ts    # data types
│   ├── parse.ts    # parsing logic
│   └── process.ts  # business logic
└── ui/             # thin React layer
    └── Page.tsx    # just wires core to components
```

```tsx
// BAD: logic mixed into component
function Page() {
  const [data, setData] = useState()
  const handleFile = async (file) => {
    // 50 lines of parsing logic here
    // error handling mixed with setState
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    // ... more processing
    setData(processed)
  }
}

// GOOD: thin wrapper over core
// core/parse.ts - pure, testable, CLI-runnable
export const excel_parse = (buffer: ArrayBuffer): ParseResult => { ... }

// ui/Page.tsx - thin wrapper
function Page() {
  const handleFile = async (file) => {
    const result = excel_parse(await file.arrayBuffer())
    setData(result)
  }
}
```

---

## provider-hierarchy | scoped-narrowing | context

def-env-ins applied to React with scoped context.

```
def  → types + factory (env_make)
env  → provider context (EnvProvider)
ins  → hooks + components (useSheet, Cell)
```

```tsx
// context.ts
const WorkbookContext = createContext<WorkbookEnv | null>(null)
const SheetContext = createContext<number | null>(null)

// EnvProvider.tsx - full env
export const EnvProvider = ({env, children}) => (
  <WorkbookContext.Provider value={env}>
    {children}
  </WorkbookContext.Provider>
)

// SheetProvider.tsx - scoped narrowing
export const SheetProvider = ({sheet, children}) => {
  const env = useContext(WorkbookContext)
  const index = typeof sheet === 'string'
    ? env.sheets.findIndex(s => s.name === sheet)
    : sheet
  return (
    <SheetContext.Provider value={index}>
      {children}
    </SheetContext.Provider>
  )
}

// hooks.ts - consume with narrowing awareness
export const useSheet = () => {
  const env = useContext(WorkbookContext)
  const override = useContext(SheetContext)
  const activeIndex = useAtomValue(env.activeSheetAtom)
  return env.sheets[override ?? activeIndex]
}
```

```tsx
// usage
<Workbook.EnvProvider env={env}>
  <Workbook.SheetViewer />  {/* uses active sheet */}

  <Workbook.SheetProvider sheet="Contacts">
    <Workbook.Cell address="A1" />  {/* scoped to Contacts */}
  </Workbook.SheetProvider>
</Workbook.EnvProvider>
```

---

## namespace-export | grouped-api | clean-imports

Group related exports for clean API.

```tsx
// BAD: scattered imports
import {EnvProvider} from './workbook/EnvProvider'
import {SheetProvider} from './workbook/SheetProvider'
import {Cell} from './workbook/Cell'
import {useSheet} from './workbook/hooks'

// GOOD: namespace pattern
// workbook/index.ts
import {EnvProvider} from './EnvProvider'
import {SheetProvider} from './SheetProvider'
import {Cell} from './Cell'

export const Workbook = {
  EnvProvider,
  SheetProvider,
  Cell,
}

// usage
import {Workbook} from './workbook'

<Workbook.EnvProvider env={env}>
  <Workbook.Cell address="A1" />
</Workbook.EnvProvider>
```

---

## reinitiator-hook | lifecycle | seed-preservation

Keep state across config changes with seed pattern.

```tsx
// BAD: lose all state on any prop change
useEffect(() => {
  const env = env_make(props)
  return () => env.deinit()
}, [props])  // scroll position, selection, all gone

// GOOD: reinitiator pattern
interface EnvSeed {
  scroll: {x: number, y: number}
  selection: Set<string>
  deinit(): void
}

const env_make = (inp: {config: Config, seed?: EnvSeed}): Env => {
  const scroll = inp.seed?.scroll ?? {x: 0, y: 0}
  const selection = inp.seed?.selection ?? new Set()

  return {
    scroll,
    selection,
    config: inp.config,

    deinitIntoSeed: (): EnvSeed => ({
      scroll,
      selection,
      deinit: () => { selection.clear() },
    }),
    deinit() { this.deinitIntoSeed().deinit() },
  }
}

// Hook signature
const env = useReinitiator(env_make, {config}, [config])
// On config change: preserves scroll & selection
```

---

## useReinitiator | hook-implementation | deps-separation

```tsx
function useReinitiator<Seed, Deps, Env>(
  factory: (inp: Deps & {seed?: Seed}) => Env & {deinitIntoSeed(): Seed, deinit(): void},
  namedDeps: Deps,
  arrayDeps: unknown[]
): Env {
  const seedRef = useRef<Seed | undefined>()
  const envRef = useRef<Env | undefined>()

  useEffect(() => {
    // Capture seed from previous instance
    if (envRef.current) {
      seedRef.current = envRef.current.deinitIntoSeed()
    }

    // Create new instance with seed
    envRef.current = factory({...namedDeps, seed: seedRef.current})
    seedRef.current = undefined  // factory owns it now

    return () => {
      envRef.current?.deinit()
    }
  }, arrayDeps)  // only re-init when arrayDeps change

  return envRef.current!
}

// Usage: named deps for values, array deps for reactivity
const env = useReinitiator(
  env_make,
  {config, onNavigate},  // passed to factory
  [config.version]       // triggers re-init
)
```

---

## prop-drilling-avoidance | context | hooks

```tsx
// BAD: drilling through every level
<SheetViewer sheet={activeSheet}>
  <Row sheet={activeSheet} rowIndex={0}>
    <Cell sheet={activeSheet} row={0} col={0} />
  </Row>
</SheetViewer>

// GOOD: context + hooks
<SheetProvider sheet={activeSheet}>
  <SheetViewer>
    <Row rowIndex={0}>
      <Cell row={0} col={0} />  {/* useSheet() internally */}
    </Row>
  </SheetViewer>
</SheetProvider>
```

---

## atom-vs-context | state-granularity | performance

```tsx
// CONTEXT: structural, infrequently changing
// - which sheet is active
// - user preferences
// - feature flags

// ATOMS (jotai/recoil): fine-grained, frequently changing
// - selection state
// - hover state
// - scroll position
// - cell editing state

// Example: hybrid approach
const WorkbookContext = createContext<{
  sheets: Sheet[]                    // structural (context)
  activeSheetAtom: Atom<number>      // reactive (atom)
  selectionAtom: Atom<Set<string>>   // reactive (atom)
} | null>(null)

// Component subscribes only to what it needs
const Cell = ({address}) => {
  const {selectionAtom} = useContext(WorkbookContext)
  const selection = useAtomValue(selectionAtom)  // fine-grained subscription
  const isSelected = selection.has(address)
  // ...
}
```

---

## component-file-structure | colocation | single-export

```tsx
// file: Button.tsx
import {forwardRef} from 'react'
import type {ComponentPropsWithRef} from 'react'

// types colocated, above component
type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = ComponentPropsWithRef<'button'> & {
  variant?: ButtonVariant
  loading?: boolean
}

// single clear export
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({variant = 'primary', loading, children, className, ...props}, ref) => {
    return (
      <button
        ref={ref}
        className={cn('btn', `btn-${variant}`, loading && 'loading', className)}
        disabled={loading}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
```

---

## event-handler-naming | on-prefix | action-suffix

```tsx
// Props: onX pattern (what happened)
type Props = {
  onSelect: (item: Item) => void
  onChange: (value: string) => void
  onSubmit: () => void
}

// Internal handlers: handleX pattern (what we do)
const MyComponent = ({onSelect}) => {
  const handleClick = (item: Item) => {
    // internal logic
    trackAnalytics('item_clicked', item.id)
    // then call prop
    onSelect(item)
  }

  return <Item onClick={handleClick} />
}
```

---

## conditional-rendering | ternary-chain | skeleton

Use ternary chain (like enum pattern in TS) - single code path to one node.

```tsx
// BAD: nested in JSX body
return (
  <div>
    {loading ? <Spinner /> : error ? <Error /> : <Data />}
  </div>
)

// GOOD: ternary chain, single return; collecting branching back into linear chain
const content =
    error ? <ErrorView error={error} />
  : !data ? <DataSkeleton />  // skeleton, not spinner!
  : <DataView data={data} />

return content
```

**Anti-pattern: Spinners.** Use skeleton/placeholder that resembles final state:

```tsx
// BAD: spinner (jarring, no spatial continuity)
if (loading) return <Spinner />

// GOOD: skeleton (same shape as final, grayed out)
const DataSkeleton = () => (
  <div className="opacity-50 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4" />
    <div className="h-4 bg-gray-200 rounded w-1/2 mt-2" />
  </div>
)

// BETTER: sample item indicating empty/loading state
const DataPlaceholder = ({empty}: {empty?: boolean}) => (
  <ItemCard
    className="opacity-40"
    name={empty ? "No items yet" : "Loading..."}
    action={empty ? "Create first item" : undefined}
  />
)
```

Especially, if passed id as prop, hook retrieval will be reactive, and include data (default or loaded), and loading state separately; the "loading" state is just a transient visual state, not blocking data access; and allows fully progressive and decoupled rendering.

---

## custom-hook-extraction | reusable | testable

```tsx
// BAD: logic in component
function UserProfile({userId}) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/users/${userId}`)
      .then(r => r.json())
      .then(setUser)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [userId])

  // ...render
}

// GOOD: extracted hook
function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    user_fetch(userId)
      .then(setUser)
      .catch(setError)
      .finally(() => setLoading(false))
    // (should have cancellation logic too; and really, hook should just be thin bridge to the data layer)
  }, [userId])

  return {user, loading, error}
}

// Component is thin (use ternary chain)
function UserProfile({userId}) {
  const {user, loading, error} = useUser(userId)

  return (
      error ? <ProfileError error={error} />
    : !user ? <ProfileSkeleton />
    : <ProfileCard user={user} />
  )
}
```

(again, prefer always rendering component with default data + disabled + dim if loading initial, interactive but pulsing border if loading but initial data available, non-intrusive error overlay if also error state; all these are thus additative conceptual layers; the "skeleton" feature should be as close to the leaf nodes as possible, ie. a <User.Avatar id={id}/> gets url + loading state via hook, passes it to passive <Avatar> component, which is purely styled differently based on this extra info; not a separate code path at higher level.)

---

## memo-usecallback | performance | stable-refs

```tsx
// Only memoize when needed:
// 1. Expensive computations
// 2. Referential equality for deps
// 3. Preventing child re-renders

// useMemo: expensive computation
const sortedItems = useMemo(
  () => items.slice().sort(complexSort),
  [items]
)

// useCallback: stable ref for child deps
const handleSelect = useCallback(
  (item: Item) => {
    setSelected(item.id)
    onSelect?.(item)
  },
  [onSelect]
)

// memo: prevent re-render if props same
const ExpensiveChild = memo(({data, onAction}) => {
  // expensive render
})

// BAD: premature optimization
const name = useMemo(() => `${first} ${last}`, [first, last])  // just compute inline
```

again, in most cases, this should not be relevant if data layer is well-structured and components are thin! also, data layer bridge hooks return actions that are already stable refs, and the useReinitiator pattern wraps relevant useCallback purpose internally. So these are more implementation specific primitives more reserved for libs, and that are a code smell in application code.

---

## error-boundary | graceful-degradation | isolation

```tsx
// ErrorBoundary.tsx
class ErrorBoundary extends Component<
  {fallback: ReactNode, children: ReactNode},
  {error: Error | null}
> {
  state = {error: null}

  static getDerivedStateFromError(error: Error) {
    return {error}
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.error) return this.props.fallback
    return this.props.children
  }
}

// Usage: isolate failures
<ErrorBoundary fallback={<WidgetError />}>
  <RiskyWidget />
</ErrorBoundary>

// Each feature isolated
<Layout>
  <ErrorBoundary fallback={<SidebarError />}>
    <Sidebar />
  </ErrorBoundary>
  <ErrorBoundary fallback={<MainError />}>
    <Main />
  </ErrorBoundary>
</Layout>
```

(though really, this should never be hit; so a single root level one might be fine, but yes, if including external libs, isolating them is good.)

---

## key-prop | list-rendering | stable-identity

```tsx
// BAD: index as key (breaks on reorder)
{items.map((item, i) => (
  <Item key={i} data={item} />
))}

// BAD: random key (remounts every render)
{items.map(item => (
  <Item key={Math.random()} data={item} />
))}

// OKAY during partial refactoring: data as prop
{items.map(item => (
  <Item key={item.id} data={item} />
))}

// OKAY: composite key when no id
{items.map(item => (
  <Item key={`${item.type}-${item.name}`} data={item} />
))}

// BEST: id only, active component pattern (see list-active-pattern)
{ids.map(id => (
  <ItemActive key={id} id={id} />
))}
```

---

## ref-forwarding | dom-access | composable

```tsx
// Forward ref for DOM access
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({label, ...props}, ref) => (
    <label>
      {label}
      <input ref={ref} {...props} />
    </label>
  )
)

// Combine refs
const useCombinedRefs = <T,>(...refs: Ref<T>[]) => {
  return useCallback((element: T) => {
    refs.forEach(ref => {
      if (typeof ref === 'function') ref(element)
      else if (ref) (ref as MutableRefObject<T>).current = element
    })
  }, refs)
}

// Imperative handle: bridging pattern for non-React APIs
// Use sparingly - prefer reactive patterns when possible
export const Modal = forwardRef<ModalHandle, ModalProps>(
  ({children}, ref) => {
    const [open, setOpen] = useState(false)

    useImperativeHandle(ref, () => ({
      open: () => setOpen(true),
      close: () => setOpen(false),
    }))

    if (!open) return null
    return <Dialog>{children}</Dialog>
  }
)

// When imperative handle is appropriate:
// - Bridging to imperative DOM APIs (focus, scroll, measure)
// - Integration with non-React libraries
// - Parent needs to trigger child actions without state lift
```

---

## Future: CSA Integration

When CSA system is ready, data access will use proxy-based facades:

```tsx
// Future pattern (CSA-specific file when ready)
const user = useUser(id)
user.name.$value      // current value (always valid (boundary pattern), defaults over undefined:s), dep noted for reactivity
user.name.$loaded     // if initial value loaded (otherwise $value is default; useful for skeletons, on individual field-level!)
user.name.$loading    // loading state (may refresh while having data; could possibly make action execution (eg. saving) layer too)
user.name.$error      // error if any
user.name.$dirty      // local modifications pending
```

Builds on patterns above - atoms as implementation detail, hooks as bridge.

---

_Extend this file as new patterns emerge during development._
