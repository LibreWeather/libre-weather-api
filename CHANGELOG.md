## [1.1.1](https://github.com/LibreWeather/libre-weather-api/compare/v1.1.0...v1.1.1) (2026-10-13)


### Bug Fixes

* ship dotenv in prod deps and register nest routes before 404 ([2ca35ab](https://github.com/LibreWeather/libre-weather-api/commit/2ca35abd2a1bf57b2691655f4895a4d27d6509e8))

# [1.1.0](https://github.com/LibreWeather/libre-weather-api/compare/v1.0.7...v1.1.0) (2026-10-13)


### Bug Fixes

* **ci:** load semantic-release config from mjs ([2119d79](https://github.com/LibreWeather/libre-weather-api/commit/2119d798c05602b54405aa2135229d7a2fb2dfae))
* **ci:** move semantic-release config to root ([1789ae9](https://github.com/LibreWeather/libre-weather-api/commit/1789ae9204abf157f74a8c1e184b5abcbc4d3b0d))
* **ci:** move semantic-release config to root ([a83ccec](https://github.com/LibreWeather/libre-weather-api/commit/a83ccec576a2e5c90854f0aeb6ed5a0de1e891d4))
* **ci:** resolve semantic-release plugins from action ([5b6c715](https://github.com/LibreWeather/libre-weather-api/commit/5b6c715f6032ea16e2b7ef5186399c78326ad888))
* **ci:** skip husky hooks in release ([bcaa52a](https://github.com/LibreWeather/libre-weather-api/commit/bcaa52a32cc5d297177ab9ad1afd6db1315ffbb7))


### Features

* rewrite api to nestjs typescript on express ([#20](https://github.com/LibreWeather/libre-weather-api/issues/20)) ([c5ec3ad](https://github.com/LibreWeather/libre-weather-api/commit/c5ec3addd12bf3945dd3a178a3d56e0a41d5560a))
* richer hourly and daily Open-Meteo fields ([#18](https://github.com/LibreWeather/libre-weather-api/issues/18)) ([7055cb7](https://github.com/LibreWeather/libre-weather-api/commit/7055cb739c95ae358a1dcdd959f20255dc0a314c))

## [1.0.7](https://github.com/LibreWeather/libre-weather-api/compare/v1.0.6...v1.0.7) (2025-01-10)


### Bug Fixes

* **METEO:** sunrise/sunset offsets ([e6f4ffb](https://github.com/LibreWeather/libre-weather-api/commit/e6f4ffb3a64bb7cc443139d030506541849da34e))

## [1.0.6](https://github.com/LibreWeather/libre-weather-api/compare/v1.0.5...v1.0.6) (2025-01-10)


### Bug Fixes

* offset on some times ([06c8526](https://github.com/LibreWeather/libre-weather-api/commit/06c852682050574128f50d948616426e138b0adc))

## [1.0.5](https://github.com/LibreWeather/libre-weather-api/compare/v1.0.4...v1.0.5) (2025-01-10)


### Bug Fixes

* just times after now ([d73c30e](https://github.com/LibreWeather/libre-weather-api/commit/d73c30e7ec9b72df3eee0bde60d7d4a46551ddcc))

## [1.0.4](https://github.com/LibreWeather/libre-weather-api/compare/v1.0.3...v1.0.4) (2025-01-10)


### Bug Fixes

* drop offsets by filtering down to just times that are after the current time ([5e8a3da](https://github.com/LibreWeather/libre-weather-api/commit/5e8a3da36b052227a74151f0e742203f06ddca48))

## [1.0.3](https://github.com/LibreWeather/libre-weather-api/compare/v1.0.2...v1.0.3) (2025-01-09)


### Bug Fixes

* run everything as UTC, add offset for hourlies ([27ef3f6](https://github.com/LibreWeather/libre-weather-api/commit/27ef3f64aba49bc5c88f4512f57fc45dc66c5e70))

## [1.0.2](https://github.com/LibreWeather/libre-weather-api/compare/v1.0.1...v1.0.2) (2025-01-09)


### Bug Fixes

* calculate time w/ utc offset ([cd16848](https://github.com/LibreWeather/libre-weather-api/commit/cd16848acbff54381f436fb558505dee4595c7e9))
* dockerfile labels in scope ([79acb91](https://github.com/LibreWeather/libre-weather-api/commit/79acb913cd5e83bd2b69e8793fb64e4b99cf64c8))

## [1.0.1](https://github.com/LibreWeather/libre-weather-api/compare/v1.0.0...v1.0.1) (2025-01-09)


### Bug Fixes

* dates to be consistently milli epochs ([#16](https://github.com/LibreWeather/libre-weather-api/issues/16)) ([cead579](https://github.com/LibreWeather/libre-weather-api/commit/cead5791693b43c77051dec3dbd57c965605697a))

# 1.0.0 (2025-01-08)


### Features

* **API:** add MVP Implementation ([#10](https://github.com/LibreWeather/libre-weather-api/issues/10)) ([9195296](https://github.com/LibreWeather/libre-weather-api/commit/919529698f16d651f27e52fb62a2ab6ffe36bb33))
* dockerize release ([#15](https://github.com/LibreWeather/libre-weather-api/issues/15)) ([4bd1d68](https://github.com/LibreWeather/libre-weather-api/commit/4bd1d68869fc0742ec81b4d2a67dc04e16aad37a))
* Open-Meteo support ([#12](https://github.com/LibreWeather/libre-weather-api/issues/12)) ([b2b988a](https://github.com/LibreWeather/libre-weather-api/commit/b2b988a7b7902ff656dd1e442db068193a7b2825))
