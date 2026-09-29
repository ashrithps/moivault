---
name: moivault
description: >
  Search, retrieve, and correlate documents, saved videos, web links, and bookmarks from the
  user's encrypted Vault. TRIGGER on: "I watched a video about X", "that article about Y",
  "the link I saved", "what was that YouTube video", "I saw something about...", "remember
  that thing I saved about...", or ANY reference to previously consumed content (videos, links,
  articles, bookmarks, saved pages, YouTube, tweets, posts). Also trigger when the user asks
  about their personal documents — passports, visas, medical reports, tax records, bank
  statements, contracts, insurance, IDs, receipts, certificates, flights, or any stored
  document. Also use when the user needs to find, compare, or cross-reference information
  across their documents.
metadata:
  short-description: Query vault — documents, saved videos, web links & bookmarks
---

# moivault — Vault Document Intelligence

## Overview

`moivault` is a CLI that gives you access to the user's encrypted document vault. It syncs from a Convex backend and stores decrypted documents in a local SQLite database. Documents include full OCR text, structured fields, tags, owners, and metadata.

The vault contains personal and business documents: passports, visas, IDs, medical reports, bank statements, tax returns, contracts, insurance, certificates, receipts, flights, prescriptions, and more.

## Prerequisites

- `moivault` must be installed and connected (check with `moivault auth status`)
- `mode: "connection"` — this machine is paired with the user's phone and sees what its preset allows (see below). This is the normal case.
- `mode: "legacy"` — linked with the older method; it reads every space. Suggest reconnecting from the app (Settings → AI agents) when it comes up, but don't nag. A legacy install holds only the space key it was linked with, so after a key rotation `doc edit` fails with `No key held for space … version N`. Prefer the paired CLI for writes.
- **Check you are running the right binary.** `which -a moivault` — the installer puts the current CLI at `~/.local/bin/moivault` (→ `~/.moivault/moivault.js`), but an older global npm `vault-cli` can come first on PATH and shadow it. If `auth status` shows `legacy` right after the user paired, that's the cause: call `~/.local/bin/moivault` directly and suggest `npm uninstall -g vault-cli`.
- `mode: "none"` — the user needs to connect: in the app, Settings → AI agents → Connect an agent, then run the `moivault auth pair <code>` command it shows
- A connection can be **tagged** for one agent ("Who is this for?" in the app, `--agent <key>` on the command). `vault_permissions` shows it as `intendedAgent`. Nothing changes for you: if you are a different agent on the same machine you still work normally, and `vault_permissions` carries a `mismatch` note because the user's phone notices and may ask them to allow or block you. Don't try to work around it.

## What you can see — and how to ask for more

The user picks one of three presets for you when they connect you, and can change it any time. `vault_permissions` tells you which one you have, in plain words — check it at the start of a vault task.

| Preset | What you see | Writes |
|---|---|---|
| **Full** (the default) | Every space the user shared, synced here — search and read freely | Creates and edits go through. **Deletes are proposed** to the user unless they allowed deletes |
| **Standard** | The *context card*: every document's title, type, owner, dates and path — **no contents or field values** | Every write is proposed |
| **Private** | Nothing until the user approves a request | Every write is proposed |

**Full.** Work as normal. Opening a sensitive document (IDs, passports, medical, tax, bank, loans…) sends the user a notice that you did — it doesn't block you, but only open what the task needs.

**Standard.** `vault_ls`, `vault_tree`, `vault_profile` and `vault_search` (title / type / owner matching) answer from the card. You can say *"your passport expires in 40 days"* from it. Entries marked `readable: false` (or `(ask)` in the tree, `source: "context"` in search) are listed only: to read one, ask for it **by id** — `vault_request({ reason, blobIds: ["<id>"] })` — so the phone preselects exactly that document.

**Private.** Tools return a hint instead of results. Ask with `vault_request` and a `hint` ("passport") so the phone can suggest documents.

**Asking — narrowly, with a reason the user will recognize:**

1. `vault_request({ reason, hint?, blobIds? })` — `reason` is shown on their phone. Say what you are doing for them and what you need from the document: *"To fill in the visa form you asked for, I need your passport number and expiry date."* Pass `blobIds` when you saw the document listed; otherwise a short `hint`.
2. Tell the user you've asked on their phone.
3. `vault_request_status({ requestId, waitSeconds: 60 })` — waits for the answer. Call again if it is still `pending`.
4. `approved` returns the documents' text and fields. They are held in memory only — use them for the task at hand; don't copy them into files or notes unless the user asks.
5. `denied` — respect it. Don't re-ask for the same thing unless the user brings it up.

