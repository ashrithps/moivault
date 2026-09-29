#!/bin/bash
# moivault installer — one-line install for macOS and Linux
#
# Basic install:
#   curl -fsSL https://raw.githubusercontent.com/ashrithps/moivault/master/install.sh | bash
#
# Install + connect to your phone (what the app hands you):
#   curl -fsSL https://raw.githubusercontent.com/ashrithps/moivault/master/install.sh | bash -s -- --pair <code>
#
# For one agent only (the app adds this when you pick one under "Who is this for?"):
#   … | bash -s -- --pair <code> --agent cursor
# Only that agent gets a skill or MCP entry. For chatgpt / claude-web nothing is
# installed for the agent, and the installer prints the `moivault serve` steps.
#
# The pairing code is single-use and expires in 10 minutes. This machine makes
# its own key; the terminal prints a fingerprint, and you approve on your phone
# after checking it matches. Nothing that unlocks your whole vault is ever
# part of the command.
#
# Older app builds hand out `--payload '<json>'` instead. That still works, but
# a machine linked that way cannot be revoked on its own — reconnect with
# --pair when you can.

set -e

REPO="ashrithps/moivault"
# Branch to pull artifacts from (the repo's default branch is `master`).
BRANCH="${MOIVAULT_BRANCH:-master}"
# Testing hook: install from a local checkout instead of GitHub.
LOCAL_SOURCE="${MOIVAULT_LOCAL_SOURCE:-}"
PAIR_TOKEN=""
AUTH_PAYLOAD=""
MASTER_PASSWORD=""
AGENT=""

# Parse flags
while [[ $# -gt 0 ]]; do
  case $1 in
    --pair) PAIR_TOKEN="$2"; shift 2 ;;
    --payload) AUTH_PAYLOAD="$2"; shift 2 ;;
    --password) MASTER_PASSWORD="$2"; shift 2 ;;
    --agent) AGENT="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# Agent keys are the contract's client keys (vault repo,
# docs/superpowers/specs/2026-09-28-agent-connections.md). "any" is the default.
# Checked before anything is downloaded, and again by `moivault auth pair`.
AGENT="$(printf '%s' "$AGENT" | tr '[:upper:]' '[:lower:]')"
[ "$AGENT" = "any" ] && AGENT=""
case "$AGENT" in
  ""|claude-desktop|claude-code|claude-web|chatgpt|codex|cursor|copilot|gemini|windsurf|terminal) ;;
  *)
    echo "  ✗ Unknown agent \"$AGENT\"."
    echo "    Use one of: claude-desktop, claude-code, claude-web, chatgpt, codex, cursor, copilot, gemini, windsurf, terminal, any"
    exit 1
    ;;
esac

# ── Platform ──

OS_NAME="$(uname -s)"
case "$OS_NAME" in
  Darwin) PLATFORM="macos" ;;
  Linux) PLATFORM="linux" ;;
  *)
    echo "  ✗ moivault supports macOS and Linux (found $OS_NAME)."
    exit 1
    ;;
esac

CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
if [ "$PLATFORM" = "linux" ]; then
  DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
  INSTALL_DIR="$DATA_HOME/moivault"
else
  INSTALL_DIR="$HOME/.moivault"
fi
BIN_DIR="$HOME/.local/bin"

echo ""
echo "  Installing moivault ($PLATFORM)..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "  ✗ Node.js is required (v20+). Install from https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "  ✗ Node.js v20+ required (found v$NODE_VERSION). Update from https://nodejs.org"
  exit 1
fi

echo "  ✓ Node.js $(node -v)"

# Create install directory
mkdir -p "$INSTALL_DIR" "$BIN_DIR" "$INSTALL_DIR/skill"

# Fetch the bundle
fetch() {
  local rel="$1" dest="$2"
  if [ -n "$LOCAL_SOURCE" ]; then
    cp "$LOCAL_SOURCE/$rel" "$dest"
  else
    curl -fsSL "https://raw.githubusercontent.com/$REPO/$BRANCH/$rel" -o "$dest"
  fi
}

echo "  ↓ Downloading moivault..."
fetch "bin/moivault.js" "$INSTALL_DIR/moivault.js"
fetch "package.json" "$INSTALL_DIR/package.json"
fetch "skill/SKILL.md" "$INSTALL_DIR/skill/SKILL.md"

