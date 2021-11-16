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

About: 

Required Env Vars:
- `BACKEND=OWM`
- `OWM_KEY=key-here`

### [Open-Meteo](https://open-meteo.com)

Required Env Vars:
- `BACKEND=METEO`