Ask for documents (`kind: "read"`), not whole spaces. Only use `kind: "space"` with a `spaceId` when the task genuinely needs ongoing access to everything in it, and say why. Never ask "just in case", and never bundle unrelated documents into one request.

**Pending writes.** `vault_doc_create`, `vault_doc_upload`, `vault_doc_edit`, `vault_doc_update_content`, `vault_doc_delete` and `vault_remember` may return `{ status: "pending_approval", requestId }`: the change is proposed on the phone and **nothing is saved yet** — the user also picks which space it lands in. Tell the user it's waiting for their approval; don't say it's done. Confirm later with `vault_request_status`. Pass a short `reason` so the user knows why. Under Full, expect deletes to be pending.

Everything you do is logged in the user's history on their phone, by agent: the tool, the documents, and — sealed so only the phone can read it — your query, path or title. Failed calls are logged too. Act like it.

### MCP tools

| Tool | Use |
|---|---|
| `vault_search`, `vault_context`, `vault_doc_list` | Find documents (results include a `path`) |
| `vault_doc_get` / `_text` / `_fields` / `_download` | Read one document — by `id` or `path` |
| `vault_ls({path})`, `vault_tree({depth})` | Browse like a filesystem: `vault/<space>/<person>/<file>` |
| `vault_profile` | People, counts by type, upcoming expiries — a quick orientation |
| `vault_permissions` | Your preset, and what you can see, write and delete right now |
| `vault_request`, `vault_request_status` | Ask for documents (by `blobIds` or `hint`) or a space; wait for the answer |
| `vault_remember({fact})` | Save a short fact the user told you to remember (a note, marked as saved by you) |
| `vault_doc_create` / `_edit` / `_update_content` / `_delete` / `_upload` | Write (may be `pending_approval`) |
| `vault_places`, `vault_wishlist`, `vault_recipes`, `vault_apps`, `vault_hacks` | Lifestyle collections |

Paths are derived from space, owner and title, so they can change; the `id` never does. Quote paths to the user, keep ids for follow-up calls.

## IMPORTANT: Always Sync First

**Before any vault operation, ALWAYS run `moivault sync` first.** This ensures you have the latest documents from the server. Do this at the start of every session or conversation that involves vault data. Do NOT skip this step.

## Commands

```bash
moivault sync                        # Sync latest from server (run first if data seems stale)
moivault ls [vault/<space>/<person>] # Browse as folders; files show their id
moivault spaces                      # Preset, spaces shared in full, and those that need asking
moivault auth status                 # Mode (connection / legacy), machine, fingerprint
moivault auth pair <code>            # Connect this machine (code from the app)
moivault auth pair <code> --agent cursor   # …for one agent (the app adds this when you pick one)
moivault serve                       # MCP over HTTP for Claude.ai / ChatGPT (via cloudflared)
moivault search "<query>"            # Hybrid search (FTS + vector) — default, best results
moivault search "<query>" --mode fts    # Full-text only — fast, exact keyword match
moivault search "<query>" --mode vector # Vector only — semantic/concept matching via Gemini embeddings
moivault search "<query>" --type <type> # Filter results by document type
moivault search "<query>" --tags <t1,t2> # Filter results by tags
moivault search "<query>" --limit <n>   # Max results (default: 10)
moivault search "<query>" --threshold <score> # Min vector similarity score (default: 0.3)
moivault doc list                    # List all documents (sorted by newest)
moivault doc list --type <type>      # Filter by document type
moivault doc list --tags <t1,t2>     # Filter by tags
moivault doc get <id>                # Full metadata for a document
moivault doc text <id>               # Raw OCR text (full document content)
moivault doc fields <id>             # Structured extracted fields
moivault doc download <id>           # Download original file to ~/Downloads/
moivault doc download <id> --output <path>  # Download to specific path
moivault doc upload <file>           # Upload a document (PDF, image) to the vault
moivault doc preview <id...>         # Make the phone's thumbnail for a doc that has none
moivault doc preview --missing       # ...for every doc with a file but no thumbnail
moivault doc edit <id> <field> <val> # Edit a field (title, tags, type, owner, or custom)
moivault doc delete <id>             # Delete a document (local + server)
moivault doc delete <id> --force     # Delete without confirmation
moivault doc types                   # List all document types with counts
moivault doc create --title "<title>" --content "<text>"  # Create a text/markdown document
moivault doc create --title "<title>" --file <path>       # Create from a file
moivault doc update-content <id> --content "<text>"       # Update document content
moivault doc update-content <id> --file <path>            # Update content from file
moivault context "<query>"           # RAG retrieval — returns doc context as JSON for any agent
moivault context "<query>" --limit 5 --chunks 4 --include-fields
moivault chunk build                 # Build chunk index (splits docs + embeds via Gemini)
moivault chunk status                # Show chunk index status
moivault usage                       # Show API usage and plan details
moivault stats                       # Vault overview (doc count, types, last sync)
```