# Install dependencies. better-sqlite3 ships prebuilt binaries for macOS and
# Linux (glibc, x64/arm64); a compiler is only needed when no prebuild fits.
echo "  ↓ Installing dependencies..."
if ! (cd "$INSTALL_DIR" && npm install --omit=dev --no-audit --no-fund > "$INSTALL_DIR/npm-install.log" 2>&1); then
  echo "  ✗ Dependency install failed (log: $INSTALL_DIR/npm-install.log)."
  if [ "$PLATFORM" = "macos" ]; then
    echo "    Ensure Xcode CLI tools are installed: xcode-select --install"
  else
    echo "    If no prebuilt better-sqlite3 fits this system, install a compiler:"
    echo "    Debian/Ubuntu: sudo apt install build-essential python3   Fedora: sudo dnf install gcc-c++ make python3"
  fi
  exit 1
fi

# Create launcher script with absolute node path (fixes Claude Desktop / MCP PATH issues)
NODE_PATH=$(command -v node)
cat > "$BIN_DIR/moivault" << LAUNCHER
#!/bin/bash
exec "$NODE_PATH" "$INSTALL_DIR/moivault.js" "\$@"
LAUNCHER
chmod +x "$BIN_DIR/moivault"
echo "  ✓ Installed to $INSTALL_DIR"

# ── Install skill for AI agent platforms ──

SKILL_INSTALLED=""
SKILL_FILE="$INSTALL_DIR/skill/SKILL.md"
HAS_PYTHON=""
command -v python3 &> /dev/null && HAS_PYTHON="1"

# Helper: install skill to a directory
install_skill() {
  local dir="$1" name="$2"
  mkdir -p "$dir/moivault"
  cp "$SKILL_FILE" "$dir/moivault/SKILL.md"
  SKILL_INSTALLED="$SKILL_INSTALLED $name"
}

# ── Per-agent installers ──
# Paths sourced from skills.sh (vercel-labs/skills/src/agents.ts)

# Claude Code (same path on macOS and Linux)
install_claude_code() {
  install_skill "$HOME/.claude/skills" "claude-code"
  # Auto-allow moivault bash commands (no permission prompts)
  CLAUDE_SETTINGS="$HOME/.claude/settings.json"
  if [ -f "$CLAUDE_SETTINGS" ] && [ -n "$HAS_PYTHON" ]; then
    if ! grep -q '"Bash(moivault' "$CLAUDE_SETTINGS" 2>/dev/null; then
      python3 -c "
import json, sys
with open(sys.argv[1], 'r') as f:
    config = json.load(f)
perms = config.setdefault('permissions', {})
allow = perms.setdefault('allow', [])
for rule in ['Bash(moivault *)', 'Bash(moivault)']:
    if rule not in allow:
        allow.append(rule)
with open(sys.argv[1], 'w') as f:
    json.dump(config, f, indent=2)
" "$CLAUDE_SETTINGS" 2>/dev/null || true
    fi
  fi
}

# Codex (OpenAI)
install_codex() {
  install_skill "$HOME/.codex/skills" "codex"
  # Also add to AGENTS.md
  CODEX_AGENTS="$HOME/.codex/AGENTS.md"
  if ! grep -q "moivault" "$CODEX_AGENTS" 2>/dev/null; then
    cat >> "$CODEX_AGENTS" << 'EOF'

## moivault
Encrypted document vault CLI. See `~/.codex/skills/moivault/SKILL.md` for full reference.
EOF
  fi
}

# VSCode (GitHub Copilot Chat instructions)
vscode_dir() {
  local dir=""
  if [ "$PLATFORM" = "macos" ]; then
    [ -d "$HOME/.vscode" ] && dir="$HOME/.vscode"
    [ -d "$HOME/Library/Application Support/Code" ] && dir="$HOME/Library/Application Support/Code/User"
  else
    [ -d "$HOME/.vscode" ] && dir="$HOME/.vscode"
    [ -d "$CONFIG_HOME/Code" ] && dir="$CONFIG_HOME/Code/User"
  fi
  echo "$dir"
}

