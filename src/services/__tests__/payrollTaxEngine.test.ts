/** PEN-024 : tests payrollTaxEngine — barèmes CNPS/CMU/ITS/FDFP. */
import { describe, it, expect } from 'vitest';
import { PayrollTaxEngine } from '../payrollTaxEngine';

describe('PayrollTaxEngine.calculateEmployee', () => {
  it('salaire 100 000 BTP : CNPS 6 300, CMU 500+500, net 86 520', () => {
    const r = PayrollTaxEngine.calculateEmployee(100_000, 'btp', 1.0, true);
    expect(r.chargesSalariales.cnpsRetraite).toBe(6300);
    expect(r.chargesSalariales.cmu).toBe(500);
    expect(r.chargesPatronales.cmu).toBe(500);
    expect(r.salaireNetAPayer).toBe(86520);
  });

  it('charges patronales 100 000 BTP : CNPS total 15 225, coût employeur 117 325', () => {
    const r = PayrollTaxEngine.calculateEmployee(100_000, 'btp', 1.0, true);
    expect(r.chargesPatronales.cnpsTotal).toBe(15225);
    expect(r.chargesPatronales.cnpsPrestationsFamiliales).toBe(4025);
    expect(r.chargesPatronales.cnpsAccidentsTravail).toBe(3500);
    expect(r.coutTotalEmployeur).toBe(117325);
  });

  it('SMIG 75 000 commerce : net 66 116, coût 88 600', () => {
    const r = PayrollTaxEngine.calculateEmployee(75_000, 'commerce', 1.0, true);
    expect(r.salaireNetAPayer).toBe(66116);
    expect(r.chargesPatronales.cnpsTotal).toBe(11900);
    expect(r.coutTotalEmployeur).toBe(88600);
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
    expect(r.salaireNetAPayer).toBe(8774);
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
    expect(r.totalCmu).toBe(14 * 1000);
    expect(r.totalFdfp).toBeGreaterThan(0);
    expect(r.salariesNonAffiliesCmu).toBe(0);
    expect(r.totalVersementsMensuels).toBe(
      r.totalCnps + r.totalCmu + r.totalIts + r.totalFdfp
    );
  });

  it('mode exact : distribution inégale écrête au plafond retraite 2,7M', () => {
    // Moyenne 1,55M pour 2 salariés, mais l'un dépasse le plafond : l'exact
    // doit être INFÉRIEUR à l'approximation par moyenne (plafond ignoré).
    const approx = PayrollTaxEngine.calculateCompany(3_100_000, 2, 'btp');
    const exact = PayrollTaxEngine.calculateCompany(3_100_000, 2, 'btp', 2, [3_000_000, 100_000]);
    expect(exact.totalCnps).toBeLessThan(approx.totalCnps);
    expect(exact.totalVersementsMensuels).toBe(
      exact.totalCnps + exact.totalCmu + exact.totalIts + exact.totalFdfp
    );
  });
});
