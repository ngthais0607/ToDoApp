/**
 * lexer.js — Lexical Analysis (Tokenizer) for TaskDSL
 *
 * Token grammar (mirrors TaskDSL.g4 lexer rules):
 *   PRIORITY ::= '@' ('low'|'medium'|'high'|'urgent')
 *   IN       ::= 'in'          (standalone word, exact match)
 *   DURATION ::= [0-9]+ [dhw]  (e.g. 3d, 12h, 1w)
 *   TAG      ::= '#' identifier
 *   WORD     ::= any non-whitespace that is not @... or #...
 *   WS       ::= [ \t\r\n]+   (skipped)
 *
 * Ambiguity: 'in' is emitted as IN token when standalone.
 * The PARSER decides whether it's a duration keyword or part of the title
 * by checking if the next token is DURATION.
 */

export const TokenType = Object.freeze({
  PRIORITY: 'PRIORITY', // @low | @medium | @high | @urgent
  IN:       'IN',       // the word 'in'
  DURATION: 'DURATION', // 3d | 12h | 1w
  TAG:      'TAG',      // #school
  WORD:     'WORD',     // any other non-whitespace chunk (title words)
  EOF:      'EOF',
});

const VALID_PRIORITIES = new Set(['low', 'medium', 'high', 'urgent']);

class Token {
  constructor(type, value, pos) {
    this.type  = type;
    this.value = value;
    this.pos   = pos;
  }
}

export class Lexer {
  constructor(input) {
    this.input  = input;
    this.pos    = 0;
    this.tokens = [];
  }

  peek()    { return this.input[this.pos]; }
  advance() { return this.input[this.pos++]; }
  isEOF()   { return this.pos >= this.input.length; }

  skipWhitespace() {
    while (!this.isEOF() && /\s/.test(this.peek())) this.advance();
  }

  tokenize() {
    while (!this.isEOF()) {
      this.skipWhitespace();
      if (this.isEOF()) break;

      const startPos = this.pos;
      const ch = this.peek();

      // ── PRIORITY: @low | @medium | @high | @urgent ────────────────
      if (ch === '@') {
        this.tokens.push(this.readPriority(startPos));
        continue;
      }

      // ── TAG: #word ────────────────────────────────────────────────
      if (ch === '#') {
        this.tokens.push(this.readTag(startPos));
        continue;
      }

      // ── WORD / IN / DURATION: read until whitespace or @/# ────────
      this.tokens.push(this.readWord(startPos));
    }

    this.tokens.push(new Token(TokenType.EOF, null, this.pos));
    return this.tokens;
  }

  /** Read @priority */
  readPriority(startPos) {
    this.advance(); // consume @
    let level = '';
    while (!this.isEOF() && /[a-zA-Z]/.test(this.peek())) level += this.advance();
    if (!VALID_PRIORITIES.has(level)) {
      throw new LexerError(
        `Invalid priority "@${level}". Use @low, @medium, @high, or @urgent`,
        startPos
      );
    }
    return new Token(TokenType.PRIORITY, level, startPos);
  }

  /** Read #tag */
  readTag(startPos) {
    this.advance(); // consume #
    let name = '';
    if (!this.isEOF() && /[a-zA-Z\u0080-\uFFFF]/.test(this.peek())) {
      name += this.advance();
    } else {
      throw new LexerError('Tag name must start with a letter after #', startPos);
    }
    while (!this.isEOF() && /[a-zA-Z0-9_\u0080-\uFFFF]/.test(this.peek())) {
      name += this.advance();
    }
    return new Token(TokenType.TAG, name, startPos);
  }

  /**
   * Read a whitespace-delimited chunk, then classify it as:
   *   IN       — exactly the word "in"
   *   DURATION — matches /^\d+[dhw]$/  (e.g. "3d", "12h", "1w")
   *   WORD     — anything else (title words, numbers without unit, etc.)
   */
  readWord(startPos) {
    let text = '';
    while (!this.isEOF() && !/\s/.test(this.peek()) && this.peek() !== '@' && this.peek() !== '#') {
      text += this.advance();
    }
    if (text === 'in') {
      return new Token(TokenType.IN, 'in', startPos);
    }
    if (/^\d+[dhw]$/.test(text)) {
      return new Token(TokenType.DURATION, text, startPos);
    }
    return new Token(TokenType.WORD, text, startPos);
  }
}

export class LexerError extends Error {
  constructor(message, pos) {
    super(message);
    this.name = 'LexerError';
    this.pos  = pos;
  }
}

export function tokenize(input) {
  return new Lexer(input).tokenize();
}
