# Puzzle app

A picture-puzzle web app for iPad (plain HTML/CSS/JS, no build step), hosted on GitHub Pages from `main` at https://hacudr.github.io/puzzle/.

## When the user adds images

The user drops original pictures into `puzzles/images/` and says little more than "I added some images". Whenever there are pictures in `puzzles/images/` that are not yet in `puzzles/puzzles.json`, do all of the following for each one without being asked and without asking first:

1. **Puzzle copy** — write a web-sized copy to `puzzles/<slug>.jpg` (lowercase, hyphenated name), longest side at most 2048 px. Never modify or delete the originals in `puzzles/images/`.

   ```bash
   ffmpeg -y -v error -i "puzzles/images/<original>" -vf "scale='if(gt(iw,ih),min(2048,iw),-2)':'if(gt(iw,ih),-2,min(2048,ih))'" -q:v 3 "puzzles/<slug>.jpg"
   ```

2. **Thumbnail** — write a 600 px wide copy to `puzzles/thumbs/<slug>.jpg`, using exactly the same file name as the puzzle copy. The collection cards load this; a missing thumbnail falls back to the full picture, which is slow on the iPad.

   ```bash
   ffmpeg -y -v error -i "puzzles/<slug>.jpg" -vf "scale=600:-2" -q:v 4 "puzzles/thumbs/<slug>.jpg"
   ```

3. **Puzzle entry** — look at the picture, then add an entry to `puzzles/puzzles.json` with the same fields the existing entries use (`image`, `name`, `scientific` for the italic line, `description`, plus any optional fields the neighbouring entries carry, such as `music`: `moonlight`, `clair` or `pathetique`). Say which titles, dates or attributions are guesses.

4. **Check** — load the collection in the preview and confirm every card shows its picture and the new puzzle opens.

Thumbnails are part of adding a puzzle, never a separate request. If any listed puzzle is missing its file in `puzzles/thumbs/`, generate it.

## Publishing

- Push to GitHub only when the user asks. The repo is public, so everything pushed is public.
- `puzzles/images/` (originals), `dist/`, `mockups/` and `.claude/` are git-ignored on purpose.
- After a push, GitHub Pages takes a minute or two to update.

## Running locally

`node serve.js` serves the app on port 8000 (the preview uses `.claude/launch.json`).
