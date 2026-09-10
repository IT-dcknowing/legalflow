/**
 * Moteur fiscal et social ivoirien (PayrollTaxEngine) - Port TypeScript
 * Miroir exact de /laravel/app/Services/Engines/PayrollTaxEngine.php
 */

export interface EmployeePayrollResult {
  salaireBrut: number;
  salaireNetAPayer: number;
  coutTotalEmployeur: number;
  chargesSalariales: {
    cnpsRetraite: number;
    cmu: number;
    is: number;
    cn: number;
    igr: number;
    total: number;
  };
  chargesPatronales: {
    cnpsPrestationsFamiliales: number;
    cnpsAccidentsTravail: number;
    cnpsRetraite: number;
    cnpsTotal: number;
    cmu: number;
    fdfpApprentissage: number;
    fdfpFormationContinue: number;
    fdfpTotal: number;
    fdfpPartRecuperable: number;
    total: number;
  };
  versementsOrganismes: {
    dgiTotal: number;
    cnpsTotal: number;
    cmuTotal: number;
  };
}

export interface CompanyPayrollResult {
  effectif: number;
  salariesAffiliesCmu: number;
  salariesNonAffiliesCmu: number;
  masseSalarialeMensuelle: number;
  totalCnps: number;
  totalCmu: number;
  totalIts: number;
  totalFdfp: number;
  fdfpPotentielFormationAnnuel: number;
  coutTotalCharges: number;
  totalVersementsMensuels: number;
}

export class PayrollTaxEngine {
  public static readonly PLAFOND_CNPS_PF = 70_000;
  public static readonly PLAFOND_CNPS_RETRAITE = 2_700_000;
  // CMU : 1 000 FCFA / salarié / mois au total (500 part salariale + 500 part patronale).
  public static readonly COTISATION_CMU_SALARIALE = 500;
  public static readonly COTISATION_CMU_PATRONALE = 500;

  public static calculateEmployee(
    salaireBrut: number,
    secteur: 'btp' | 'commerce' | 'industrie' | 'services' = 'btp',
    nombreParts = 1.0,
    assujettiCmu = true
  ): EmployeePayrollResult {
    // Taux AT/MP par secteur
    const tauxAtmp = {
      btp: 0.05,
      industrie: 0.04,
      commerce: 0.03,
      services: 0.02,
    }[secteur] || 0.03;

    // CNPS Salariale Retraite 6.3% (plafonné à 2 700 000 F)
    const baseRetraite = Math.min(salaireBrut, this.PLAFOND_CNPS_RETRAITE);
    const cnpsRetraiteSalariale = Math.round(baseRetraite * 0.063);

    // CMU Salariale
    const cmuSalariale = assujettiCmu ? this.COTISATION_CMU_SALARIALE : 0;

    // Impôts sur salaires (IS, CN, IGR)
    const baseImposable = salaireBrut * 0.8;
    const is = Math.round(baseImposable * 0.012);

    let cn = 0;
    if (baseImposable > 50_000 && baseImposable <= 130_000) {
      cn = (baseImposable - 50_000) * 0.015;
    } else if (baseImposable > 130_000 && baseImposable <= 200_000) {
      cn = (80_000 * 0.015) + ((baseImposable - 130_000) * 0.05);
    } else if (baseImposable > 200_000) {
      cn = (80_000 * 0.015) + (70_000 * 0.05) + ((baseImposable - 200_000) * 0.1);
    }
    cn = Math.round(cn);

    const baseIgr = Math.max(0, (baseImposable - is - cn) * 0.85);
    const quotient = nombreParts > 0 ? (baseIgr / nombreParts) : baseIgr;
    let igrBrut = 0;
    if (quotient > 25_000 && quotient <= 45_000) {
      igrBrut = (quotient - 25_000) * 0.1;
    } else if (quotient > 45_000 && quotient <= 85_000) {
      igrBrut = (20_000 * 0.1) + ((quotient - 45_000) * 0.15);
    } else if (quotient > 85_000 && quotient <= 135_000) {
      igrBrut = (20_000 * 0.1) + (40_000 * 0.15) + ((quotient - 85_000) * 0.2);
    } else if (quotient > 135_000) {
      igrBrut = (20_000 * 0.1) + (40_000 * 0.15) + (50_000 * 0.2) + ((quotient - 135_000) * 0.25);
    }
    const igr = Math.round(igrBrut * nombreParts);

    const totalRetenues = cnpsRetraiteSalariale + cmuSalariale + is + cn + igr;
    const salaireNetAPayer = Math.max(0, salaireBrut - totalRetenues);

    // Charges patronales
    const basePlafondBas = Math.min(salaireBrut, this.PLAFOND_CNPS_PF);
    const cnpsPrestationsFamiliales = Math.round(basePlafondBas * 0.0575);
    const cnpsAccidentsTravail = Math.round(basePlafondBas * tauxAtmp);
    const cnpsRetraitePatronale = Math.round(baseRetraite * 0.077);
    const cnpsTotal = cnpsPrestationsFamiliales + cnpsAccidentsTravail + cnpsRetraitePatronale;

    const cmuPatronale = assujettiCmu ? this.COTISATION_CMU_PATRONALE : 0;
    const fdfpApprentissage = Math.round(salaireBrut * 0.004);
    const fdfpFormationContinue = Math.round(salaireBrut * 0.012);
    const fdfpPartRecuperable = Math.round(salaireBrut * 0.006);
    const fdfpTotal = fdfpApprentissage + fdfpFormationContinue;

    const totalChargesPatronales = cnpsTotal + cmuPatronale + fdfpTotal;
    const coutTotalEmployeur = salaireBrut + totalChargesPatronales;

    return {
      salaireBrut,
      salaireNetAPayer,
      coutTotalEmployeur,
      chargesSalariales: {
        cnpsRetraite: cnpsRetraiteSalariale,
        cmu: cmuSalariale,
        is,
        cn,
        igr,
        total: totalRetenues,
      },
      chargesPatronales: {
        cnpsPrestationsFamiliales,
        cnpsAccidentsTravail,
        cnpsRetraite: cnpsRetraitePatronale,
        cnpsTotal,
        cmu: cmuPatronale,
        fdfpApprentissage,
        fdfpFormationContinue,
        fdfpTotal,
        fdfpPartRecuperable,
        total: totalChargesPatronales,
      },
      versementsOrganismes: {
        dgiTotal: is + cn + igr + fdfpTotal,
        cnpsTotal: cnpsRetraiteSalariale + cnpsTotal,
        cmuTotal: cmuSalariale + cmuPatronale,
      },
    };
  }

