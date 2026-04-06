#!/bin/bash
# moivault installer — one-line install for macOS
# Usage: curl -fsSL https://raw.githubusercontent.com/ashrithps/moivault/main/install.sh | bash

set -e

REPO="ashrithps/moivault"
INSTALL_DIR="$HOME/.moivault"
BIN_DIR="$HOME/.local/bin"

echo ""
echo "  Installing moivault..."
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
mkdir -p "$INSTALL_DIR" "$BIN_DIR"

# Download latest from GitHub
echo "  ↓ Downloading moivault..."
curl -fsSL "https://raw.githubusercontent.com/$REPO/main/bin/moivault.js" -o "$INSTALL_DIR/moivault.js"
curl -fsSL "https://raw.githubusercontent.com/$REPO/main/package.json" -o "$INSTALL_DIR/package.json"
mkdir -p "$INSTALL_DIR/skill"
curl -fsSL "https://raw.githubusercontent.com/$REPO/main/skill/SKILL.md" -o "$INSTALL_DIR/skill/SKILL.md"

# Install dependencies (better-sqlite3 requires C++ compiler)
echo "  ↓ Installing dependencies..."
cd "$INSTALL_DIR"
if ! npm install --production 2>&1 | tail -1; then
  echo "  ✗ Dependency install failed. Ensure Xcode CLI tools are installed:"
  echo "    xcode-select --install"
  exit 1
fi

# Create launcher script with absolute node path (fixes Claude Desktop / MCP PATH issues)
NODE_PATH=$(which node)
cat > "$BIN_DIR/moivault" << LAUNCHER
#!/bin/bash
exec "$NODE_PATH" "\$HOME/.moivault/moivault.js" "\$@"
LAUNCHER
chmod +x "$BIN_DIR/moivault"

# ── Install skill for AI agent platforms ──

SKILL_INSTALLED=""
SKILL_FILE="$INSTALL_DIR/skill/SKILL.md"
CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"

# Helper: install skill to a directory
install_skill() {
  local dir="$1" name="$2"
  mkdir -p "$dir/moivault"
  cp "$SKILL_FILE" "$dir/moivault/SKILL.md"
  SKILL_INSTALLED="$SKILL_INSTALLED $name"
}

# ── Agent detection & skill install ──
# Paths sourced from skills.sh (vercel-labs/skills/src/agents.ts)

# Claude Code / Claude Desktop
[ -d "$HOME/.claude" ] && install_skill "$HOME/.claude/skills" "claude-code"

# Codex (OpenAI)
if [ -d "$HOME/.codex" ] || command -v codex &> /dev/null; then
  install_skill "$HOME/.codex/skills" "codex"
  # Also add to AGENTS.md
  CODEX_AGENTS="$HOME/.codex/AGENTS.md"
  if ! grep -q "moivault" "$CODEX_AGENTS" 2>/dev/null; then
    cat >> "$CODEX_AGENTS" << 'EOF'

## moivault
Encrypted document vault CLI. See `~/.codex/skills/moivault/SKILL.md` for full reference.
EOF
  fi
fi

# Cursor
[ -d "$HOME/.cursor" ] && install_skill "$HOME/.cursor/skills" "cursor"

# Windsurf / Codeium
[ -d "$HOME/.windsurf" ] || [ -d "$HOME/.codeium" ] && install_skill "$HOME/.windsurf/skills" "windsurf"

# Cline / Roo Code (shared .agents/skills)
[ -d "$HOME/.cline" ] || [ -d "$HOME/.roo" ] && install_skill "$HOME/.agents/skills" "cline"

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

# VSCode (GitHub Copilot Chat instructions)
VSCODE_DIR="$HOME/.vscode"
[ -d "$HOME/Library/Application Support/Code" ] && VSCODE_DIR="$HOME/Library/Application Support/Code/User"
[ -d "$VSCODE_DIR" ] && install_skill "$VSCODE_DIR/skills" "vscode"
fi

# ── Claude Desktop (MCP server auto-config) ──
CLAUDE_DESKTOP_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
if [ -d "$HOME/Library/Application Support/Claude" ]; then
  # Ensure config file exists
  if [ ! -f "$CLAUDE_DESKTOP_CONFIG" ]; then
    echo '{}' > "$CLAUDE_DESKTOP_CONFIG"
  fi
  # Add moivault MCP server if not already present
  if ! grep -q "moivault" "$CLAUDE_DESKTOP_CONFIG" 2>/dev/null; then
    python3 -c "
import json, sys
config_path = sys.argv[1]
with open(config_path, 'r') as f:
    config = json.load(f)
if 'mcpServers' not in config:
    config['mcpServers'] = {}
config['mcpServers']['moivault'] = {
    'command': '$NODE_PATH',
    'args': ['$INSTALL_DIR/moivault.js', 'mcp']
}
with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)
" "$CLAUDE_DESKTOP_CONFIG" 2>/dev/null && SKILL_INSTALLED="$SKILL_INSTALLED claude-desktop(mcp)"
  else
    SKILL_INSTALLED="$SKILL_INSTALLED claude-desktop(mcp)"
  fi
fi

# Generic: copy to .config/moivault for any agent to discover
mkdir -p "$HOME/.config/moivault"
cp "$INSTALL_DIR/skill/SKILL.md" "$HOME/.config/moivault/SKILL.md"

if [ -n "$SKILL_INSTALLED" ]; then
  echo "  ✓ Agent skills installed:$SKILL_INSTALLED"
else
  echo "  ✓ Skill file at: ~/.config/moivault/SKILL.md"
fi

# Check PATH
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
  echo ""
  echo "  Add to your shell profile (~/.zshrc or ~/.bashrc):"
  echo ""
  echo "    export PATH=\"\$HOME/.local/bin:\$PATH\""
  echo ""
fi

echo ""
echo "  ✓ moivault installed!"
echo ""
echo "  Get started:"
echo "    1. Open Vault app → Settings → Developer → Link CLI"
echo "    2. Copy the command and run it"
echo "    3. moivault auth save-password 'your-password'"
echo "    4. moivault sync"
echo "    5. moivault search 'passport'"
echo ""
