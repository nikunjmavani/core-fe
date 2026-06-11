import { describe, expect, it } from 'vitest';

import { toCsv } from './csv.ts';

describe('toCsv', () => {
  it('joins headers and rows with commas and newlines', () => {
    const csv = toCsv(
      ['a', 'b'],
      [
        [1, 2],
        [3, 4],
      ],
    );
    expect(csv).toBe('a,b\n1,2\n3,4');
  });

  it('escapes fields containing commas, quotes, or newlines', () => {
    const csv = toCsv(['name'], [['Doe, John'], ['say "hi"'], ['line1\nline2']]);
    expect(csv).toBe('name\n"Doe, John"\n"say ""hi"""\n"line1\nline2"');
  });

  it('renders null/undefined as empty cells', () => {
    expect(toCsv(['x'], [[null], [undefined]])).toBe('x\n\n');
  });
});
