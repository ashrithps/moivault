---
name: moivault
description: >
  Search, retrieve, and correlate documents from the user's encrypted Vault.
  Use when the user asks about their personal documents — passports, visas, medical reports,
  tax records, bank statements, contracts, insurance, IDs, receipts, certificates, flights,
  or any stored document. Also use when the user needs to find, compare, or cross-reference
  information across their documents.
metadata:
  short-description: Query encrypted document vault
---

# moivault — Vault Document Intelligence

## Overview

`moivault` is a CLI that gives you access to the user's encrypted document vault. It syncs from a Convex backend and stores decrypted documents in a local SQLite database. Documents include full OCR text, structured fields, tags, owners, and metadata.

The vault contains personal and business documents: passports, visas, IDs, medical reports, bank statements, tax returns, contracts, insurance, certificates, receipts, flights, prescriptions, and more.

## Prerequisites

- `moivault` must be installed and authenticated (check with `moivault auth status`)
- If `readyToUnlock` is false, the user needs to run `moivault auth login` first
- Auto-unlock is configured — no password needed for commands

## Commands

```bash
moivault sync                        # Sync latest from server (run first if data seems stale)
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
moivault doc edit <id> <field> <val> # Edit a field (title, tags, type, owner, or custom)
moivault doc delete <id>             # Delete a document (local + server)
moivault doc delete <id> --force     # Delete without confirmation
moivault doc types                   # List all document types with counts
moivault usage                       # Show API usage and plan details
moivault stats                       # Vault overview (doc count, types, last sync)
```

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
`gift_card`, `rent_agreement`, `membership`, `generic`.

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

## Downloading Files

Use `doc download` when the user needs the actual file (PDF, image, etc.), not just the text:
```bash
moivault doc download <id>                      # saves to ~/Downloads/<title>.<ext>
moivault doc download <id> --output /tmp/doc.pdf # saves to specific path
```
- Files are fetched from Convex storage and decrypted automatically
- Only download when explicitly requested — for reading content, use `doc text` instead
- Returns `{ status, path, size }` in JSON mode

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

## Error Handling

- "Vault is locked" → auto-unlock should handle this; if not, run `moivault unlock`
- "Not authenticated" → run `moivault auth login`
- Search returns 0 results → DON'T say "not found" immediately. Try alternative searches.
  Only report "not in vault" after exhausting search strategies.
- Vector search fails → falls back gracefully to FTS results. May show a stderr warning.