  public static calculateCompany(
    masseSalarialeMensuelle: number,
    effectif: number,
    secteur: 'btp' | 'commerce' | 'industrie' | 'services' = 'btp',
    salariesAffiliesCmu = effectif,
    // Audit : si les salaires individuels sont connus, le calcul exact par tête
    // remplace l'approximation par salaire moyen (biaisée par les plafonds
    // CNPS 2,7M/70k et la progressivité ITS/IGR).
    salaires?: number[]
  ): CompanyPayrollResult {
    if (effectif <= 0 || masseSalarialeMensuelle <= 0) {
      return {
        effectif: 0,
        salariesAffiliesCmu: 0,
        salariesNonAffiliesCmu: 0,
        masseSalarialeMensuelle: 0,
        totalCnps: 0,
        totalCmu: 0,
        totalIts: 0,
        totalFdfp: 0,
        fdfpPotentielFormationAnnuel: 0,
        coutTotalCharges: 0,
        totalVersementsMensuels: 0,
      };
    }

    const salaireMoyen = masseSalarialeMensuelle / effectif;
    const simOne = this.calculateEmployee(salaireMoyen, secteur, 1.5, true);

    // Mode exact : somme tête par tête quand la distribution est connue.
    let totalCnps: number;
    let totalIts: number;
    let totalFdfp: number;
    let fdfpRecuperableAnnuel: number;
    if (salaires && salaires.length === effectif && salaires.every((s) => s >= 0)) {
      let cnps = 0;
      let its = 0;
      let fdfp = 0;
      let fdfpRecup = 0;
      for (const brut of salaires) {
        const sim = this.calculateEmployee(brut, secteur, 1.5, true);
        cnps += sim.versementsOrganismes.cnpsTotal;
        its += sim.chargesSalariales.is + sim.chargesSalariales.cn + sim.chargesSalariales.igr;
        fdfp += sim.chargesPatronales.fdfpTotal;
        fdfpRecup += sim.chargesPatronales.fdfpPartRecuperable;
      }
      totalCnps = Math.round(cnps);
      totalIts = Math.round(its);
      totalFdfp = Math.round(fdfp);
      fdfpRecuperableAnnuel = Math.round(fdfpRecup * 12);
    } else {
      totalCnps = Math.round(simOne.versementsOrganismes.cnpsTotal * effectif);
      totalIts = Math.round((simOne.chargesSalariales.is + simOne.chargesSalariales.cn + simOne.chargesSalariales.igr) * effectif);
      totalFdfp = Math.round(simOne.chargesPatronales.fdfpTotal * effectif);
      fdfpRecuperableAnnuel = Math.round(simOne.chargesPatronales.fdfpPartRecuperable * effectif * 12);
    }

    const cmuCount = Math.min(effectif, Math.max(0, salariesAffiliesCmu));
    const totalCmu = cmuCount * (this.COTISATION_CMU_SALARIALE + this.COTISATION_CMU_PATRONALE);

    return {
      effectif,
      salariesAffiliesCmu: cmuCount,
      salariesNonAffiliesCmu: Math.max(0, effectif - cmuCount),
      masseSalarialeMensuelle,
      totalCnps,
      totalCmu,
      totalIts,
      totalFdfp,
      fdfpPotentielFormationAnnuel: fdfpRecuperableAnnuel,
      coutTotalCharges: totalCnps + totalCmu + totalFdfp,
      totalVersementsMensuels: totalCnps + totalCmu + totalIts + totalFdfp,
    };
  }
}
