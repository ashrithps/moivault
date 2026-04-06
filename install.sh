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

# Install dependencies
echo "  ↓ Installing dependencies..."
cd "$INSTALL_DIR"
npm install --production --silent 2>/dev/null

# Create launcher script
cat > "$BIN_DIR/moivault" << 'LAUNCHER'
#!/bin/bash
exec node "$HOME/.moivault/moivault.js" "$@"
LAUNCHER
chmod +x "$BIN_DIR/moivault"

# ── Install skill for AI agent platforms ──

SKILL_INSTALLED=""

# Claude Code / Claude Desktop
if [ -d "$HOME/.claude" ]; then
  mkdir -p "$HOME/.claude/skills/moivault"
  cp "$INSTALL_DIR/skill/SKILL.md" "$HOME/.claude/skills/moivault/SKILL.md"
  SKILL_INSTALLED="$SKILL_INSTALLED claude-code"
fi

# Cursor (global rules)
if [ -d "$HOME/.cursor" ] || [ -d "$HOME/Library/Application Support/Cursor" ]; then
  mkdir -p "$HOME/.cursor/skills"
  cp "$INSTALL_DIR/skill/SKILL.md" "$HOME/.cursor/skills/moivault.md"
  SKILL_INSTALLED="$SKILL_INSTALLED cursor"
fi

# Windsurf / Codeium
if [ -d "$HOME/.codeium" ] || [ -d "$HOME/.windsurf" ]; then
  WINDSURF_DIR="${HOME}/.windsurf"
  mkdir -p "$WINDSURF_DIR/skills"
  cp "$INSTALL_DIR/skill/SKILL.md" "$WINDSURF_DIR/skills/moivault.md"
  SKILL_INSTALLED="$SKILL_INSTALLED windsurf"
fi

# Codex (OpenAI)
if command -v codex &> /dev/null; then
  CODEX_DIR="${HOME}/.codex"
  mkdir -p "$CODEX_DIR/skills"
  cp "$INSTALL_DIR/skill/SKILL.md" "$CODEX_DIR/skills/moivault.md"
  SKILL_INSTALLED="$SKILL_INSTALLED codex"
fi

# Aider
if [ -d "$HOME/.aider" ]; then
  mkdir -p "$HOME/.aider/skills"
  cp "$INSTALL_DIR/skill/SKILL.md" "$HOME/.aider/skills/moivault.md"
  SKILL_INSTALLED="$SKILL_INSTALLED aider"
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
