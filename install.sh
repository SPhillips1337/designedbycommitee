#!/usr/bin/env bash
set -euo pipefail

# ─── Colours ────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC} $*"; }
info() { echo -e "${CYAN}→${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC}  $*"; }
die()  { echo -e "${RED}✗ $*${NC}" >&2; exit 1; }
hr()   { echo -e "${DIM}────────────────────────────────────────────────────────${NC}"; }

banner() {
  echo ""
  echo -e "${BOLD}${CYAN}"
  echo "  ██████╗ ███████╗███████╗██╗ ██████╗ ███╗   ██╗███████╗██████╗ "
  echo "  ██╔══██╗██╔════╝██╔════╝██║██╔════╝ ████╗  ██║██╔════╝██╔══██╗"
  echo "  ██║  ██║█████╗  ███████╗██║██║  ███╗██╔██╗ ██║█████╗  ██║  ██║"
  echo "  ██║  ██║██╔══╝  ╚════██║██║██║   ██║██║╚██╗██║██╔══╝  ██║  ██║"
  echo "  ██████╔╝███████╗███████║██║╚██████╔╝██║ ╚████║███████╗██████╔╝"
  echo "  ╚═════╝ ╚══════╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝╚═════╝ "
  echo -e "${NC}${BOLD}              BY COMMITTEE — Installer v1.0${NC}"
  echo ""
}

# ─── Read input from terminal even when piped ───────────────────────────────
ask() {
  local prompt="$1" default="${2:-}" var
  if [ -n "$default" ]; then
    echo -ne "${BOLD}${prompt}${NC} ${DIM}[${default}]${NC} " > /dev/tty
  else
    echo -ne "${BOLD}${prompt}${NC} " > /dev/tty
  fi
  read -r var < /dev/tty
  echo "${var:-$default}"
}

ask_yn() {
  local prompt="$1" default="${2:-y}"
  local display="y/n"
  [[ "$default" == "y" ]] && display="Y/n" || display="y/N"
  local ans
  ans=$(ask "${prompt} [${display}]" "")
  ans="${ans:-$default}"
  [[ "${ans,,}" == "y" ]]
}

ask_secret() {
  local prompt="$1" var
  echo -ne "${BOLD}${prompt}${NC} " > /dev/tty
  read -rs var < /dev/tty
  echo "" > /dev/tty
  echo "$var"
}

# ─── OS check ───────────────────────────────────────────────────────────────
check_os() {
  hr
  info "Checking environment..."
  if [[ "$(uname)" != "Linux" ]]; then
    die "This installer supports Linux (Ubuntu/WSL2) only."
  fi
  if grep -qi microsoft /proc/version 2>/dev/null; then
    ok "Running inside WSL2"
  elif grep -qi ubuntu /etc/os-release 2>/dev/null; then
    ok "Running on Ubuntu"
  else
    warn "Unrecognised Linux distribution — proceeding anyway."
  fi
}

# ─── System dependencies ─────────────────────────────────────────────────────
install_system_deps() {
  hr
  info "Checking system dependencies..."

  local missing=()
  for cmd in git curl; do
    command -v "$cmd" &>/dev/null || missing+=("$cmd")
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    warn "Missing: ${missing[*]}"
    info "Installing via apt..."
    sudo apt-get update -qq
    sudo apt-get install -y -qq "${missing[@]}" build-essential
  fi

  ok "git and curl available"
}

# ─── Node.js ─────────────────────────────────────────────────────────────────
install_node() {
  hr
  info "Checking Node.js..."

  local required=18
  local nvm_dir="${NVM_DIR:-$HOME/.nvm}"

  if command -v node &>/dev/null; then
    local ver
    ver=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
    if (( ver >= required )); then
      ok "Node.js v$(node -v | tr -d v) (>= ${required} required)"
      return
    else
      warn "Node.js v$(node -v | tr -d v) is too old — need v${required}+. Installing via nvm..."
    fi
  else
    info "Node.js not found. Installing via nvm..."
  fi

  if [[ ! -f "$nvm_dir/nvm.sh" ]]; then
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  fi

  # shellcheck disable=SC1090
  source "$nvm_dir/nvm.sh"
  nvm install --lts
  nvm use --lts
  nvm alias default node

  ok "Node.js $(node -v) installed via nvm"

  # Persist nvm in shell profile if needed
  local profile="$HOME/.bashrc"
  if ! grep -q 'NVM_DIR' "$profile" 2>/dev/null; then
    {
      echo ""
      echo 'export NVM_DIR="$HOME/.nvm"'
      echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"'
    } >> "$profile"
    info "Added nvm to ${profile}"
  fi
}

