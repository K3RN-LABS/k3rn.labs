# Snapshot file
# Unset all aliases to avoid conflicts with functions
unalias -a 2>/dev/null || true
# Functions
# Shell Options
setopt nohashdirs
setopt login
# Aliases
alias -- run-help=man
alias -- which-command=whence
# Check for rg availability
if ! (unalias rg 2>/dev/null; command -v rg) >/dev/null 2>&1; then
  alias rg='/Users/user/.vscode/extensions/anthropic.claude-code-2.1.44-darwin-x64/resources/native-binary/claude --ripgrep'
fi
export PATH=/usr/local/opt/python\@3.14/Frameworks/Python.framework/Versions/3.14/bin\:/Users/user/.antigravity/antigravity/bin\:/Users/user/.local/bin\:/Users/user/.local/bin\:/Users/user/.volta/bin\:/Users/user/.local/bin\:/usr/local/bin\:/System/Cryptexes/App/usr/bin\:/usr/bin\:/bin\:/usr/sbin\:/sbin\:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin\:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin\:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin\:/Library/Apple/usr/bin\:/Users/user/Library/Android/sdk/emulator\:/Users/user/Library/Android/sdk/platform-tools
