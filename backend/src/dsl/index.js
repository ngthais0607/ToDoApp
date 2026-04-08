/**
 * dsl/index.js — Public API for the TaskDSL pipeline
 *
 * PPL Pipeline:
 *
 *   Input string
 *       │
 *       ▼
 *   [Lexer]  — Lexical Analysis   → Token[]
 *       │
 *       ▼
 *   [Parser] — Syntax Analysis    → AST
 *       │
 *       ▼
 *   [Semantics] — Semantic Analysis → Task Object
 *
 * Usage:
 *   import { parseDSL } from './dsl/index.js';
 *
 *   const result = parseDSL('"Lam bao cao" @high in 3d #school');
 *   // result.ok  === true
 *   // result.task === { title, priority, dueDate, tags }
 *
 *   const result = parseDSL('"" @invalid');
 *   // result.ok    === false
 *   // result.error === "..."
 *   // result.phase === "lexer" | "parser" | "semantic"
 */

import { tokenize, LexerError }      from './lexer.js';
import { parse, ParseError }          from './parser.js';
import { analyse, SemanticError }     from './semantics.js';

export { PRIORITY_ORDER } from './semantics.js';
export { TokenType }      from './lexer.js';
export { NodeType }       from './parser.js';

/**
 * Full DSL pipeline: string → task object.
 *
 * Returns a result object (never throws) so the caller can easily
 * distinguish success from different error phases.
 *
 * @param {string} input  - Raw DSL string from user input
 * @param {Date}   [now]  - Reference time for dueDate calculation
 * @returns {{
 *   ok:    boolean,
 *   task?: { title: string, priority: string, dueDate: Date|null, tags: string[] },
 *   error?: string,
 *   phase?: 'lexer' | 'parser' | 'semantic'
 * }}
 */
export function parseDSL(input, now = new Date()) {
  // ── Phase 1: Lexical Analysis ─────────────────────────────────────
  let tokens;
  try {
    tokens = tokenize(input);
  } catch (err) {
    if (err instanceof LexerError) {
      return { ok: false, error: err.message, phase: 'lexer' };
    }
    throw err; // unexpected error — re-throw
  }

  // ── Phase 2: Syntax Analysis (Parsing) ───────────────────────────
  let ast;
  try {
    ast = parse(tokens);
  } catch (err) {
    if (err instanceof ParseError) {
      return { ok: false, error: err.message, phase: 'parser' };
    }
    throw err;
  }

  // ── Phase 3: Semantic Analysis ────────────────────────────────────
  let task;
  try {
    task = analyse(ast, now);
  } catch (err) {
    if (err instanceof SemanticError) {
      return { ok: false, error: err.message, phase: 'semantic' };
    }
    throw err;
  }

  return { ok: true, task };
}

/**
 * Quick-check: returns true if the DSL string is valid.
 * Useful for real-time validation in the frontend.
 *
 * @param {string} input
 * @returns {boolean}
 */
export function isValidDSL(input) {
  return parseDSL(input).ok;
}
