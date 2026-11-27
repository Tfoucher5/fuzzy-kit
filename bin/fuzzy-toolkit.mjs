#!/usr/bin/env node
// Entry point of `npx fuzzy-toolkit`. `mcp` starts the MCP server for AI
// agents, `ai-setup` writes usage notes for AI assistants, `new-pack` starts a
// language pack or preset package, and every other
// command is the command line tool.
const command = process.argv[2];
if (command === 'mcp') {
  const { serve } = await import('./mcp.mjs');
  serve();
} else if (command === 'ai-setup') {
  const { main } = await import('./ai-setup.mjs');
  main(process.argv.slice(3));
} else if (command === 'new-pack') {
  const { main } = await import('./new-pack.mjs');
  main(process.argv.slice(3));
} else {
  await import('./cli.mjs');
}
