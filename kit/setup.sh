#!/usr/bin/env bash
# One-time setup for the animation skills: checks ffmpeg and Node, installs three.js + Playwright into kit/node_modules,
# fetches GSAP and warms up HyperFrames. Safe to run again.
#   bash kit/setup.sh            # enough for every quick skill and the two engines' pictures
#   bash kit/setup.sh --voice    # also makes kit/.venv with the free voice (Kokoro) and word timings (Parakeet), ~1 GB of models
# Set ANIM_IPV4=1 to force IPv4 downloads (it is switched on by itself when IPv6 turns out to stall).
set -euo pipefail
KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
say() { printf '\033[1m%s\033[0m\n' "$*"; }
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

command -v ffmpeg >/dev/null || { echo "ffmpeg is missing. Mac: brew install ffmpeg"; exit 1; }
# the first start of a fresh ffmpeg can take seconds (macOS scans it), longer than HyperFrames waits; start it once now
ffmpeg -version >/dev/null 2>&1 || { echo "ffmpeg is installed but does not run: try  ffmpeg -version"; exit 1; }
command -v npm >/dev/null || { echo "Node.js 18+ is missing. Mac: brew install node"; exit 1; }
PY=$(command -v python3) || { echo "python3 is missing"; exit 1; }
"$PY" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)' || { echo "python 3.9+ is needed"; exit 1; }

# Some networks offer IPv6 that crawls and then stalls, which leaves curl and pip hanging with no error.
# Fetch one small file; if that fails while IPv4 works, do every download over IPv4.
CURL=(curl -fL --retry 3 --connect-timeout 20)
PROBE=https://files.pythonhosted.org/packages/py3/p/pip/pip-24.0-py3-none-any.whl
if [ "${ANIM_IPV4:-}" != "1" ] && ! curl -fsL -o /dev/null -m 20 "$PROBE" && curl -4 -fsL -o /dev/null -m 20 "$PROBE"; then
  ANIM_IPV4=1
  say "IPv6 is stalling on this network, so downloads go over IPv4"
fi
if [ "${ANIM_IPV4:-}" = "1" ]; then
  CURL+=(-4)
  # pip has no IPv4 switch: a sitecustomize that only asks DNS for IPv4 addresses does it, for this script only
  mkdir -p "$TMP/ipv4"
  printf '%s\n' 'import socket' '_g = socket.getaddrinfo' \
    'socket.getaddrinfo = lambda host, port, family=0, *a, **k: _g(host, port, socket.AF_INET, *a, **k)' \
    > "$TMP/ipv4/sitecustomize.py"
  export PYTHONPATH="$TMP/ipv4${PYTHONPATH:+:$PYTHONPATH}"
fi

# fetch <file> <url>...: tries each url in turn, writes <file> only once a download is complete
fetch() {
  local out="$1"; shift
  local url
  for url in "$@"; do
    if "${CURL[@]}" -o "$out.part" "$url"; then mv "$out.part" "$out"; return 0; fi
  done
  rm -f "$out.part"
  return 1
}

say "installing three.js and Playwright into kit/node_modules"
(cd "$KIT" && npm install --silent --no-audit --no-fund)