# Claude Desktop (MCP server auto-config) — macOS only; there is no Linux build.
# Returns 1 when there is no Claude Desktop here to configure.
install_claude_desktop() {
  if [ "$PLATFORM" != "macos" ] || [ ! -d "$HOME/Library/Application Support/Claude" ] || [ -z "$HAS_PYTHON" ]; then
    return 1
  fi
  CLAUDE_DESKTOP_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
  # Ensure config file exists
  if [ ! -f "$CLAUDE_DESKTOP_CONFIG" ]; then
    echo '{}' > "$CLAUDE_DESKTOP_CONFIG"
  fi
  # Add moivault MCP server if not already present
  if ! grep -q "moivault" "$CLAUDE_DESKTOP_CONFIG" 2>/dev/null; then
    python3 -c "
import json, sys
config_path, node_path, script = sys.argv[1], sys.argv[2], sys.argv[3]
with open(config_path, 'r') as f:
    config = json.load(f)
config.setdefault('mcpServers', {})['moivault'] = {'command': node_path, 'args': [script, 'mcp']}
with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)
" "$CLAUDE_DESKTOP_CONFIG" "$NODE_PATH" "$INSTALL_DIR/moivault.js" 2>/dev/null && SKILL_INSTALLED="$SKILL_INSTALLED claude-desktop(mcp)"
  else
    SKILL_INSTALLED="$SKILL_INSTALLED claude-desktop(mcp)"
  fi
}

# ChatGPT and Claude.ai reach the machine through `moivault serve`.
print_serve_steps() {
  echo "  $1 reaches this machine through a connector URL, not a local skill:"
  echo "    1. Run: moivault serve"
  echo "    2. Copy the https://… URL it prints"
  echo "    3. Add it in $1 as a custom connector (Settings → Connectors)"
  echo "  Keep moivault serve running while you use it; --rotate issues a new URL."
  echo ""
}

if [ -n "$AGENT" ]; then
  # Tagged install: this machine is paired for one agent, so only that agent
  # gets a skill or MCP entry. (Any agent here could still run moivault — they
  # share this machine's keys — and the phone says so.)
  case "$AGENT" in
    claude-code) install_claude_code ;;
    claude-desktop)
      install_claude_desktop || echo "  ℹ Claude Desktop not found (it is macOS only). Open it once, then run this installer again."
      ;;
    codex) install_codex ;;
    cursor) install_skill "$HOME/.cursor/skills" "cursor" ;;
    windsurf) install_skill "$HOME/.windsurf/skills" "windsurf" ;;
    gemini) install_skill "$HOME/.gemini/antigravity/skills" "gemini" ;;
    copilot)
      install_skill "$HOME/.github-copilot/skills" "copilot"
      VSCODE_DIR="$(vscode_dir)"
      if [ -n "$VSCODE_DIR" ]; then install_skill "$VSCODE_DIR/skills" "vscode"; fi
      ;;
    # chatgpt / claude-web: connector steps are printed at the end.
    # terminal: nothing to set up beyond the command itself.
    *) ;;
  esac
else
  # ── Agent detection & skill install ──
  if [ -d "$HOME/.claude" ]; then install_claude_code; fi
  if [ -d "$HOME/.codex" ] || command -v codex &> /dev/null; then install_codex; fi

  # Cursor
  [ -d "$HOME/.cursor" ] && install_skill "$HOME/.cursor/skills" "cursor"

  # Windsurf / Codeium
  { [ -d "$HOME/.windsurf" ] || [ -d "$HOME/.codeium" ]; } && install_skill "$HOME/.windsurf/skills" "windsurf"

  # Cline / Roo Code (shared .agents/skills)
  { [ -d "$HOME/.cline" ] || [ -d "$HOME/.roo" ]; } && install_skill "$HOME/.agents/skills" "cline"

  # Amp
  [ -d "$CONFIG_HOME/amp" ] && install_skill "$CONFIG_HOME/agents/skills" "amp"

  # Gemini CLI / Antigravity
  [ -d "$HOME/.gemini" ] && install_skill "$HOME/.gemini/antigravity/skills" "gemini"

  # GitHub Copilot
  [ -d "$HOME/.github-copilot" ] && install_skill "$HOME/.github-copilot/skills" "copilot"

  # Goose (Block)
  [ -d "$CONFIG_HOME/goose" ] && install_skill "$CONFIG_HOME/goose/skills" "goose"

  # OpenCode
  [ -d "$CONFIG_HOME/opencode" ] && install_skill "$CONFIG_HOME/opencode/skills" "opencode"

  # Trae
  [ -d "$HOME/.trae" ] && install_skill "$HOME/.trae/skills" "trae"

  # Kilo
  [ -d "$HOME/.kilo" ] && install_skill "$HOME/.kilo/skills" "kilo"

  # Augment
  [ -d "$HOME/.augment" ] && install_skill "$HOME/.augment/skills" "augment"

  # Aider
  [ -d "$HOME/.aider" ] && install_skill "$HOME/.aider/skills" "aider"

  VSCODE_DIR="$(vscode_dir)"
  [ -n "$VSCODE_DIR" ] && install_skill "$VSCODE_DIR/skills" "vscode"

  install_claude_desktop || true
