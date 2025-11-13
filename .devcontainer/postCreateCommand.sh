#!/bin/bash
set -x

npm install -g @anthropic-ai/claude-code

npx playwright install chromium
npx playwright install-deps chromium