### Creating Documents

```bash
# Create from inline content
moivault doc create --title "Meeting Notes" --content "# Meeting\n- Action item 1"

# Create from file
moivault doc create --title "Report" --file ./report.md

# Create from stdin (pipe from another command)
echo "# Agent Analysis\nFindings..." | moivault doc create --title "Analysis"

# With tags and forced type
moivault doc create --title "Recipe" --file recipe.md --tags "cooking,dinner" --type note
```

### Updating Document Content

```bash
moivault doc update-content <id> --content "# Updated notes"
moivault doc update-content <id> --file ./updated.md
echo "new content" | moivault doc update-content <id>

# Quick edit via doc edit
moivault doc edit <id> content "# Quick update"
```

### Saving Notes & Reports

To save findings, analysis, or notes to the user's vault:
- Use `moivault doc create` — content is encrypted, searchable, and syncs to mobile app
- Text documents support full-text search, vector search, and RAG context retrieval
- The mobile app renders markdown with full formatting (headings, lists, code blocks, etc.)

## Search Modes

The CLI supports three search modes. **Always use hybrid (default) unless you have a reason not to.**

### Hybrid (default) — `--mode hybrid`
Combines FTS keyword matching with vector semantic search. Best overall results.
- FTS finds docs containing exact keywords
- Vector finds docs that are semantically related even without keyword matches
- Results are merged and ranked by score

### FTS — `--mode fts`
Full-text search using SQLite FTS5. Fast (~5ms), matches exact tokens.
- Great for: names, numbers, specific terms ("passport", "DEXA", "PAN")
- Misses: synonyms, concepts, paraphrased queries

### Vector — `--mode vector`
Semantic search using Gemini embeddings + cosine similarity. Slower (~1-2s, needs Convex API call).
- Great for: natural language questions, concept matching ("am I at risk for diabetes", "body fat analysis")
- Limitation: only works on docs that have embeddings (newer docs). Older docs without embeddings won't appear in vector-only mode.

### When to use which:
- **"Find my passport"** → FTS is sufficient, hybrid also works
- **"What documents do I need for a bank account?"** → hybrid, then follow up per-item
- **"Am I at risk for diabetes?"** → vector excels here, hybrid catches both
- **"Ashrith's medical reports"** → FTS by name + type, hybrid for broader coverage
- **Comparing documents** → search to find IDs, then `doc text` each one

## Document Types

Common types in the vault: `flight`, `id`, `visa`, `business_card`, `receipt`, `contract`,
`tax_id`, `tax_return`, `insurance`, `medical`, `vehicle`, `warranty`, `event_ticket`,
`education`, `certification`, `real_estate`, `bank_statement`, `pet_record`, `subscription`,
`utility_bill`, `prescription`, `drivers_license`, `birth_certificate`, `certificate`,
`marriage_certificate`, `loan`, `invoice`, `salary_slip`, `investment`, `vaccination`,
`travel_itinerary`, `boarding_pass`, `train_ticket`, `car_rental`, `hotel_booking`,
`gift_card`, `rent_agreement`, `membership`, `note`, `generic`,
`place`, `recipe`, `product_research`, `app`, `life_hack`.

## Places, Wishlist, Recipes — Smart Triggers

Three high-signal types. Always render as a markdown table with a clickable
link column so the user can jump straight from chat to action.

### `place` — saved venues from reels/articles
Trigger phrases: "places to visit", "where should we eat", "where to go in <city>",
"what's on our wishlist for <city>", "restaurants we want to try", "have we been to <X>",
"any good <cuisine> spots", "list our food spots", "wife and I are going to <city>".

Query strategy:
1. `moivault doc list --type place`
2. Filter by `fields.area`, `fields.city`, `fields.cuisineType`, or `fields.placeType` if user mentioned them
3. Split by `fields.visitStatus`: "visited" vs the rest (wishlist/planned)
4. For multi-place docs, `fields.places` is an array — flatten one row per entry

