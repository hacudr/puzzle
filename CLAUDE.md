# Puzzle app

A picture-puzzle web app for iPad (plain HTML/CSS/JS, no build step), hosted on GitHub Pages from `main` at https://hacudr.github.io/puzzle/.

The home page is a gallery of periods; tapping one opens a page of that period's artists, and tapping an artist opens a page of their puzzles. Each puzzle in `puzzles/puzzles.json` names its `artist`, and `puzzles/artists.json` lists the artists in the order their cards appear, each with a `note` (the italic line, such as "French, 1840–1926"), a `period` and a `cover` (one of their puzzle images). `puzzles/periods.json` lists the home page's categories in the order their cards appear, each with a `note`: Female Artists first, then the periods. A category's card shows its first artist's cover. A woman artist also carries `"also": ["Female Artists"]`, so she appears there as well as under her period. The home page can be switched from Categories to Artists, which lists every artist on a card without a picture, in the order of their surnames; the choice is remembered. The surname is the last word of the `name`; where that is wrong, as in Rembrandt van Rijn or Hudson River School, give the artist a `sort` word. Keep every category to at most 10 artists, splitting one that grows past that; an artist with no `period` lands under "Other artists".

Each time the app is opened afresh it starts on a splash: one picture filling the screen under a title card, "Welcome to Art History · Best played with music", put away with a tap. The picture is never one with a `content` tag, whatever the settings show, and each opening takes one not shown before until every such picture has had a turn. A reload in the same tab does not bring the splash back.

## When the user adds images

The user drops original pictures into `puzzles/images/` and says little more than "I added some images". Whenever there are pictures in `puzzles/images/` that are not yet in `puzzles/puzzles.json`, do all of the following for each one without being asked and without asking first:

1. **Puzzle copy** — write a web-sized copy to `puzzles/<slug>.webp` (lowercase, hyphenated name, starting with the artist's surname, as in `monet-the-japanese-footbridge.webp`), longest side at most 2048 px. That is as large as an iPad can show; anything bigger only costs download time. WebP at quality 75 is a little over half the size of the JPEG and looks the same. Never modify or delete the originals in `puzzles/images/`.

   ```bash
   ffmpeg -y -v error -i "puzzles/images/<original>" -vf "scale='if(gt(iw,ih),min(2048,iw),-2)':'if(gt(iw,ih),-2,min(2048,ih))':flags=lanczos" -c:v libwebp -quality 75 -compression_level 6 "puzzles/<slug>.webp"
   ```

2. **Thumbnail** — write a copy whose shorter side is 600 px to `puzzles/thumbs/<slug>.webp`, using exactly the same file name as the puzzle copy. (The cards are upright and crop to fill, so a wide picture needs its height, not its width, to be 600.) The collection cards load this; a missing thumbnail falls back to the full picture, which is slow on the iPad.

   ```bash
   ffmpeg -y -v error -i "puzzles/<slug>.webp" -vf "scale='if(gt(iw,ih),-2,600)':'if(gt(iw,ih),600,-2)':flags=lanczos" -c:v libwebp -quality 75 -compression_level 6 "puzzles/thumbs/<slug>.webp"
   ```

3. **Puzzle entry** — look at the picture, then add an entry to `puzzles/puzzles.json` with the same fields the existing entries use (`image`, `artist`, `name`, `scientific` for the italic line, plus any optional fields the neighbouring entries carry, such as `music`: `moonlight`, `clair`, `pathetique`, `arabesque`, `flaxen`, `reflets`, `lente`, `gondola1`, `gondola2` or `gondola3`; a puzzle without one takes the next tune in that order by its position in the list, unless its `content` has `violence` or `frightening`, when it takes the next of the stormy tunes, which are played on the lute where the others are played on the piano: `summer`, `diesirae`, `strife`, `lamentoso`, `mountainking`, `valkyries`, `baldmountain` or `newworld`; every tune ends on a few seconds of a recording kept in `music/`, whose sources and licences are in `music/CREDITS.md`). Give the entry `"effect": "sword"` if the picture shows a sword or a battle, drawn or sheathed, so that a clash of swords from `sound-effects/Sword.m4a` sounds with the ending music; a dagger, a lance or a commander's baton does not count. Give it `"effect": "gallop"` if the picture shows a horse, ridden, harnessed or loose, so that hooves from `sound-effects/Gallop.m4a` sound there instead; a horse too small to pick out does not count. A picture with both takes `"effect": ["sword", "gallop"]`. Say which titles, dates or attributions are guesses. If the artist is new, add them to `puzzles/artists.json` too.

   Give the entry a `content` list if the picture shows any of these, and leave it out otherwise: `nudity` (any visible nudity at all, including the naked infant in a Madonna and Child, cherubs and nude statues), `violence` (fighting, weapons in use, wounds, blood, killed animals, martyrdoms, abductions, menace against women, as in Susanna and the Elders, and any reference to rape, in the title or the story the picture tells, however calm the picture looks, as in Lucretia or The Feast of the Gods) and `frightening` (monsters, menacing beasts, corpses, human skulls, people in peril). Settings can hide each kind, and Kids mode hides all three, so when unsure, tag it. Say which pictures were tagged.

4. **Check** — load the gallery in the preview and confirm the artist's card is there, every card on their page shows its picture and the new puzzle opens. Tap the splash away first. Kids mode must be off for this (Settings, hold Off for three seconds), or tagged pictures will be missing.

Thumbnails are part of adding a puzzle, never a separate request. If any listed puzzle is missing its file in `puzzles/thumbs/`, generate it.

## Pulling pictures from the National Gallery of Art

`node nga.js "Claude Monet"` fetches every open-access picture by that artist from the gallery's open data into `puzzles/images/` (4096 px on the longest side, as JPEGs named ready to use as the slug) and writes `puzzles/images/<surname>.nga.json` with the gallery's title, date, medium, credit line and a description of each picture. It skips pictures already downloaded. A second word keeps to one kind of work, for an artist the gallery also holds hundreds of prints by: `node nga.js "Mary Cassatt" Painting`. Then carry out the four steps above for each one, taking titles and dates from that file rather than guessing.

## Publishing

- Push to GitHub only when the user asks. The repo is public, so everything pushed is public.
- `puzzles/images/` (originals), `dist/`, `mockups/` and `.claude/` are git-ignored on purpose.
- After a push, GitHub Pages takes a minute or two to update.

## Running locally

`node serve.js` serves the app on port 8000 (the preview uses `.claude/launch.json`).
