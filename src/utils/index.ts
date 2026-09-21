import setup from './logger';
import units from './units';
import capitalize from './capitalize';
import WindSpeed from './windspeed';
import Volume from './volume';
import backends from './backends';
import Visibility from './visibility';
import Temperature from './temp';

export const logger = setup(process.env.SCOPE);
export const secret = process.env.AUTH_SECRET;
export {
  units,
  capitalize,
  backends,
};
export const windspeed = WindSpeed;
export const volume = Volume;
export const visibility = Visibility;
export const temp = Temperature;

export default {
  logger,
  secret,
  units,
  capitalize,
  windspeed: WindSpeed,
  volume: Volume,
  backends,
  visibility: Visibility,
  temp: Temperature,
};