Fields you'll see: `placeName`, `placeType` (Restaurant/Cafe/Bar/Hotel/Attraction), `cuisineType`,
`area` (neighborhood), `city`, `country`, `priceRange`, `signatureItems[]`, `recommendedBy`,
`visitStatus` ("visited" | "planned"), `userRating` (0-5), `userVisitDate`, `mapsUrl`, `sourceUrl`.

**Maps link rule:** every place row MUST have a clickable Maps link.
- If `fields.mapsUrl` exists, use it.
- Otherwise build: `https://www.google.com/maps/search/?api=1&query=<URL-encoded "placeName, area, city">`

Default response format:

| Place | Area | Cuisine | Status | ⭐ | Maps |
|-------|------|---------|--------|---|------|
| The Patty Shack | HSR Layout · Bangalore | Burgers | Wishlist | — | [Open](https://www.google.com/maps/search/?api=1&query=The+Patty+Shack%2C+HSR+Layout%2C+Bangalore) |
| GoodMood India | HSR Layout · Bangalore | Gelato | ✓ Visited | ★★★★ | [Open](https://www.google.com/maps/search/?api=1&query=GoodMood+India%2C+HSR+Layout%2C+Bangalore) |

Group by city when results span multiple cities. Lead with wishlist by default; flip to visited only when user asked.

### `product_research` — wishlist / things to buy
Trigger phrases: "my wishlist", "what do I want to buy", "things on my list", "what gear
have I saved", "do I already have <X>", "should I buy <X>", "what was that thing I wanted".

Read `fields.purchaseStatus`:
- `wishlist` / `wanted` / blank with a price → on the wishlist
- `owned` / `purchased` / `bought` → already owned
- `researching` → still comparing

Default response format:

| Product | Brand | Price | Status | ⭐ | Link |
|---------|-------|-------|--------|---|------|
| AirPods Pro 3 | Apple | $249 | Wishlist | — | [Buy](productUrl) or [Source](sourceUrl) |

Use `fields.productUrl` for the buy link if present, else `fields.sourceUrl`.

### `recipe` — saved dishes
Trigger phrases: "what should I cook", "any chicken recipes", "high-protein meals",
"quick dinner ideas", "the recipe I saved", "what was that <dish>".

Filter by `fields.cuisine`, `fields.course`, `fields.dietaryTags[]`, or `fields.totalTime` (minutes).

Default response format:

| Dish | Cuisine | Time | Serves | Protein | Source |
|------|---------|------|--------|---------|--------|
| Miso Glazed Salmon | Japanese | 25m | 4 | 32g | [link](sourceUrl) |

Show calories/protein columns only when at least one row has them. Sort by relevance
(if user asked for "quick", sort by `totalTime` asc; for "high-protein", sort by `proteinGrams` desc).

### `app` — saved software apps
Trigger phrases: "apps I want to try", "what was that app", "the app for X", "any productivity apps", "apps I use".

Read `fields.downloadStatus`: `wishlist` (default — they saved it to try) or `installed`.

Default response format:

| App | Developer | Platforms | Price | Status | Link |
|-----|-----------|-----------|-------|--------|------|
| Things 3 | Cultured Code | iOS, macOS | $49.99 | Wishlist | [App Store](appStoreUrl) |

Use `productUrl` order: `appStoreUrl` → `playStoreUrl` → `websiteUrl` (whichever exists).

### `life_hack` — saved tips, tricks, hacks
Trigger phrases: "any tips for X", "how do I X", "that hack about Y", "lifehack for Z", "tricks I saved".

Filter by `fields.category` (Kitchen/Home/Money/Productivity/Travel/Study/Health/Beauty/Parenting).

Default response format:

| Tip | Category | Steps | Time | Source |
|-----|----------|-------|------|--------|
| Unclog drain with baking soda | Home | 4 | 10m | [link](sourceUrl) |

Add a "Savings" column when at least one row has a `savings` value.

### When NOT to use the table format
- Single place/product/recipe/app/hack → answer conversationally, then add the link inline.
- User asked a yes/no question ("have we been to X?") → answer in one sentence; only add a table if they ask for the list.

## CRITICAL: Search Strategy

**Never assume a document doesn't exist based on a single search.** Always use a multi-step
search strategy:

### Step 1: Hybrid search first (covers keywords + semantics)
```bash
moivault search "emirates id"
```

### Step 2: If few results, broaden with alternative terms
Documents may use different words than the user. Try:
- Synonyms: "heart" → also try "cardio", "cardiac", "echocardiogram"
- Official names: "drivers license" → also try "driving licence", "DL"
- Abbreviations: "PAN" → also try "tax id", "permanent account"
- Natural language: try vector mode with a question like "heart health checkup"

### Step 3: Search by type when keywords fail
```bash
moivault doc list --type visa
moivault doc list --type id
moivault doc list --type medical
```

### Step 4: Search by owner/person
```bash
moivault search "<person name>"
```

### Step 5: Read raw text for deep matches
If you know a doc exists but search doesn't find it, list by type and read the text:
```bash
moivault doc list --type medical    # find candidates
moivault doc text <id>              # read full OCR text
```

## CRITICAL: Cross-Referencing & Correlation

When the user asks a question that requires multiple documents, **always do follow-up searches**.
Do NOT assume information is missing based on one search result set.

### Example: "What docs do I need for X?"
1. Search for docs directly related to X
2. Identify what's needed (e.g., bank account needs: ID, passport, address proof, license)
3. **Search for EACH required item separately** — don't just report what the first search found
4. Report what's in the vault AND what's missing

### Example: "Compare my medical reports"
1. `moivault doc list --type medical` — get all medical docs
2. Filter by owner if specified
3. `moivault doc text <id>` for each relevant doc
4. Extract comparable metrics and present side-by-side

### Example: "When does my X expire?"
1. Search for the document type
2. Check the `fields` for expiry/validity dates
3. Calculate time remaining from today

### Example: "Am I healthy?" or "What are my risk factors?"
1. Use hybrid search: `moivault search "health checkup blood report"`
2. Also try vector: `moivault search "health risk factors" --mode vector`
3. Get full text of medical docs: `moivault doc text <id>`
4. Cross-reference multiple reports for a complete picture

## YouTube Videos & Web Links

The vault stores saved YouTube videos and web links with full metadata:

**YouTube videos** (`type: youtube`): Include full transcripts, channel name, URL.
- User might say: "I watched a video about...", "that YouTube video where...", "the video about mac apps"
- Search by topic, channel, or keywords from the transcript
- Use `doc text <id>` to read the full transcript

**Web links** (`type: web_link`): Saved articles, tweets, bookmarks with page text.
- User might say: "that article I saved", "the link about...", "I bookmarked something about..."

**Search strategy for videos/links:**
```bash
moivault search "mac apps productivity"          # keyword match on transcript
moivault search "video about mac apps" --mode vector  # semantic match
moivault doc list --type youtube                  # list all saved videos
moivault doc list --type web_link                 # list all saved links
moivault doc text <id>                            # read full transcript/page text
```

## Downloading Files

Use `doc download` when the user needs the actual file (PDF, image, etc.), not just the text:
```bash
moivault doc download <id>                      # saves to ~/Downloads/<title>.<ext>
moivault doc download <id> --output /tmp/doc.pdf # saves to specific path
```
- Files are fetched from R2 storage (encrypted) and decrypted automatically
- Only download when explicitly requested — for reading content, use `doc text` instead
- Returns `{ status, path, size }` in JSON mode

## Uploading Files

- **Check `preview` in the upload result.** `ready` means the phone shows a thumbnail. `skipped: <reason>` means it will show "tap to preview" instead. Tell the user, and run `moivault doc preview <id>` once the cause is fixed. `none` is normal for files that aren't PDFs or images.
- **Treat an upload as done only when it printed an `id`.** An upload can fail with no output at all. That happens reliably for files over roughly 23 MB (big phone or printer scans), and now and then for small ones. Loop over files, check each for an `id`, and retry a failure a couple of times.
- **Shrink big scans before uploading.** Upload a compressed copy (`gs -q -sDEVICE=pdfwrite -dPDFSETTINGS=/ebook -dNOPAUSE -dBATCH -sOutputFile=out.pdf in.pdf` takes a 40 MB scan to about 5–7 MB, still readable), and tell the user the vault holds the compressed copy.
- **The `id` is a hash of the file's contents.** Uploading the same bytes again updates the same document; it doesn't make a duplicate. Use this to repair a document that uploaded wrongly (for example, from a legacy install) instead of deleting it. A compressed copy has a different hash, so it becomes a new document.
- **Auto-titles are a guess.** Gemini names each upload from its contents and does poorly on handwritten or non-English scans. It may even invent text. If you know what a document is, `doc edit <id> title "…"` and `doc edit <id> tags "a,b"` after uploading, and don't trust `doc text` on handwriting.
- Before telling the user something is "in the vault", run `moivault sync` and confirm the documents come back. For a batch, give them a couple of titles to look for on their phone.

## Output Format

- All commands output JSON by default (non-TTY)
- `doc fields` returns structured data — prefer this for specific lookups
- `doc text` returns raw OCR — use this when you need full context or fields don't capture everything
- `doc download` fetches the original file (PDF/image) — use only when user needs the actual file
- `doc upload` uploads a local file — Gemini extracts text/fields/tags, encrypts, and syncs to vault + phone
- `doc edit` updates a field locally, re-encrypts the blob, and pushes to server. Syncs to phone.
- `doc delete` soft-deletes from server + removes from local DB. Use `--force` for non-interactive.
- `search` returns snippets — use `doc text` or `doc fields` for details after finding the doc
- Vector search results include a `score` (0-1) and `scoreSource` ("fts", "vector", or "hybrid")

## Multiple People

The vault contains documents for multiple people (family members). Always check the `owner`
field to distinguish whose document it is. When the user asks about "my" documents, consider
context to determine which person they mean. If ambiguous, show results for all people and
let the user clarify.

## Sync Before Searching

If the user says they just added a document, or if expected documents aren't found:
```bash
moivault sync    # Pull latest from server
```

## IMPORTANT: Destructive Actions Require Confirmation

Most moivault commands are safe to run without asking (search, list, get, text, fields, download,
upload, sync, context, stats, chunk, people list/docs/aliases, usage, auth status, ls, spaces). Run these freely.

`vault_request` puts a notification on the user's phone — only send one when the task needs it, and tell the user you did.

**ALWAYS confirm with the user before running these destructive commands:**
- `moivault doc delete <id>` — permanently deletes a document from the vault AND the server
- `moivault doc edit <id> ...` — modifies document metadata (title, tags, type, owner) and pushes to server
- `moivault people merge <a> <b>` — merges two people (irreversible alias)
- `moivault people rename <a> <b>` — bulk renames an owner across all their documents

For these commands, describe what you're about to do and wait for explicit user approval before executing.

## Error Handling

- "Vault is locked" / "not paired" → the user connects from the app: Settings → AI agents → Connect an agent
- "This machine was disconnected from your phone." → the user revoked this machine. Everything local was wiped; they need to connect again if they want to. Don't try to work around it.
- `NEEDS_APPROVAL` from a `moivault doc …` write command → the terminal can't propose writes; use the MCP write tools (they create a proposal on the phone) or ask the user to allow writes for that space
- `AGENT_NOT_GRANTED` → that space is Ask for you; use `vault_request`
- `No key held for space … version N` → you're on a legacy or stale binary without the space's current key (see Prerequisites). Switch to the paired CLI.
- The user says uploads "aren't on my phone" → first check whether the phone is syncing at all. Compare the document count the app shows ("N kept") with `moivault stats`. If the phone is behind on documents you didn't upload too, it's a sync problem on the phone or server, not your upload. Don't re-upload or guess; tell the user what you found.
- First `sync` after pairing is slow (it pulls the whole vault) and holds a lock. Uploads and reads can run alongside it but are slower.
- Search returns 0 results → DON'T say "not found" immediately. Try alternative searches.
  Only report "not in vault" after exhausting search strategies.
- Vector search fails → falls back gracefully to FTS results. May show a stderr warning.

## RAG Context Retrieval (for agents)

The `context` command is the preferred way for agents to query the vault. Instead of doing
`search` → `doc text` → manual reasoning, use `context` which does retrieval and returns
structured JSON that you can reason over directly:

```bash
moivault context "what are ashrith's health risks"
```

Returns:
```json
{
  "query": "...",
  "context": [
    { "docId": "...", "title": "...", "type": "medical", "chunks": ["...relevant text..."], "score": 0.71 }
  ],
  "people": ["Ashrith Govind"],
  "stats": { "chunksSearched": 381, "retrievalTimeMs": 1925 }
}
```

**Setup:** Run `moivault chunk build` once to create the chunk index (splits all docs into
~2000-char chunks and embeds them via Gemini). After that, `context` uses chunk-level
vector search for precise retrieval.

**Without chunks:** Falls back to doc-level search + truncated rawText. Still works, just less precise.

**Key flags:**
- `--limit <n>` — max documents (default 5)
- `--chunks <n>` — max chunks per doc (default 4)
- `--include-fields` — include structured fields in output
- `--type <type>` — filter by document type
- `--max-tokens <n>` — approximate token budget
