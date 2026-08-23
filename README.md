# yue-snap-annotator

An offline-first TypeScript library that tokenizes Cantonese, supplies Jyutping, and adds English word glosses when known.

## Use

```ts
import { annotate } from "yue-snap-annotator";

const tokens = await annotate("我鍾意貓。");
```

Unknown word glosses remain absent, allowing callers to leave them unknown or provide their own fallback.

Runtime annotation requires no API or internet connection. The package ships with the historical local Cantonese trie and a bundled YueSBWords snapshot. Browser and Chrome-extension environments can periodically refresh that snapshot into IndexedDB while retaining local data when offline.

## Development

```sh
npm install
npm test
```

`npm run snapshot:update` regenerates the bundled snapshot from the bidirectional `yue ↔ en` rows in Supabase `words2`. Normal builds retain the checked-in snapshot when Supabase is not configured.
