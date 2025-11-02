#!/bin/bash

# Type Check Script
# Quickly check TypeScript types without building

set -e

echo "Running TypeScript type check..."

npx tsc --noEmit

echo "✅ Type check passed!"

