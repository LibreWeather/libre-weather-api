import { UnitSystem, VisibilityUnit } from '../types';

export default class Visibility {
  value: string | number | null;
  unit: VisibilityUnit;

  static mapUnit(system: string) {
    return system === UnitSystem.IMPERIAL ? VisibilityUnit.MI : VisibilityUnit.M;
  }

  constructor(value: string | number, system: string) {
    const massaged = Number.parseFloat(String(value)).toFixed(2);
    switch (system) {
      case UnitSystem.IMPERIAL:
        this.value = Number.parseFloat(String(0.00062137119223733 * Number(massaged))).toFixed(2);
        break;
      default:
        this.value = value;
    }
    this.unit = Visibility.mapUnit(system);
  }
}
