# Intake — Climate monitoring Harness for Ponta Delgada

problem: >
  Build a permanent climate-monitoring capability for Portugal with focus on the
  Azores. The Harness must collect real meteorological, marine, and seismo-volcanic
  data from official sources on a fixed schedule, quality-check it, archive it, and
  deliver periodic datasets and briefing reports to a meteorological research centre
  in Ponta Delgada, São Miguel, Azores.

client: A meteorological research centre in Ponta Delgada, Portugal (research staff, not developers).

goals:
  - Hourly collection of real-time observations for São Miguel and mainland Portugal reference stations.
  - Daily collection of forecasts, marine/sea-state data, UV, warnings, and Azores seismic activity.
  - Nightly batch pulls of research-grade reanalysis (historical baselines).
  - Weekly briefing report (Markdown/PDF) + monthly consolidated dataset (CSV/NetCDF) delivered to the centre.
  - Every published number traceable to its source and collection timestamp.

cadence: hourly (observations), daily (forecasts/marine/seismic), nightly (reanalysis), weekly + monthly (deliverables)
value_moves: false
public_voice: false
output_format: md
language: en

## Research notes (sources verified live 2026-07-12 — cite these, they are real)

- IPMA open data, no auth, hourly refresh, base `https://api.ipma.pt/open-data/`:
  city forecast `forecast/meteorology/cities/daily/{globalIdLocal}.json` with
  Ponta Delgada = `3420300`; station observations (last 24h)
  `observation/meteorology/stations/observations.json` — São Miguel stations
  `1200512` Ponta Delgada Aerodrome (active), `1210513` Obs. A. Chaves (fallback),
  `1210932` Nordeste; seismic `observation/seismic/3.json` (idArea 3 = Azores);
  sea state `forecast/oceanography/daily/hp-daily-sea-forecast-day{0|1|2}.json`
  with "Ponta Delgada, costa" = `3420226`; UV `forecast/meteorology/uv/uv.json`;
  warnings `forecast/warnings/warnings_www.json`. Licence: free non-commercial
  reuse with attribution. Note: IPMA daily climate CSVs are continental-only.
- Copernicus CDS ERA5 (`reanalysis-era5-single-levels`), 1940-present hourly,
  ~5-day latency, GRIB/NetCDF, free token via `cdsapi` (`$HOME/.cdsapirc`),
  async queued jobs → nightly batch. Licence CC-BY.
- Copernicus Marine (CMEMS) via `copernicusmarine` toolbox (pip, free registration,
  env vars COPERNICUSMARINE_SERVICE_USERNAME/PASSWORD) — waves, SST, physics for
  Azores waters, NetCDF/Zarr.
- Open-Meteo (no key, non-commercial): forecast `api.open-meteo.com/v1/forecast`
  (16 days hourly), historical `archive-api.open-meteo.com/v1/archive` (ERA5-based),
  marine `marine-api.open-meteo.com/v1/marine`. Third-party aggregator → backup only.
- NOAA NCEI Data Service `https://www.ncei.noaa.gov/access/services/data/v1`
  (`dataset=global-hourly`, station `08512099999` = Ponta Delgada LPPD, JSON/CSV,
  no auth) — independent observed history. NOAA NOMADS GFS grib-filter
  `nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl` for raw NWP fields (optional).
- EUMETSAT Data Store via `eumdac` (free key/secret) — Meteosat/Sentinel-3 imagery, batch.
- CIVISA/IVAR (civisa.pt, Universidade dos Açores) — authoritative seismo-volcanic
  reference for the Azores, NO public API: human-in-the-loop reference only; the
  machine-readable seismic feed is IPMA idArea 3.
