# moivault

CLI for [Vault](https://vault.moi) — encrypted document management for agents and humans.

Search, retrieve, and correlate documents from your encrypted vault. Designed for AI agents (Claude Code, Cursor, etc.) with JSON output by default.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/ashrithps/moivault/master/install.sh | bash
```

macOS and Linux (x64 / arm64), Node.js 20+. Installs to `~/.moivault/` on macOS and
`$XDG_DATA_HOME/moivault` (usually `~/.local/share/moivault`) on Linux, with a launcher
at `~/.local/bin/moivault`. Auto-installs agent skills (Claude Code, Codex, Cursor, etc.),
and on macOS the Claude Desktop MCP server.

### Connect to your phone

Open the Vault app → Settings → **AI agents** → **Connect an agent**, choose what it may
see, and paste the command it gives you:

```bash
curl -fsSL https://raw.githubusercontent.com/ashrithps/moivault/master/install.sh | bash -s -- --pair <code>
```

Or, with moivault already installed: `moivault auth pair <code>`.

**For one agent.** Under *Who is this for?* the app can tag the connection for one agent,
and the command gains `--agent <key>`:

```bash
… | bash -s -- --pair <code> --agent cursor
```

Keys: `claude-code`, `claude-desktop`, `cursor`, `codex`, `gemini`, `windsurf`, `copilot`,
`chatgpt`, `claude-web`, `terminal`, or `any` (the default). A tagged install sets up only
that agent: its skill, or for `claude-desktop` its MCP entry. For `chatgpt` and
`claude-web` it installs nothing agent-specific and prints the `moivault serve` steps.
`moivault auth status` and `moivault spaces` show who the machine is for. A tag is a
label, not a lock: every agent on a machine shares its keys. If a different agent uses the
connection, your phone tells you and offers to allow or block it.

The terminal prints a fingerprint like `A1B2-C3D4-E5F6-0718`, and the phone shows one
too. **Approve on the phone only if they match.** Then `moivault sync`.

## How a connection works

Each machine you connect is its own, separately revocable principal.

- **Nothing that unlocks your vault leaves the phone.** The pairing code is single-use
  and lasts 10 minutes. This machine generates its own X25519 keypair and a credential;
  only the public key and the credential's hash go to the server. No master password,
  no secret key, no phone session.
- **You pick a preset per agent,** and can change it any time:

  | Preset | The agent sees | Its writes |
  |---|---|---|
  | **Full** (default) | Every space you hold, synced to this machine | Creates and edits go through; deletes are proposals unless you allow them |
  | **Standard** | A *context card*: titles, types, owners, dates — no contents | All proposals |
  | **Private** | Nothing until you approve a request | All proposals |

  Under Full, an agent opening a sensitive document (IDs, medical, tax, bank…) sends you
  a notice — not a prompt. Only what a preset grants is sealed to this machine's key.
- **Ask = approve on your phone.** When an agent needs a private document — a passport
  for a visa form — it asks with a reason. You get a notification, pick the documents,
  and choose *once*, *always*, or *the whole space*. The document key is sealed to this
  machine for that grant, and the document is served through a logged call and kept in
  memory, never written to disk here.
- **Writes are proposals unless you allow them.** An agent saving, changing or deleting a
  document without that permission creates a proposal — files included, staged encrypted
  until you decide; the phone picks which space it lands in, or rejects it.
- **History on your phone.** Every tool call is reported by agent ("Claude Code on
  work-laptop"), failures included, and reads of Ask documents are logged by the server
  itself. Each report carries a detail sealed to your own key: the search query, path, or
  title of a new note, never document contents or field values. The server stores it
  but cannot read it. Only your phone can open it, so the history reads *Claude Code
  searched "passport renewal" · 3 results*, and you can search and filter it there.
  Documents an agent saves carry a *Saved by* mark.
- **Revoke from your phone** (Settings → AI agents). The next call from this machine is
  refused, and moivault wipes its keys, its database and its config, then says
  *This machine was disconnected from your phone.* `moivault auth logout` only clears this
  machine; it does not revoke anything server-side.

Secrets live in the macOS Keychain, the Linux Secret Service (`secret-tool`, when
installed), or else a `0600` file in the config directory. Machines linked with the older
`--payload` method keep working but cannot be revoked individually — reconnect with
`--pair` to fix that.

## Use it from Claude.ai or ChatGPT

```bash
moivault serve
```

Serves the same MCP tools over HTTP on `127.0.0.1:8798`, at a path containing a random
secret. If [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
is installed (`brew install cloudflared`), it opens a quick tunnel and prints a public
connector URL:

- **Claude.ai** — Settings → Connectors → *Add custom connector* → paste the URL.
- **ChatGPT** — Settings → Connectors (turn on Developer mode under Advanced) → *Create* → paste the URL.

Decryption stays on your machine, and the connector sees exactly what this machine's
connection allows. The URL is the key: `moivault serve --rotate` issues a new one.
`--no-tunnel` serves locally only; `--port` changes the port. Bearer auth
(`Authorization: Bearer <secret>` at `/mcp`) works too.

## Quick Start

1. **Connect** — see above.
2. **Sync** what you shared:
   ```bash
   moivault sync
   ```
3. **Search** and browse:
   ```bash
   moivault search "passport"
   moivault search "medical report" --mode vector   # semantic search
   moivault ls vault/family
   ```

## Commands

```
moivault sync                        # Sync from server (incremental)
moivault sync --full                 # Re-download everything
moivault search <query>              # Hybrid FTS + vector search
moivault search <query> --mode fts   # Keyword search only
moivault search <query> --mode vector # Semantic search only

moivault doc list                    # List all documents
moivault doc list --type medical     # Filter by type
moivault doc get <id>                # Full metadata
moivault doc text <id>               # Raw OCR text
moivault doc fields <id>             # Structured fields
moivault doc upload <file> [file2...] # Upload PDF/image(s) to vault (batch supported)
moivault doc download <id>           # Download original file
moivault doc edit <id> <field> <val> # Edit title, tags, type, owner, or custom field
moivault doc delete <id>             # Delete document (local + server)
moivault doc types                   # List doc types with counts

moivault people list                 # All people with doc counts
moivault people docs <name>          # Documents for a person
moivault people aliases              # Show people registry with aliases
moivault people merge <alias> <name> # Merge a name as alias of another
moivault people rename <from> <to>   # Bulk rename owner on docs

moivault places                      # Saved places with Maps links (table view)
moivault places --filter wishlist    # Just the ones you want to visit
moivault places --filter visited     # Just the ones you've been to
moivault places --area X --cuisine pizza  # Filter by neighborhood / cuisine
moivault wishlist                    # Products you want to buy
moivault wishlist --filter owned     # Already-purchased items
moivault recipes                     # Saved dishes with prep / cook / serves
moivault recipes --max-minutes 30 --dietary high-protein
moivault apps                        # Software apps you've saved (wishlist + installed)
moivault apps --platform iOS         # Filter by platform
moivault hacks                       # Saved life hacks / tips with steps and time
moivault hacks --category Kitchen    # Filter by category

moivault context <query>             # RAG retrieval — structured context for any agent
moivault context <query> --limit 5 --include-fields
moivault chunk build                 # Build chunk index (splits docs + embeds)
moivault chunk status                # Show chunk index status

moivault ls [path]                   # Browse as folders: vault/<space>/<person>/<file>
moivault spaces                      # Spaces shared in full, and those that need asking

moivault usage                       # API usage and plan details
moivault stats                       # Vault statistics
moivault auth pair <code>            # Connect this machine (code from the app)
moivault auth status                 # Mode, machine name, fingerprint
moivault auth logout                 # Forget credentials on this machine (revoke from the phone)
moivault mcp                         # Start MCP server (stdio) for Claude Desktop/Cursor
moivault serve                       # MCP over HTTP for Claude.ai / ChatGPT
```

## For AI Agents

Works with any AI coding agent. The installer auto-detects and installs the skill file for:

- **Claude Code** — `~/.claude/skills/moivault/`
- **Codex (OpenAI)** — `~/.codex/skills/moivault/` + `AGENTS.md`
- **Cursor** — `~/.cursor/skills/moivault/`
- **Windsurf / Codeium** — `~/.windsurf/skills/moivault/`
- **Cline / Roo Code** — `~/.agents/skills/moivault/`
- **Amp** — `~/.config/agents/skills/moivault/`
- **Gemini CLI / Antigravity** — `~/.gemini/antigravity/skills/moivault/`
- **GitHub Copilot** — `~/.github-copilot/skills/moivault/`
- **Goose** — `~/.config/goose/skills/moivault/`
- **OpenCode** — `~/.config/opencode/skills/moivault/`
- **Claude Desktop** — auto-configured as MCP server (no manual setup)
- **Trae / Kilo / Augment / Aider / VSCode** — auto-detected
- **Any other agent** — `~/.config/moivault/SKILL.md`

### MCP Server (Claude Desktop, Cursor)

The installer auto-configures Claude Desktop (macOS) with the moivault MCP server. After install, restart Claude Desktop and **30 vault tools** are available natively:

`vault_search` · `vault_context` · `vault_doc_get` · `vault_doc_text` · `vault_doc_fields` · `vault_doc_list` · `vault_doc_types` · `vault_doc_edit` · `vault_doc_delete` · `vault_doc_download` · `vault_doc_upload` · `vault_doc_create` · `vault_doc_update_content` · `vault_sync` · `vault_stats` · `vault_people_list` · `vault_people_docs` · `vault_chunk_status` · `vault_places` · `vault_wishlist` · `vault_recipes` · `vault_apps` · `vault_hacks` · `vault_ls` · `vault_tree` · `vault_profile` · `vault_permissions` · `vault_request` · `vault_request_status` · `vault_remember`

- `vault_ls` / `vault_tree` browse the vault as `vault/<space>/<person>/<file>`; tools that take a document `id` also take a `path`.
- `vault_request` asks you on your phone for documents (by id from the context card, or a hint), with the agent's reason; `vault_request_status` waits for your answer.
- `vault_permissions` tells the agent its preset and what it can see, write and delete right now.
- `vault_remember` saves a short fact as a note marked as saved by that agent.

Features:
- JSON output by default (non-TTY). Pretty output with colors in interactive terminals.
- Unlocks on its own — a paired machine has no password to type.
- Hybrid search combines keyword matching (FTS) with semantic vector search (Gemini embeddings).

## Search Modes

| Mode | Flag | Speed | Best for |
|------|------|-------|----------|
| Hybrid | `--mode hybrid` (default) | ~2s | Best overall — combines FTS + vector |
| FTS | `--mode fts` | ~5ms | Exact keywords, names, numbers |
| Vector | `--mode vector` | ~1.5s | Semantic queries, concepts, synonyms |

## Document Types

The vault classifies docs into 40+ types so each one renders with the right card and field set. Notable lifestyle types:

- **`place`** — saved venues (restaurants, cafes, bars, attractions, hotels) from reels/articles. Fields: `placeName`, `placeType`, `cuisineType`, `area`, `city`, `country`, `priceRange`, `signatureItems[]`, `recommendedBy`, `mapsUrl`, `sourceUrl`, `visitStatus` ("visited" | "planned"), `userRating` (0-5), `userVisitDate`. Multi-place reels populate a `places[]` array with one entry per venue.
- **`recipe`** — saved dishes from cooking reels/shorts/articles. Fields: `dishName`, `cuisine`, `course`, `prepTime`, `cookTime`, `totalTime`, `servings`, `difficulty`, `calories`, `proteinGrams`, `dietaryTags[]`, `ingredients[]`, `keyIngredients[]`, `method[]`, `tips[]`, `recommendedBy`, `sourceUrl`.
- **`product_research`** — products you've saved (wishlist / owned / researching). Fields: `productName`, `brand`, `model`, `category`, `price`, `currency`, `purchaseStatus` ("wishlist" | "owned" | "researching"), `rating`, `keyPros[]`, `keyCons[]`, `verdict`, `recommendedBy`, `productUrl` (buy link), `sourceUrl`.
- **`app`** — software apps you've saved (mobile, desktop, web). Fields: `appName`, `developer`, `platforms[]` (iOS/Android/macOS/Windows/Web), `category`, `price`, `currency`, `rating`, `downloadStatus` ("wishlist" | "installed"), `keyFeatures[]`, `verdict`, `appStoreUrl`, `playStoreUrl`, `websiteUrl`, `recommendedBy`, `sourceUrl`.
- **`life_hack`** — saved tips, tricks, and how-tos (kitchen, home, money, productivity, travel, etc.). Fields: `title`, `category`, `summary`, `steps[]`, `requiredItems[]`, `difficulty`, `timeNeeded`, `savings`, `warnings[]`, `recommendedBy`, `sourceUrl`.

Identity & validity types — `id`, `drivers_license`, `visa`, `warranty`, `certification`, `membership`, `insurance`, `contract`, `rent_agreement` — share canonical `issueDate` + `expiryDate` so cards render a live validity timeline + status chip (Active / Expiring / Expired).

Travel types: `flight`, `boarding_pass`, `train_ticket`, `car_rental`, `hotel_booking`, `travel_itinerary`. Health: `medical`, `prescription`, `vaccination`. Finance: `receipt`, `invoice`, `salary_slip`, `bank_statement`, `investment`, `loan`, `subscription`, `utility_bill`, `gift_card`. Tax: `tax_id`, `tax_return`, `tax_notice`. Plus `birth_certificate`, `marriage_certificate`, `certificate`, `education`, `pet_record`, `business_card`, `event_ticket`, `vehicle`, `real_estate`, `coffee_bean`, `note`, `youtube`, `web_link`, `generic`.

## YouTube, Web Links, Reels

The vault stores saved YouTube videos and web links from the mobile app. When the content is about a **specific venue** it auto-classifies as `place`, when it's a **specific product** as `product_research`, and when it's a **recipe** as `recipe`. Otherwise it stays as `youtube` / `web_link`.

```bash
moivault doc list --type youtube       # Saved videos with full transcripts
moivault doc list --type web_link      # Saved articles/bookmarks
moivault doc list --type place         # Saved venues
moivault doc list --type recipe        # Saved dishes
moivault doc list --type product_research  # Saved products
moivault doc text <id>                 # Full transcript or page text
moivault search "that video about X"   # Search across transcripts
```

## Security

- Zero-knowledge encryption — documents are decrypted locally, never sent in plaintext
- AES-256-GCM with per-document keys, encrypted files stored in Cloudflare R2
- Each connected machine holds its own X25519 key; the phone seals only granted keys to it
- Reasons, proposed writes, granted document keys and each activity report's detail (query, path, title) are sealed end to end; the server's audit log holds only opaque ids, tool names and ok/error
- Secrets in the macOS Keychain / Linux Secret Service, else `0600` files; data in `~/.vault-cli/` (`$XDG_CONFIG_HOME/moivault` on a fresh Linux install)

## Uninstall

Revoke the machine from your phone first (Settings → AI agents), then:

```bash
moivault auth logout
rm -rf ~/.moivault ~/.local/share/moivault ~/.local/bin/moivault ~/.vault-cli ~/.config/moivault
```
