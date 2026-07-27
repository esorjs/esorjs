#!/bin/bash
npx playwright install --with-deps
npm run type-check || true
npm run test
