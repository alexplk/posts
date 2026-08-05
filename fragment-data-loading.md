## Fragment Data Loading, Caching and Batching

Fragments mount as **independent React roots**. There is no shared React tree
across mount points, so a React context cannot be used to share a cache or a
request batcher between fragments. The mechanism that *is* shared is the JS
module graph: fragment bundles are split from the main app but share the app's
module chunk. That gives us the primitive we need — **a module-scoped singleton
is shared across every fragment mount within the same app**, without crossing
any React boundary.

The whole layer is built on that fact: put the cache and the batcher in module
scope, hand each fragment its own provider that points at the shared instance.

### Scope rules

- **Singletons are module variables**, not `globalThis`. Putting them on
  `globalThis` would make them process-wide and couple fragments from *different*
  apps that happen to share the page. We don't want that.
- **Each app bundles the loader into a single shared chunk.** Configure the
  bundler so `agent-loader` / `query-client` are emitted into one chunk that all
  of that app's fragments import. Result: one instance per app runtime — every
  fragment in the app shares it, and nothing leaks to other apps.
- **Cross-app sharing is intentional and lives at one layer only: the browser
  HTTP cache** on the batch endpoint (see the layered model below). App runtimes
  never share in-memory state.

> Bundler note: the loader module must resolve to a *single* instance within the
> app. Emit it into one shared chunk (e.g. a `manualChunks` group) so it is not
> duplicated per fragment. If it were duplicated, you'd silently get two
> batchers and batching would break.

### The batcher (module singleton)

Batching collapses N concurrent by-id fetches into one request. `batshit`'s
`create` returns a module-level construct; keep it as a plain module `const`.

```ts
// agent-loader.ts — emitted into the app's single shared chunk
import { create, keyResolver, windowScheduler } from '@yornaath/batshit'

const agentBatcher = create({
  fetcher: async (ids: string[]) => {
    const res = await fetch(`/api/agents?ids=${ids.join(',')}`)
    return (await res.json()) as Agent[]
  },
  resolver: keyResolver('id'),
  scheduler: windowScheduler(10), // collect all .fetch() calls within 10ms → 1 request
})

export const fetchAgent = (id: string) => agentBatcher.fetch(id)
```

Every fragment that imports `fetchAgent` calls into the *same* batcher instance.
Five search tiles each calling `fetchAgent(id)` within the window produce a
single `/api/agents?ids=a,b,c,d,e` request. The `resolver` dedupes repeated ids
within a batch.

### The cache (module-singleton client, provider per fragment)

This is the direct answer to "I can't share it via React context": each fragment
gets its **own** `QueryClientProvider`, but they all point at the **same** client
instance. The client owns the `QueryCache`; the providers just distribute it into
each independent tree.

```ts
// query-client.ts — same shared chunk
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000 } },
})
```

```tsx
// each fragment mount
function AgentTileFragment({ id }: { id: string }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AgentTile id={id} />
    </QueryClientProvider>
  )
}

function AgentTile({ id }: { id: string }) {
  const { data } = useQuery({
    queryKey: ['agent', id],
    queryFn: () => fetchAgent(id), // → shared batcher
  })
  // ...
}
```

Multiple providers sharing one client is fully supported. So five search tiles
are five React roots and five providers, but **one cache and one batcher**. Each
tile's `useQuery(['agent', id])` calls the batcher; `batshit` collapses the calls
into one request; the query cache dedupes if any id repeats (e.g. a favourite
that also appears in search results).

### Seeding from a list load

When an app loads a list *with full details* (e.g. the latest 20 agents), fan it
into the shared query cache keyed by id so subsequent by-id views resolve with
zero network:

```ts
agents.forEach(a => queryClient.setQueryData(['agent', a.id], a))
```

The favourites page's 3 tiles and any search tile whose id was in that 20 now
resolve from cache and never reach the batcher. Only genuine misses fall through.

### Layered caching model

Three caches do different jobs at different scopes:

| Layer | Scope | Handles |
| --- | --- | --- |
| TanStack query cache (singleton) | within one app runtime | dedup, staleness, seed-from-list |
| batshit batcher (singleton) | within one app runtime | collapse concurrent by-id fetches into one request |
| Browser HTTP cache | across app runtimes | stable-id batch requests |

Within a single app runtime, the singleton query cache and batcher cover
everything — batching, dedup, cache-by-id, seeding.

Across apps (separate runtimes — e.g. the agents app vs. the home app that embeds
an agents-app fragment), the in-memory caches are **not** shared. The only shared
layer is the browser HTTP cache on the batch endpoint. This is why the favourites
case is fast: 3 stable ids → stable URL `/api/agents?ids=1,2,3` → cache hit on
revisit.

Note the asymmetry for search: search tiles won't get HTTP-cache hits because the
id combination is unique per query, so the URL varies. That's expected — batshit
still collapses them into one request, which is the win there. Don't rely on the
browser layer for varying id sets; rely on it for stable sets like favourites.

### Batching window

`windowScheduler(10)` starts a 10ms timer on the *first* fetch and collects
everything until it fires. Because the loader chunk is already loaded, tiles
rendered from one result set mount within the same tick and batch cleanly.

If mounts are staggered (lazy per-tile JS, virtualized lists revealing tiles on
scroll), a fixed window produces several small batches. Switch to
`bufferScheduler({ min, max })` so it waits for a burst instead of a fixed
interval.
