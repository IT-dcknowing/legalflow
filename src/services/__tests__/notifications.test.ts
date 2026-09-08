import { describe, it, expect } from 'vitest';
import {
  isValidIvorianPhone,
  normalizeIvorianPhone,
  formatIvorianPhone,
} from '../notifications';

describe('validation numéro ivoirien (CDC §1)', () => {
  it('accepte les mobiles 01/05/07 au format +225', () => {
    expect(isValidIvorianPhone('+2250701020304')).toBe(true);
    expect(isValidIvorianPhone('+225 05 44 55 66 77')).toBe(true);
    expect(isValidIvorianPhone('+2250144445566')).toBe(true);
  });

  it('rejette les formats invalides', () => {
    expect(isValidIvorianPhone('+2250901020304')).toBe(false);
    expect(isValidIvorianPhone('0701020304')).toBe(false);
    expect(isValidIvorianPhone('+22507010203')).toBe(false);
    expect(isValidIvorianPhone('')).toBe(false);
    expect(isValidIvorianPhone('+33612345678')).toBe(false);
  });

  it('normalise espaces et tirets', () => {
    expect(normalizeIvorianPhone('+225 07-01 02 03 04')).toBe('+2250701020304');
  });

  it('formate en blocs lisibles', () => {
    expect(formatIvorianPhone('+2250701020304')).toBe('+225 07 01 02 03 04');
  });
});
