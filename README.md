# posts

Drop-in file host served by GitHub Pages at **https://alexplk.github.io/posts/**.

Any file committed to the root of this repo is served as-is (Markdown, zips,
HTML, images, …). No build step — a `.nojekyll` file disables Jekyll so files
are served untouched.

## Publish

```bash
# Copy a file in + commit + push, in one go:
npm run publish ~/Downloads/whatever.md

# Multiple files:
npm run publish notes.md bundle.zip

# Already copied the file into this folder yourself? Just:
npm run publish

# Custom commit message (note the `--` before -m, npm requires it):
npm run publish notes.md -- -m "add release notes"
```

Each publish prints the live URL(s). Pages usually updates within a minute.

`file.md` → https://alexplk.github.io/posts/file.md
