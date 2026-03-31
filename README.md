# Viralframe presentation website

Static marketing site prepared for GitHub Pages.

## Local preview

```bash
python3 -m http.server 4174 --bind 127.0.0.1
```

Then open `http://127.0.0.1:4174`.

## GitHub Pages setup

This repo is set up to publish directly from the root of the `main` branch.

After pushing the repository to GitHub:

1. Open `Settings -> Pages`.
2. Under `Build and deployment`, set `Source` to `Deploy from a branch`.
3. Select branch `main` and folder `/(root)`.
4. Save.
5. In the same Pages screen, set the custom domain to `viralframe.xyz`.
6. Enable HTTPS after DNS has propagated.

## DNS for viralframe.xyz

For the apex domain `viralframe.xyz`, point `@` to GitHub Pages using either:

- `A` records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- or an `ALIAS`/`ANAME` record to `iosifboanca.github.io`

For `www`, create:

- `CNAME` record: `www -> iosifboanca.github.io`

Avoid wildcard DNS records.
