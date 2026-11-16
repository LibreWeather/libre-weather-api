# LibreWeather... API

Core APIs for LibreWeather/libre-weather

## Get it up and running

- Create a `.env` file in the root with Backend env vars (see [Supported Backends](#supported-backends))
- Optionally add `SCOPE` and `LOG_LEVEL` as well, for logging management.
- Run `npm i` and `npm run dev`. This will start an auto-reloading `nodemon` instance, serving the API at localhost:3000.

## Development

Check for existing known issues or planned changes, and feel free to contribute.

Swagger doc included at `/docs`.

## Supported Backends

### [OpenWeather](https://openweathermap.org/appid) Maps

#### Required Env Vars
- `BACKEND=OWM`
- `OWM_KEY=key-here`

### [Open-Meteo](https://open-meteo.com)

#### Required Env Vars
- `BACKEND=METEO`

### [Pirate Weather](https://pirateweather.net)

#### Required Env Vars
- `BACKEND=PIRATE`
- `PIRATE_WEATHER_KEY=key-here`

A request can select another backend with `x-backend` (`OWM`, `METEO`, or `PIRATE`) and `x-backend-key`. An unknown name, an unusable key, or a failed fetch falls back to `BACKEND`. The response header `x-backend` names the backend that served the body.
