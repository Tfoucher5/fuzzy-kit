#!/usr/bin/env node
// Entry point of `npx fuzzy-toolkit`. `mcp` starts the MCP server for AI
// agents; every other command is the command line tool.
if (process.argv[2] === 'mcp') {
  const { serve } = await import('./mcp.mjs');
  serve();
} else {
  await import('./cli.mjs');
}
