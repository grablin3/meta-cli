#!/usr/bin/env node

import('../dist/index.js').catch((err) => {
  console.error('Failed to start grablin CLI:', err.message);
  process.exit(1);
});
