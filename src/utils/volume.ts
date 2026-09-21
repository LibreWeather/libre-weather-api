import { UnitSystem, VolumeUnit } from '../types';

export default class Volume {
  value: number | string | null;
  unit: VolumeUnit;

  static mapUnit(system: string) {
    return system === UnitSystem.IMPERIAL ? VolumeUnit.IN : VolumeUnit.MM;
  }

  static longUnit(system: string) {
    return system === UnitSystem.IMPERIAL ? 'inch' : 'mm';
  }

  static native(value: string | number | null | undefined, system: string) {
    const volume = new Volume(null, system);
    if (value != null && value !== '') {
      volume.value = Number.parseFloat(String(value));
    }
    return volume;
  }

  constructor(value: string | number | null | undefined, system: string) {
    if (value != null && value !== '') {
      switch (system) {
        case UnitSystem.IMPERIAL:
          this.value = Number.parseFloat(String(0.03937008 * Number(value))).toFixed(2);
          break;
        default:
          this.value = value;
      }
    } else {
      this.value = null;
    }

    this.unit = Volume.mapUnit(system);
  }
}