# Playwright's own installer can hang while unzipping on new Node releases (the download finishes, the unzip never does).
# So download and unzip each browser here, then write the marker Playwright looks for; its installer then has nothing left to do.
say "installing Playwright's Chromium (the /zach-d-films and /stick-figure engines render with it)"
unzip_to() {  # unzip_to <zip> <dir>
  if command -v ditto >/dev/null; then ditto -x -k "$1" "$2"
  elif command -v unzip >/dev/null; then unzip -q "$1" -d "$2"
  else return 1; fi
}
install_browsers() {
  local plan dir urls i=0
  plan=$(cd "$KIT" && npx --yes playwright install --dry-run chromium) || return 1
  # one line per browser: <install dir> TAB <url> <fallback url>...
  while IFS=$'\t' read -r dir urls; do
    [ -n "$dir" ] || continue
    [ -f "$dir/INSTALLATION_COMPLETE" ] && continue
    echo "  $(basename "$dir")"
    i=$((i + 1))
    # shellcheck disable=SC2086
    fetch "$TMP/browser$i.zip" $urls || return 1
    rm -rf "$dir"; mkdir -p "$dir"
    unzip_to "$TMP/browser$i.zip" "$dir" || { rm -rf "$dir"; return 1; }
    rm -f "$TMP/browser$i.zip"
    touch "$dir/INSTALLATION_COMPLETE"
  done < <(printf '%s\n' "$plan" | awk '
    /Install location:/ { if (d != "") print d "\t" u; d = $0; sub(/^.*Install location: */, "", d); u = "" }
    /Download (url|fallback [0-9]+):/ { u = u " " $NF }
    END { if (d != "") print d "\t" u }' | sort -u)
}
install_browsers || echo "  could not unzip the browsers here; handing over to Playwright's installer"
(cd "$KIT" && npx --yes playwright install chromium >/dev/null)

mkdir -p "$KIT/vendor"
if [ ! -s "$KIT/vendor/gsap.min.js" ]; then
  say "fetching GSAP"
  fetch "$KIT/vendor/gsap.min.js" https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js
fi

say "warming up HyperFrames (first run downloads it)"
npx --yes hyperframes@0.8.34 --version >/dev/null 2>&1 || echo "warning: could not run hyperframes yet; the first render will retry"

if [ "${1:-}" = "--voice" ] || [ "${1:-}" = "--stick" ]; then
  # kokoro-onnx needs Python 3.10 to 3.13 (macOS's own python3 is 3.9)
  voice_ok() { "$1" -c 'import sys; sys.exit(0 if (3, 10) <= sys.version_info[:2] <= (3, 13) else 1)' 2>/dev/null; }
  VPY=""
  for c in python3.13 python3.12 python3.11 python3.10 python3 \
           "$HOME"/.local/share/uv/python/cpython-3.1[0-3]*/bin/python3; do
    p=$(command -v "$c" 2>/dev/null) || continue
    if voice_ok "$p"; then VPY="$p"; break; fi
  done
  if [ -z "$VPY" ] && command -v uv >/dev/null; then
    VPY=$(uv python find '>=3.10,<3.14' 2>/dev/null) || VPY=""
  fi
  [ -n "$VPY" ] || { echo "the voice needs Python 3.10 to 3.13. Mac: brew install python@3.12  (or: uv python install 3.12)"; exit 1; }

  if [ -x "$KIT/.venv/bin/python" ] && ! voice_ok "$KIT/.venv/bin/python"; then
    say "kit/.venv runs Python $("$KIT/.venv/bin/python" -c 'import sys; print("%d.%d" % sys.version_info[:2])'), too old for the voice: making it again"
    rm -rf "$KIT/.venv"
  fi
  if [ ! -x "$KIT/.venv/bin/python" ]; then
    say "making kit/.venv with $("$VPY" --version)"
    "$VPY" -m venv "$KIT/.venv"
  fi
  "$KIT/.venv/bin/python" -m pip install -q --timeout 30 --retries 5 --upgrade pip
  "$KIT/.venv/bin/python" -m pip install -q --timeout 30 --retries 5 numpy scipy soundfile kokoro-onnx sherpa-onnx
  M="$KIT/models"
  mkdir -p "$M"
  say "downloading the voice and word-timing models (about 1 GB, once)"
  K=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
  [ -s "$M/kokoro-v1.0.onnx" ] || fetch "$M/kokoro-v1.0.onnx" "$K/kokoro-v1.0.onnx"
  [ -s "$M/voices-v1.0.bin" ] || fetch "$M/voices-v1.0.bin" "$K/voices-v1.0.bin"
  P=sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8
  if [ ! -s "$M/$P/tokens.txt" ]; then
    fetch "$TMP/p.tar.bz2" "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/$P.tar.bz2"
    rm -rf "$TMP/p" && mkdir "$TMP/p" && tar xjf "$TMP/p.tar.bz2" -C "$TMP/p"
    rm -rf "${M:?}/$P" && mv "$TMP/p/$P" "$M/$P"
  fi
fi
say "ready"
