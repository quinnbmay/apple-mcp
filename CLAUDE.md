# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

apple-mcp is a Model Context Protocol (MCP) server that exposes macOS Apple apps (Contacts, Notes, Messages, Mail, Reminders, Calendar, Maps) as tools for AI agents. It uses AppleScript via the `run-applescript` package to interact with native macOS applications.

## Development Commands

### Running the Server
- `bun run dev` - Start the MCP server in development mode (runs index.ts directly)
- `bun run start` - Start the production build (runs compiled dist/index.js)

### Building
- `bun run build` - Build for production (outputs to dist/index.js, minified for Node)

### Testing
- `bun run test` - Run all tests
- `bun run test:watch` - Run tests in watch mode
- `bun run test-runner.ts <test-name>` - Run specific test suite

**Test suites:** contacts, messages, notes, mail, reminders, calendar, maps, web-search, mcp, all

Example: `bun run test-runner.ts contacts` or `bun run test:contacts`

## Architecture

### MCP Server Structure

**index.ts (Main Entry Point)**
- Implements MCP protocol using `@modelcontextprotocol/sdk`
- Uses stdio transport for communication with Claude Desktop
- Implements lazy module loading with safe mode fallback (5s timeout)
- Contains type guard functions for validating tool arguments
- Routes tool calls to utility modules based on tool name

**tools.ts (Tool Definitions)**
- Exports array of MCP tool definitions following `@modelcontextprotocol/sdk` types
- Each tool has: name, description, and JSON schema for input parameters
- Tools: contacts, notes, messages, mail, reminders, calendar, maps

### Utility Modules Pattern

Each Apple app has a utility module in `utils/` that:
1. Exports functions as default object (e.g., `{ getAllNumbers, findNumber }`)
2. Uses `run-applescript` package to execute AppleScript
3. Implements access checking and permission handling
4. Returns structured data or success/error objects
5. Handles errors gracefully with fallback strategies

**Key utilities:**
- `utils/contacts.ts` - Contact search with fuzzy matching, phone number lookup
- `utils/notes.ts` - Note CRUD operations (search, list, create)
- `utils/message.ts` - iMessage send, read, schedule, unread messages
- `utils/mail.ts` - Email operations (unread, search, send, mailbox/account management)
- `utils/reminders.ts` - Reminder CRUD and list management
- `utils/calendar.ts` - Calendar event CRUD and search
- `utils/maps.ts` - Location search, directions, guides, favorites

### AppleScript Execution Pattern

All utilities follow this pattern:
```typescript
async function operation(): Promise<Result> {
  try {
    // 1. Check access permissions (requestAccess function)
    const accessResult = await requestAccess();
    if (!accessResult.hasAccess) {
      throw new Error(accessResult.message);
    }

    // 2. Build AppleScript string (use template literals)
    const script = `
    tell application "AppName"
      -- AppleScript logic
    end tell`;

    // 3. Execute and parse results
    const result = await runAppleScript(script);

    // 4. Transform and return data
    return parseResult(result);
  } catch (error) {
    // 5. Handle errors with fallbacks
    return handleError(error);
  }
}
```

### Safe Mode & Module Loading

The server implements lazy loading to handle slow system APIs:
- Attempts eager loading first (5s timeout)
- Falls back to lazy loading if timeout exceeded
- Modules loaded on-demand when tools are called
- Prevents server startup failures due to slow macOS APIs

### Permission Handling

All utilities implement permission checking:
- Check access before operations (System Settings > Privacy & Security)
- Return clear error messages with setup instructions
- Required permissions: Contacts, Notes, Messages, Mail, Reminders, Calendar, Accessibility

## Code Patterns

### Type Guards
Use type guard functions to validate incoming tool arguments:
```typescript
function isToolArgs(args: unknown): args is ToolArgs {
  // Validate structure and required fields
  // Return false for invalid args
}
```

### Error Messages
- Include "access" in permission-related errors for consistent detection
- Provide actionable error messages with setup instructions
- Use fallback strategies when primary methods fail

### AppleScript Best Practices
- Escape quotes in dynamic strings: `"${value.replace(/"/g, '\\"')}"`
- Use try/catch within AppleScript for robust error handling
- Limit iterations with CONFIG.MAX_* constants to avoid performance issues
- Use `do shell script` for string transformations (e.g., lowercase)

### Testing Structure
- Integration tests in `tests/integration/`
- Test data fixtures in `tests/fixtures/`
- Setup file with common test utilities in `tests/setup.ts`
- Helper utilities in `tests/helpers/`

## Common Patterns

### Fuzzy Contact Matching
contacts.ts implements multiple matching strategies:
1. Exact match (case-insensitive)
2. Name with emojis/special chars cleaned
3. Starts with / contains search term
4. First name / last name matching
5. Substring match in any word

### Mail Account/Mailbox Filtering
Mail operations support optional account and mailbox parameters for filtering results across multiple email accounts.

### Message Scheduling
Messages can be scheduled for future delivery (stored, not native iMessage feature).

### Calendar Date Ranges
Calendar operations accept optional fromDate/toDate ISO strings with sensible defaults (today, +7 days).

## Deployment

The server is distributed as:
1. NPM package (`bunx apple-mcp@latest`)
2. Smithery installer (via `install-mcp`)
3. Direct repository clone

Configuration goes in `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "apple-mcp": {
      "command": "bunx",
      "args": ["--no-cache", "apple-mcp@latest"]
    }
  }
}
```