# ─── Clone or detect repo ────────────────────────────────────────────────────
setup_repo() {
  hr
  info "Setting up repository..."

  REPO_DIR=""

  # Already inside the repo?
  if git rev-parse --show-toplevel &>/dev/null 2>&1; then
    local root
    root=$(git rev-parse --show-toplevel)
    if [[ -f "$root/server/index.js" && -d "$root/src" ]]; then
      REPO_DIR="$root"
      ok "Already inside the DesignedByCommittee repo at: $REPO_DIR"
      return
    fi
  fi

  local default_dir="$HOME/designedbycommitee"
  REPO_DIR=$(ask "Where should we clone the project?" "$default_dir")

  if [[ -d "$REPO_DIR/.git" ]]; then
    info "Directory exists — pulling latest changes..."
    git -C "$REPO_DIR" pull --ff-only
  else
    info "Cloning from GitHub..."
    git clone https://github.com/SPhillips1337/designedbycommitee.git "$REPO_DIR"
  fi

  ok "Repo ready at: $REPO_DIR"
}

# ─── Better-OpenCodeMCP ──────────────────────────────────────────────────────
setup_mcp_tool() {
  hr
  info "Setting up Better-OpenCodeMCP..."

  local mcp_dir="$REPO_DIR/server/tools/Better-OpenCodeMCP"

  if [[ ! -f "$mcp_dir/package.json" ]]; then
    info "Cloning Better-OpenCodeMCP..."
    mkdir -p "$REPO_DIR/server/tools"
    git clone https://github.com/ajhcs/Better-OpenCodeMCP.git "$mcp_dir"
  else
    ok "Better-OpenCodeMCP already present"
  fi

  info "Installing MCP tool dependencies..."
  npm install --prefix "$mcp_dir" --silent

  if [[ ! -f "$mcp_dir/dist/index.js" ]]; then
    info "Building MCP tool..."
    npm run build --prefix "$mcp_dir"
  fi

  ok "Better-OpenCodeMCP ready"
}

# ─── npm dependencies ────────────────────────────────────────────────────────
install_deps() {
  hr
  info "Installing project dependencies..."

  info "Frontend dependencies..."
  npm install --prefix "$REPO_DIR" --silent

  info "Backend dependencies..."
  npm install --prefix "$REPO_DIR/server" --silent

  ok "Dependencies installed"
}

