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
moivault sync                    # Sync from server
moivault search <query>          # Hybrid FTS + vector search
moivault doc list                # List all documents
moivault doc list --type medical # Filter by type
moivault doc get <id>            # Full metadata
moivault doc text <id>           # Raw OCR text
moivault doc fields <id>         # Structured fields
moivault doc download <id>       # Download original file
moivault doc types               # List doc types with counts
moivault stats                   # Vault statistics
moivault auth status             # Check auth state
```

## For AI Agents

- JSON output by default (non-TTY). Pretty output in interactive terminals.
- Skill file auto-installed to `~/.claude/skills/moivault/` for Claude Code.
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
