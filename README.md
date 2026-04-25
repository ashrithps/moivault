# moivault

CLI for [Vault](https://vault.moi) — encrypted document management for agents and humans.

Search, retrieve, and correlate documents from your encrypted vault. Designed for AI agents (Claude Code, Cursor, etc.) with JSON output by default.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/ashrithps/moivault/main/install.sh | bash
```

### One-click install with auth (fully automated)

Get the auth payload from the Vault app (Settings → Developer → Link CLI), then:

```bash
curl -fsSL https://raw.githubusercontent.com/ashrithps/moivault/main/install.sh | bash -s -- \
  --payload '<json from app>' \
  --password 'your-master-password'
```

This installs, authenticates, saves password, and syncs — ready to use immediately.

Requires Node.js 20+. Installs to `~/.moivault/` with a launcher at `~/.local/bin/moivault`.

Auto-installs agent skills (Claude Code, Codex, Cursor, etc.) and Claude Desktop MCP server.

## Quick Start

1. **Login** — Open the Vault mobile app → Settings → Developer → Link CLI. Copy the command and run it:
   ```bash
   moivault auth login --payload '<json from app>'
   ```

2. **Save password** for auto-unlock:
   ```bash
   moivault auth save-password 'your-master-password'
   ```

3. **Sync** documents from server:
   ```bash
   moivault sync
   ```

4. **Search** your vault:
   ```bash
   moivault search "passport"
   moivault search "medical report" --mode vector   # semantic search
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

moivault usage                       # API usage and plan details
moivault stats                       # Vault statistics
moivault auth status                 # Check auth state
moivault mcp                         # Start MCP server (stdio) for Claude Desktop/Cursor
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

The installer auto-configures Claude Desktop with the moivault MCP server. After install, restart Claude Desktop and **21 vault tools** are available natively:

`vault_search` · `vault_context` · `vault_doc_get` · `vault_doc_text` · `vault_doc_fields` · `vault_doc_list` · `vault_doc_types` · `vault_doc_edit` · `vault_doc_delete` · `vault_doc_download` · `vault_doc_upload` · `vault_sync` · `vault_stats` · `vault_people_list` · `vault_people_docs` · `vault_chunk_status` · `vault_places` · `vault_wishlist` · `vault_recipes` · `vault_apps` · `vault_hacks`

Features:
- JSON output by default (non-TTY). Pretty output with colors in interactive terminals.
- Auto-unlock with saved password — no interactive prompts needed.
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
- Master password derived via PBKDF2 (600K iterations)
- Credentials stored in `~/.vault-cli/` with 0600 permissions

## Uninstall

```bash
rm -rf ~/.moivault ~/.local/bin/moivault ~/.vault-cli
```
