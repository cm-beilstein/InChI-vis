import { describe, it, expect } from 'vitest';
import { subscript, swatchVar, formulaReading, readingFor, LAYER_INFO, DEFAULT_INFO } from '../layerInfo';
import type { Layer } from '../parseInchi';

describe('subscript', () => {
  it('converts 0 to ₀', () => expect(subscript(0)).toBe('₀'));
  it('converts 6 to ₆', () => expect(subscript(6)).toBe('₆'));
  it('converts 12 to ₁₂', () => expect(subscript(12)).toBe('₁₂'));
});

describe('swatchVar', () => {
  it('maps c to conn', () => expect(swatchVar('c')).toBe('conn'));
  it('maps h to hydro', () => expect(swatchVar('h')).toBe('hydro'));
  it('maps q to charge', () => expect(swatchVar('q')).toBe('charge'));
  it('maps p to proton', () => expect(swatchVar('p')).toBe('proton'));
  it('maps i to isotope', () => expect(swatchVar('i')).toBe('isotope'));
  it('maps b to stereo', () => expect(swatchVar('b')).toBe('stereo'));
  it('maps t to stereo', () => expect(swatchVar('t')).toBe('stereo'));
  it('maps m to stereo', () => expect(swatchVar('m')).toBe('stereo'));
  it('maps s to stereo', () => expect(swatchVar('s')).toBe('stereo'));
  it('maps version to version', () => expect(swatchVar('version')).toBe('version'));
  it('maps formula to formula', () => expect(swatchVar('formula')).toBe('formula'));
});

describe('formulaReading', () => {
  it('converts C6H6 to element count prose', () => {
    const result = formulaReading('C6H6');
    expect(result).toContain('<b>6</b>');
    expect(result).toContain('carbon');
    expect(result).toContain('hydrogen');
  });
  it('uses singular for count of 1', () => {
    const result = formulaReading('CH4');
    expect(result).toContain('<b>1</b>');
    expect(result).toMatch(/carbon(?!s)/);
  });
});

describe('readingFor', () => {
  const versionLayer: Layer = { type: 'version', prefix: '', text: '1S', atoms: [], bonds: [] };
  const formulaLayer: Layer = { type: 'formula', prefix: '', text: 'C6H6', atoms: [1,2,3,4,5,6], bonds: [] };
  const cLayer: Layer = { type: 'c', prefix: 'c', text: '1-2-3-4-5-6-1', atoms: [1,2,3,4,5,6], bonds: [[1,2],[2,3],[3,4],[4,5],[5,6],[6,1]] };
  const hLayer: Layer = { type: 'h', prefix: 'h', text: '1-6H', atoms: [1,2,3,4,5,6], bonds: [] };

  const benzeneAtomElements: Record<number, string> = { 1: 'C', 2: 'C', 3: 'C', 4: 'C', 5: 'C', 6: 'C' };

  it('returns standard version reading for 1S', () => {
    const result = readingFor(versionLayer, {});
    expect(result).toContain('<b>1</b>');
    expect(result).toContain('<b>S</b>');
  });

  it('returns formula reading for formula layer', () => {
    const result = readingFor(formulaLayer, {});
    expect(result).toContain('carbon');
    expect(result).toContain('hydrogen');
  });

  it('uses atomElements for c-layer bond labels', () => {
    const result = readingFor(cLayer, benzeneAtomElements);
    // Should use element label like C₁–C₂, not #1–#2
    expect(result).toContain('C');
    expect(result).not.toContain('#1');
  });

  it('uses atomElements for h-layer atom labels', () => {
    const result = readingFor(hLayer, benzeneAtomElements);
    expect(result).toContain('C');
    expect(result).not.toContain('#1');
  });

  it('falls back to #N when atomElements is empty', () => {
    const result = readingFor(cLayer, {});
    expect(result).toContain('#1');
  });
});

describe('LAYER_INFO', () => {
  it('has entries for all 11 layer types', () => {
    const expected = ['version','formula','c','h','q','p','b','t','m','s','i'];
    for (const key of expected) {
      expect(LAYER_INFO).toHaveProperty(key);
      expect(LAYER_INFO[key as keyof typeof LAYER_INFO].title).toBeTruthy();
    }
  });
});

describe('DEFAULT_INFO', () => {
  it('has title "Hover any layer"', () => expect(DEFAULT_INFO.title).toBe('Hover any layer'));
  it('has non-empty blurb', () => expect(DEFAULT_INFO.blurb.length).toBeGreaterThan(10));
});
