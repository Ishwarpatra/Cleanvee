/**
 * Services Module Index
 * Re-exports all services for easy importing
 */

// MCP Server - Core integration layer
export * from './mcpServer';

// Privacy utilities
export * from './privacy';

// Ticketing connectors
export * from './ticketing';

// Gemini AI service
export { generateShiftReport, analyzeAlert } from './geminiService';
