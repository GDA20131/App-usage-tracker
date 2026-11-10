# App Usage Tracker

A lightweight browser app for tracking how much time you spend in different apps or tools throughout the day.

## Features

- Add apps or tools you work with
- Start and stop a timer for each app
- See current and total tracked duration for every app
- track activity across a simple productivity dashboard
- Data is saved in the browser using localStorage

## Run locally

1. Open the repository folder in your browser or serve it with a small local web server.
2. Open `index.html` directly in a browser, or run:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Project structure

- `index.html` — app layout
- `styles.css` — styling
- `script.js` — timer logic and localStorage persistence

## Notes

This app is intentionally simple and dependency-free so it works immediately in any modern browser.
