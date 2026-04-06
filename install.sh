#!/bin/bash
# moivault installer — one-line install for macOS
# Usage: curl -fsSL https://raw.githubusercontent.com/AshGovind/moivault/main/install.sh | bash

set -e

REPO="AshGovind/moivault"
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

# Install dependencies (better-sqlite3, convex, commander)
echo "  ↓ Installing dependencies..."
cd "$INSTALL_DIR"
npm install --production --silent 2>/dev/null

# Create launcher script
cat > "$BIN_DIR/moivault" << 'LAUNCHER'
#!/bin/bash
exec node "$HOME/.moivault/moivault.js" "$@"
LAUNCHER
chmod +x "$BIN_DIR/moivault"

# Install skill for Claude Code
SKILL_DIR="$HOME/.claude/skills/moivault"
if [ -d "$HOME/.claude" ]; then
  mkdir -p "$SKILL_DIR"
  cp "$INSTALL_DIR/skill/SKILL.md" "$SKILL_DIR/SKILL.md"
  echo "  ✓ Claude Code skill installed"
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