fi

# Generic: copy to the XDG config dir for any agent to discover. On Linux this is
# also the CLI's own data directory (it holds the decrypted library), so it is
# kept private to this user.
mkdir -p "$CONFIG_HOME/moivault"
chmod 700 "$CONFIG_HOME/moivault"
cp "$SKILL_FILE" "$CONFIG_HOME/moivault/SKILL.md"

if [ -n "$SKILL_INSTALLED" ]; then
  echo "  ✓ Agent skills installed:$SKILL_INSTALLED"
else
  echo "  ✓ Skill file at: $CONFIG_HOME/moivault/SKILL.md"
fi

if [ "$PLATFORM" = "linux" ] && ! command -v secret-tool &> /dev/null; then
  echo "  ℹ Secrets will be kept in a 0600 file. Install secret-tool (libsecret-tools) to use your keyring instead."
fi

# Check PATH
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
  echo ""
  echo "  Add to your shell profile (~/.zshrc or ~/.bashrc):"
  echo ""
  echo "    export PATH=\"\$HOME/.local/bin:\$PATH\""
  echo ""
fi

CONNECTED=""

# ── Connect (current): pair with the phone ──
# Output is not hidden: the fingerprint has to reach the person approving.
if [ -n "$PAIR_TOKEN" ]; then
  echo "  → Connecting to your phone..."
  AGENT_ARGS=()
  [ -n "$AGENT" ] && AGENT_ARGS=(--agent "$AGENT")
  if "$BIN_DIR/moivault" auth pair "$PAIR_TOKEN" ${AGENT_ARGS[@]+"${AGENT_ARGS[@]}"}; then
    CONNECTED="1"
  else
    echo "  ✗ Not connected. Make a new code in the app and run: moivault auth pair <code>"
  fi
fi

# ── Connect (legacy payload from older app builds) ──
if [ -n "$AUTH_PAYLOAD" ] && [ -z "$CONNECTED" ]; then
  echo "  → Authenticating (older method — not revocable on its own)..."
  if "$BIN_DIR/moivault" auth login --payload "$AUTH_PAYLOAD" > /dev/null 2>&1; then
    echo "  ✓ Authenticated"
    CONNECTED="1"
  else
    echo "  ✗ Authentication failed — update the app and use the new connect command."
  fi
  if [ -n "$MASTER_PASSWORD" ]; then
    "$BIN_DIR/moivault" auth save-password "$MASTER_PASSWORD" > /dev/null 2>&1 && echo "  ✓ Password saved (auto-unlock enabled)"
  fi
fi

if [ -n "$CONNECTED" ]; then
  echo "  → Syncing vault..."
  if "$BIN_DIR/moivault" sync > /dev/null 2>&1; then
    echo "  ✓ Vault synced"
  else
    echo "  ✗ Sync failed — run: moivault sync"
  fi
fi

echo ""
echo "  ✓ moivault installed!"
echo ""
case "$AGENT" in
  chatgpt) print_serve_steps "ChatGPT" ;;
  claude-web) print_serve_steps "Claude.ai" ;;
esac
if [ -n "$CONNECTED" ]; then
  echo "  Ready to use:"
  echo "    moivault search 'passport'"
  echo "    moivault ls"
  echo "    moivault serve      # for Claude.ai / ChatGPT"
else
  echo "  Get started:"
  echo "    1. Open moi vault → Settings → AI agents → Connect an agent"
  echo "    2. Copy the command and paste it here"
  echo "    3. Keep the app open: a copied command connects by itself"
fi
echo ""
