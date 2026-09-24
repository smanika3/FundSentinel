#!/usr/bin/env bash
# Copy the pipeline code + config into runtime/ so AgentCore packages them (without the data/ folder).
# Run before every `agentcore deploy`.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf runtime/fundsentinel runtime/config
cp -R fundsentinel runtime/fundsentinel
cp -R config runtime/config
find runtime/fundsentinel -name __pycache__ -type d -prune -exec rm -rf {} +
echo "runtime/ synced: $(find runtime/fundsentinel runtime/config -type f | wc -l | tr -d ' ') files"
