# moivault

CLI for [Vault](https://vault.moi.app) — encrypted document management for agents and humans.

Search, retrieve, and correlate documents from your encrypted vault. Designed for AI agents (Claude Code, Cursor, etc.) with JSON output by default.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/ashrithps/moivault/main/install.sh | bash
```

Requires Node.js 20+. Installs to `~/.moivault/` with a launcher at `~/.local/bin/moivault`.

Also auto-installs the Claude Code skill for agent integration.

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
moivault doc upload <file>           # Upload PDF/image to vault
moivault doc download <id>           # Download original file
moivault doc edit <id> <field> <val> # Edit title, tags, type, owner, or custom field
moivault doc delete <id>             # Delete document (local + server)
moivault doc types                   # List doc types with counts

moivault people list                 # All people with doc counts
moivault people docs <name>          # Documents for a person
moivault people aliases              # Show people registry with aliases
moivault people merge <alias> <name> # Merge a name as alias of another
moivault people rename <from> <to>   # Bulk rename owner on docs

moivault context <query>             # RAG retrieval — structured context for any agent
moivault context <query> --limit 5 --include-fields
moivault chunk build                 # Build chunk index (splits docs + embeds)
moivault chunk status                # Show chunk index status

moivault usage                       # API usage and plan details
moivault stats                       # Vault statistics
moivault auth status                 # Check auth state
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
- **Trae / Kilo / Augment / Aider / VSCode** — auto-detected
- **Any other agent** — `~/.config/moivault/SKILL.md`

Features:
- JSON output by default (non-TTY). Pretty output in interactive terminals.
- Auto-unlock with saved password — no interactive prompts needed.
- Hybrid search combines keyword matching (FTS) with semantic vector search (Gemini embeddings).

## Search Modes

| Mode | Flag | Speed | Best for |
|------|------|-------|----------|
| Hybrid | `--mode hybrid` (default) | ~2s | Best overall — combines FTS + vector |
| FTS | `--mode fts` | ~5ms | Exact keywords, names, numbers |
| Vector | `--mode vector` | ~1.5s | Semantic queries, concepts, synonyms |

## Security

- Zero-knowledge encryption — documents are decrypted locally, never sent in plaintext
- AES-256-GCM with per-document keys
- Master password derived via PBKDF2 (600K iterations)
- Credentials stored in `~/.vault-cli/` with 0600 permissions

## Uninstall

```bash
rm -rf ~/.moivault ~/.local/bin/moivault ~/.vault-cli
```
