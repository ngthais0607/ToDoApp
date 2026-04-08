/**
 * parser.js — Recursive Descent Parser for TaskDSL
 *
 * Grammar:
 *   task     → title priority? duration? tag* EOF
 *   title    → (WORD | IN-as-word)+
 *   priority → PRIORITY
 *   duration → IN DURATION
 *   tag      → TAG
 *
 * Ambiguity resolution:
 *   'in' (IN token) is treated as a duration keyword ONLY when the
 *   NEXT token is a DURATION. Otherwise it is consumed as a title word.
 *   This allows sentences like "Buy milk in store @low" to work correctly.
 */

import { TokenType } from './lexer.js';

export const NodeType = Object.freeze({
  TASK:     'Task',
  TITLE:    'Title',
  PRIORITY: 'Priority',
  DURATION: 'Duration',
  TAG:      'Tag',
});

export class Parser {
  constructor(tokens) {
    this.tokens  = tokens;
    this.current = 0;
  }

  peek()    { return this.tokens[this.current]; }
  peekNext() { return this.tokens[this.current + 1] ?? { type: TokenType.EOF, value: null }; }

  advance() {
    const t = this.tokens[this.current];
    if (t.type !== TokenType.EOF) this.current++;
    return t;
  }

  check(type)  { return this.peek().type === type; }

  match(type) {
    if (this.check(type)) return this.advance();
    return null;
  }

  expect(type, hint = '') {
    if (this.check(type)) return this.advance();
    const got = this.peek();
    throw new ParseError(
      `Expected ${type} but got ${got.type}` +
      (got.value != null ? ` ("${got.value}")` : '') +
      (hint ? ` — ${hint}` : ''),
      got.pos
    );
  }

  // ── Grammar rules ────────────────────────────────────────────────

  parseTask() {
    const titleNode    = this.parseTitle();
    const priorityNode = this.parsePriority();
    const durationNode = this.parseDuration();
    const tagNodes     = this.parseTags();

    this.expect(TokenType.EOF, 'Unexpected content after valid task command');

    return { type: NodeType.TASK, title: titleNode, priority: priorityNode, duration: durationNode, tags: tagNodes };
  }

  /**
   * title → (WORD | IN-as-word)+
   *
   * Consume WORD tokens freely.
   * Consume IN only when the next token is NOT DURATION
   * (otherwise leave IN for parseDuration).
   */
  parseTitle() {
    const words = [];
    const startPos = this.peek().pos;

    while (true) {
      if (this.check(TokenType.WORD)) {
        words.push(this.advance().value);
        continue;
      }
      // 'in' not followed by DURATION → treat as title word
      if (this.check(TokenType.IN) && this.peekNext().type !== TokenType.DURATION) {
        words.push(this.advance().value); // consume IN as word "in"
        continue;
      }
      break;
    }

    if (words.length === 0) {
      throw new ParseError(
        'Task title is required. Start typing your task name.',
        startPos
      );
    }

    return { type: NodeType.TITLE, value: words.join(' '), pos: startPos };
  }

  /** priority → PRIORITY  (optional) */
  parsePriority() {
    const token = this.match(TokenType.PRIORITY);
    if (!token) return null;
    return { type: NodeType.PRIORITY, value: token.value, pos: token.pos };
  }

  /** duration → IN DURATION  (optional) */
  parseDuration() {
    if (!this.check(TokenType.IN)) return null;

    const inToken  = this.advance();
    const durToken = this.expect(TokenType.DURATION, 'Expected duration after "in", e.g. in 3d, in 12h, in 1w');

    const match  = durToken.value.match(/^(\d+)([dhw])$/);
    const amount = parseInt(match[1], 10);
    const unit   = match[2];

    return { type: NodeType.DURATION, raw: durToken.value, amount, unit, pos: inToken.pos };
  }

  /** tag* → TAG... */
  parseTags() {
    const tags = [];
    while (this.check(TokenType.TAG)) {
      const token = this.advance();
      tags.push({ type: NodeType.TAG, value: token.value, pos: token.pos });
    }
    return tags;
  }
}

export class ParseError extends Error {
  constructor(message, pos) {
    super(message);
    this.name = 'ParseError';
    this.pos  = pos;
  }
}

export function parse(tokens) {
  return new Parser(tokens).parseTask();
}
