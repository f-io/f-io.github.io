# f-io.github.io

Public landing page and project index for f-io.

This repository hosts the source for https://f-io.github.io and provides
a minimal overview the public projects, ranked by GitHub stars.

## What is in this repo

- `index.html`, `styles.css`, `app.js` – static landing page
- `projects.json` – generated list of repositories
- `scripts/update-projects.mjs` – fetches GitHub repo metadata
- `.github/workflows/update-projects.yml` – monthly update job

## How the project list is generated

A GitHub Action runs once per month and updates `projects.json`
by querying the GitHub API and sorting repositories by star count.
The website itself is fully static and does not call the GitHub API at runtime.