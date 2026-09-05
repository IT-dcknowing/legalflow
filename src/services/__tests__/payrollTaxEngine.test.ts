/** PEN-024 : tests payrollTaxEngine — barèmes CNPS/CMU/ITS/FDFP. */
import { describe, it, expect } from 'vitest';
import { PayrollTaxEngine } from '../payrollTaxEngine';

describe('PayrollTaxEngine.calculateEmployee', () => {
  it('salaire 100 000 BTP : CNPS 6 300, CMU 1 000, net 86 020', () => {
    const r = PayrollTaxEngine.calculateEmployee(100_000, 'btp', 1.0, true);
    expect(r.chargesSalariales.cnpsRetraite).toBe(6300);
    expect(r.chargesSalariales.cmu).toBe(1000);
    expect(r.salaireNetAPayer).toBe(86020);
  });

  it('charges patronales 100 000 BTP : CNPS total 15 225, coût employeur 117 825', () => {
    const r = PayrollTaxEngine.calculateEmployee(100_000, 'btp', 1.0, true);
    expect(r.chargesPatronales.cnpsTotal).toBe(15225);
    expect(r.chargesPatronales.cnpsPrestationsFamiliales).toBe(4025);
    expect(r.chargesPatronales.cnpsAccidentsTravail).toBe(3500);
    expect(r.coutTotalEmployeur).toBe(117825);
  });

  it('SMIG 75 000 commerce : net 65 616, coût 89 100', () => {
    const r = PayrollTaxEngine.calculateEmployee(75_000, 'commerce', 1.0, true);
    expect(r.salaireNetAPayer).toBe(65616);
    expect(r.chargesPatronales.cnpsTotal).toBe(11900);
    expect(r.coutTotalEmployeur).toBe(89100);
  });

  it('plafond retraite 2,7M : base écrêtée à 170 100', () => {
    const r = PayrollTaxEngine.calculateEmployee(3_000_000, 'btp', 1.0, true);
    expect(r.chargesSalariales.cnpsRetraite).toBe(170100);
  });

  it('sans CMU : cotisations CMU à 0 des deux côtés', () => {
    const r = PayrollTaxEngine.calculateEmployee(200_000, 'commerce', 2.0, false);
    expect(r.chargesSalariales.cmu).toBe(0);
    expect(r.chargesPatronales.cmu).toBe(0);
    expect(r.salaireNetAPayer).toBe(172469);
    expect(r.chargesSalariales.igr).toBe(10311);
  });

  it('petit salaire : net jamais négatif', () => {
    const r = PayrollTaxEngine.calculateEmployee(10_000, 'services', 1.0, true);
    expect(r.salaireNetAPayer).toBeGreaterThanOrEqual(0);
    expect(r.salaireNetAPayer).toBe(8274);
  });

  it('taux AT/MP varie par secteur (btp > services)', () => {
    const btp = PayrollTaxEngine.calculateEmployee(100_000, 'btp', 1.0, true);
    const svc = PayrollTaxEngine.calculateEmployee(100_000, 'services', 1.0, true);
    expect(btp.chargesPatronales.cnpsAccidentsTravail).toBeGreaterThan(
      svc.chargesPatronales.cnpsAccidentsTravail
    );
  });
});

describe('PayrollTaxEngine.calculateCompany', () => {
  it('cas zéro : tout à 0', () => {
    const r = PayrollTaxEngine.calculateCompany(0, 0);
    expect(r.coutTotalCharges).toBe(0);
    expect(r.totalVersementsMensuels).toBe(0);
    expect(r.effectif).toBe(0);
  });

  it('14 salariés / 4M : totaux positifs et cohérents', () => {
    const r = PayrollTaxEngine.calculateCompany(4_000_000, 14, 'btp');
    expect(r.totalCnps).toBeGreaterThan(0);
    expect(r.totalCmu).toBe(14 * 2 * 1000);
    expect(r.totalFdfp).toBeGreaterThan(0);
    expect(r.salariesNonAffiliesCmu).toBe(0);
    expect(r.totalVersementsMensuels).toBe(
      r.totalCnps + r.totalCmu + r.totalIts + r.totalFdfp
    );
  });
});
