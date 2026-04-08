/**
 * semantics.js — Semantic Analysis for TaskDSL
 *
 * PPL Concept: After syntax analysis produces an AST, semantic analysis
 * checks the MEANING and VALIDITY of the program, then transforms the
 * AST into a usable domain object.
 *
 * Responsibilities:
 *  1. Type checking  — values are correct types (number is positive, etc.)
 *  2. Range validation — priority is one of the allowed set
 *  3. Constraint checking — dueDate must be in the future
 *  4. AST → Task Object transformation
 *
 * Output (Task Object):
 * {
 *   title    : string,
 *   priority : 'low' | 'medium' | 'high' | 'urgent',
 *   dueDate  : Date | null,
 *   tags     : string[],
 * }
 */

import { NodeType } from './parser.js';

// ─────────────────────────────────────────────
// Priority metadata
// ─────────────────────────────────────────────

/** Numeric weight for sorting (higher = more urgent) */
export const PRIORITY_ORDER = Object.freeze({
  urgent: 4,
  high:   3,
  medium: 2,
  low:    1,
});

/** Default priority when not specified in the DSL */
const DEFAULT_PRIORITY = 'medium';

/** Maximum allowed duration to prevent nonsensical dates */
const MAX_DURATION = { d: 3650, h: 87600, w: 520 }; // ~10 years

// ─────────────────────────────────────────────
// Semantic Analyser
// ─────────────────────────────────────────────

export class SemanticAnalyser {
  /**
   * Analyse a Task AST node and return a plain task object.
   *
   * @param {object} ast   - The AST produced by Parser.parseTask()
   * @param {Date}   [now] - Reference time (injectable for testing)
   * @returns {{ title, priority, dueDate, tags }}
   */
  analyse(ast, now = new Date()) {
    if (ast.type !== NodeType.TASK) {
      throw new SemanticError('Root node must be of type Task');
    }

    const title    = this._analyseTitle(ast.title);
    const priority = this._analysePriority(ast.priority);
    const dueDate  = this._analyseDuration(ast.duration, now);
    const tags     = this._analyseTags(ast.tags);

    return { title, priority, dueDate, tags };
  }

  // ── Private analysis methods ─────────────────────────────────────

  /**
   * Title analysis:
   * - Strip leading/trailing whitespace
   * - Enforce minimum length
   */
  _analyseTitle(titleNode) {
    const title = titleNode.value.trim();
    if (title.length === 0) {
      throw new SemanticError('Task title cannot be blank');
    }
    if (title.length > 200) {
      throw new SemanticError('Task title is too long (max 200 characters)');
    }
    return title;
  }

  /**
   * Priority analysis:
   * - If absent → default to 'medium'
   * - Value is already validated by the lexer, but we double-check here
   */
  _analysePriority(priorityNode) {
    if (!priorityNode) return DEFAULT_PRIORITY;

    const value = priorityNode.value;
    if (!(value in PRIORITY_ORDER)) {
      throw new SemanticError(
        `Invalid priority "${value}". Allowed: low, medium, high, urgent`
      );
    }
    return value;
  }

  /**
   * Duration → dueDate analysis:
   * - If absent → dueDate = null
   * - Convert relative duration to absolute Date
   * - Validate amount is positive and within sane range
   *
   * Unit mapping:
   *   d → days   (multiply by 24*60*60*1000 ms)
   *   h → hours  (multiply by    60*60*1000 ms)
   *   w → weeks  (multiply by 7*24*60*60*1000 ms)
   */
  _analyseDuration(durationNode, now) {
    if (!durationNode) return null;

    const { amount, unit } = durationNode;

    // Type / range check
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new SemanticError(
        `Duration amount must be a positive integer, got ${amount}`
      );
    }
    if (amount > MAX_DURATION[unit]) {
      throw new SemanticError(
        `Duration "${durationNode.raw}" exceeds maximum allowed (${MAX_DURATION[unit]}${unit})`
      );
    }

    const MS = {
      d: 24 * 60 * 60 * 1000,
      h:      60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
    };

    const dueDate = new Date(now.getTime() + amount * MS[unit]);
    return dueDate;
  }

  /**
   * Tags analysis:
   * - Deduplicate (case-insensitive)
   * - Normalize to lowercase
   * - Enforce max tag count
   */
  _analyseTags(tagNodes) {
    if (!tagNodes || tagNodes.length === 0) return [];

    if (tagNodes.length > 10) {
      throw new SemanticError('Too many tags (max 10 per task)');
    }

    const seen = new Set();
    const tags = [];
    for (const node of tagNodes) {
      const normalized = node.value.toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        tags.push(normalized);
      }
    }
    return tags;
  }
}

// ─────────────────────────────────────────────
// Custom error class
// ─────────────────────────────────────────────
export class SemanticError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SemanticError';
  }
}

/**
 * Convenience function: analyse AST → task object
 * @param {object} ast
 * @param {Date}   [now]
 * @returns {{ title, priority, dueDate, tags }}
 */
export function analyse(ast, now = new Date()) {
  return new SemanticAnalyser().analyse(ast, now);
}