# ─── Interactive .env setup ──────────────────────────────────────────────────
configure_env() {
  hr
  echo -e "${BOLD}Configuring your AI providers${NC}"
  echo ""
  echo "DesignedByCommittee supports multiple LLM providers simultaneously."
  echo "Each enabled provider becomes an AI committee member."
  echo ""

  local env_file="$REPO_DIR/.env"

  # Back up existing .env
  if [[ -f "$env_file" ]]; then
    cp "$env_file" "${env_file}.bak"
    warn "Existing .env backed up to .env.bak"
  fi

  # Collect configuration into variables
  local port active_provider=""
  local use_openai=false openai_key="" openai_model="gpt-4o"
  local use_anthropic=false anthropic_key="" anthropic_model="claude-sonnet-4-6"
  local use_gemini=false gemini_key="" gemini_model="gemini-1.5-pro"
  local use_openrouter=false openrouter_key="" openrouter_model="anthropic/claude-3.5-sonnet"
  local use_local=false local_base="http://localhost:1234/v1" local_model="local-model"
  local use_remote=false remote_base="" remote_model="llama3"
  local use_gemini_cli=false use_opencode_cli=false
  local opencode_timeout=150

  port=$(ask "Backend port:" "4002")

  hr
  echo -e "${BOLD}Select which providers to enable:${NC}"
  echo ""

  if ask_yn "OpenAI (GPT-4o etc.)?"; then
    use_openai=true
    openai_key=$(ask_secret "  OpenAI API key:")
    openai_model=$(ask "  Model:" "gpt-4o")
  fi

  if ask_yn "Anthropic Claude?"; then
    use_anthropic=true
    anthropic_key=$(ask_secret "  Anthropic API key:")
    anthropic_model=$(ask "  Model:" "claude-sonnet-4-6")
  fi

  if ask_yn "Google Gemini API?"; then
    use_gemini=true
    gemini_key=$(ask_secret "  Gemini API key:")
    gemini_model=$(ask "  Model:" "gemini-1.5-pro")
  fi

  if ask_yn "OpenRouter?"; then
    use_openrouter=true
    openrouter_key=$(ask_secret "  OpenRouter API key:")
    openrouter_model=$(ask "  Model:" "anthropic/claude-3.5-sonnet")
  fi

  if ask_yn "Local LM Studio (http://localhost:1234)?"; then
    use_local=true
    local_base=$(ask "  LM Studio API base:" "http://localhost:1234/v1")
    local_model=$(ask "  Model name:" "local-model")
  fi

  if ask_yn "Remote Ollama (Cloudflare tunnel etc.)?"; then
    use_remote=true
    remote_base=$(ask "  Remote API base URL:" "")
    remote_model=$(ask "  Model name:" "llama3")
  fi

  hr
  echo -e "${BOLD}CLI tools (optional):${NC}"
  echo ""

  if command -v gemini &>/dev/null; then
    if ask_yn "Enable Gemini CLI? (detected at $(command -v gemini))"; then
      use_gemini_cli=true
    fi
  else
    info "Gemini CLI not detected — skipping"
  fi

  if command -v opencode &>/dev/null; then
    if ask_yn "Enable OpenCode CLI? (detected at $(command -v opencode)) — required for todo execution"; then
      use_opencode_cli=true
      opencode_timeout=$(ask "  OpenCode task timeout (seconds):" "300")
      # Convert to attempts (polling every 2s)
      opencode_timeout=$(( opencode_timeout / 2 ))
    fi
  else
    warn "OpenCode CLI not found — todo execution will be disabled."
    echo    "  Install it from: https://opencode.ai"
    if ask_yn "  I'll install it later — enable the setting now?"; then
      use_opencode_cli=true
      opencode_timeout=$(ask "  OpenCode task timeout (seconds):" "300")
      opencode_timeout=$(( opencode_timeout / 2 ))
    fi
  fi

  # ─── Choose primary provider ─────────────────────────────────────────────
  hr
  echo -e "${BOLD}Select the primary provider (used for synthesis & debate):${NC}"
  echo ""
  local providers=()
  $use_openai      && providers+=("openai")
  $use_anthropic   && providers+=("anthropic")
  $use_gemini      && providers+=("gemini")
  $use_openrouter  && providers+=("openrouter")
  $use_local       && providers+=("local")
  $use_remote      && providers+=("remote")
  $use_gemini_cli  && providers+=("gemini-cli")
  $use_opencode_cli && providers+=("opencode-cli")

  if [[ ${#providers[@]} -eq 0 ]]; then
    warn "No providers configured. Defaulting to local (LM Studio)."
    active_provider="local"
  elif [[ ${#providers[@]} -eq 1 ]]; then
    active_provider="${providers[0]}"
    ok "Only one provider configured — using: $active_provider"
  else
    echo "Available: ${providers[*]}"
    active_provider=$(ask "Primary provider:" "${providers[0]}")
  fi

  # ─── Write .env ──────────────────────────────────────────────────────────
  cat > "$env_file" <<EOF
# DesignedByCommittee — generated by install.sh
# Frontend
VITE_API_BASE_URL=http://localhost:${port}
VITE_WS_BASE_URL=ws://localhost:${port}

# Backend
PORT=${port}

# Primary LLM provider for synthesis/debate
# Options: local, remote, openai, gemini, openrouter, anthropic, gemini-cli, opencode-cli
ACTIVE_LLM_PROVIDER=${active_provider}

EOF

  if $use_openai; then cat >> "$env_file" <<EOF
OPENAI_API_KEY=${openai_key}
OPENAI_MODEL=${openai_model}

EOF
  fi

  if $use_anthropic; then cat >> "$env_file" <<EOF
ANTHROPIC_API_KEY=${anthropic_key}
ANTHROPIC_MODEL=${anthropic_model}

EOF
  fi

  if $use_gemini; then cat >> "$env_file" <<EOF
GEMINI_API_KEY=${gemini_key}
GEMINI_MODEL=${gemini_model}

EOF
  fi

  if $use_openrouter; then cat >> "$env_file" <<EOF
OPENROUTER_API_KEY=${openrouter_key}
OPENROUTER_MODEL=${openrouter_model}

EOF
  fi

  if $use_local; then cat >> "$env_file" <<EOF
LOCAL_LLM_API_BASE=${local_base}
LOCAL_LLM_MODEL=${local_model}
LOCAL_OPENAI_API_KEY=lm-studio

EOF
  fi

  if $use_remote; then cat >> "$env_file" <<EOF
REMOTE_LLM_API_BASE=${remote_base}
REMOTE_LLM_MODEL=${remote_model}
REMOTE_OPENAI_API_KEY=ollama

EOF
  fi

  cat >> "$env_file" <<EOF
# CLI integrations
USE_GEMINI_CLI=${use_gemini_cli}
USE_OPENCODE_CLI=${use_opencode_cli}
OPENCODE_TIMEOUT_ATTEMPTS=${opencode_timeout}
EOF

  chmod 600 "$env_file"
  ok ".env written to $env_file"
}

# ─── Write a convenience launcher ────────────────────────────────────────────
write_launcher() {
  hr
  info "Creating start script..."

  cat > "$REPO_DIR/start.sh" <<'LAUNCHER'
#!/usr/bin/env bash
set -euo pipefail
REPO="$(cd "$(dirname "$0")" && pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'

cleanup() {
  echo -e "\n${CYAN}Stopping servers...${NC}"
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo -e "${CYAN}Starting backend...${NC}"
node "$REPO/server/index.js" &
BACKEND_PID=$!

sleep 1

echo -e "${CYAN}Starting frontend...${NC}"
npm run dev --prefix "$REPO" &
FRONTEND_PID=$!

echo -e "${GREEN}✓ Both servers running. Press Ctrl+C to stop.${NC}"
wait
LAUNCHER

  chmod +x "$REPO_DIR/start.sh"
  ok "Launcher written: $REPO_DIR/start.sh"
}

# ─── Done ─────────────────────────────────────────────────────────────────────
print_done() {
  hr
  echo ""
  echo -e "${BOLD}${GREEN}Installation complete!${NC}"
  echo ""
  echo -e "  ${BOLD}Start both servers:${NC}"
  echo -e "  ${CYAN}$REPO_DIR/start.sh${NC}"
  echo ""
  echo -e "  ${BOLD}Or manually:${NC}"
  echo -e "  ${CYAN}# Terminal 1 — backend"
  echo -e "  cd $REPO_DIR && node server/index.js"
  echo ""
  echo -e "  # Terminal 2 — frontend"
  echo -e "  cd $REPO_DIR && npm run dev${NC}"
  echo ""
  if ! command -v opencode &>/dev/null; then
    echo -e "  ${YELLOW}Reminder:${NC} Install OpenCode CLI for todo execution:"
    echo -e "  ${DIM}https://opencode.ai${NC}"
    echo ""
  fi
  hr
  echo ""
}

# ─── Main ─────────────────────────────────────────────────────────────────────
main() {
  banner
  check_os
  install_system_deps
  install_node
  setup_repo
  setup_mcp_tool
  install_deps
  configure_env
  write_launcher
  print_done
}

main "$@"
