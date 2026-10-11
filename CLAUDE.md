# Puzzle app

A picture-puzzle web app for iPad (plain HTML/CSS/JS, no build step), hosted on GitHub Pages from `main` at https://hacudr.github.io/puzzle/.

The home page is a gallery of periods; tapping one opens a page of that period's artists, and tapping an artist opens a page of their puzzles. Each puzzle in `puzzles/puzzles.json` names its `artist`, and `puzzles/artists.json` lists the artists in the order their cards appear, each with a `note` (the italic line, such as "French, 1840–1926"), a `period` and a `cover` (one of their puzzle images). `puzzles/periods.json` lists the home page's categories in the order their cards appear, each with a `note`: Female Artists first, then the periods. A category's card shows its first artist's cover, unless the category names a `cover` of its own, as Female Artists does. A woman artist also carries `"also": ["Female Artists"]`, so she appears there as well as under her period. The home page can be switched from Categories to Artists, which lists every artist on a card without a picture, in the order of their surnames; the choice is remembered. The surname is the last word of the `name`; where that is wrong, as in Rembrandt van Rijn or Hudson River School, give the artist a `sort` word. Keep every category to at most 10 artists, splitting one that grows past that; an artist with no `period` lands under "Other artists".

Each time the app is opened afresh it starts on a splash: one picture filling the screen under a title card, "Welcome to Art History · Best played with music", put away with a tap. The picture is never one with a `content` tag, whatever the settings show, and each opening takes one not shown before until every such picture has had a turn. A reload in the same tab does not bring the splash back.

## Rights: everything must be fit for a paid app

The app is to be sold to users in the United States. Assume that of every file that ships with it: pictures, music, sound effects, fonts and icons. Nothing goes in unless it may be used commercially, and whatever a licence asks for by way of credit is given inside the app, not only in the repository. When the rights to something cannot be shown, leave it out and say so.

**Artwork** must be in the public domain in the United States. That means the artist died more than 70 years ago and the work was first published more than 95 years ago (before 1931, as of 2026); for an artist who died in the last hundred years, check both. A museum that releases a work as open access or CC0 has made that check already.

**The file** of a picture has rights of its own, apart from the painting's. Take only:

- a file a museum releases as CC0 or open access (the National Gallery of Art, the Met, Cleveland, the Art Institute of Chicago, the Rijksmuseum), or
- a file on Wikimedia Commons marked "Public domain" or CC0, being a plain, square-on reproduction of a flat work.

Never take a file under a licence with NC or ND in it. Do not take CC BY or CC BY-SA pictures either: the app has nowhere to credit a photographer. A photograph that shows the frame, the wall or the room, or a work that is not flat (a sculpture, a painted shield), is the photographer's own work and needs their CC0, whatever the age of the thing shown; a thin edge of frame or stretcher on a CC0 file may be cropped off in the puzzle copy. Do not download from a museum's own site when its terms forbid commercial use; they bind as a contract even where no copyright exists.

**Record the source.** Every picture has an entry in a file beside the originals, `puzzles/images/<surname>.<source>.json` (`nga`, `met`, `commons`), giving the page it came from and its licence. A picture with no such record has not been cleared.

**Italy.** Italian law asks for permission and a fee for commercial reproductions of works in Italian state collections, public domain or not. It has no force in the United States, which is one reason the app is sold there only; the Commons record marks such pictures with `italianHeritageNotice`. Raise it with the user before the app is offered in Italy or the rest of Europe.

**Music and sounds.** The composition must be in the public domain, and the recording public domain, CC0, CC BY or CC BY-SA, never NC or ND. Each recording is listed in `music/CREDITS.md` with its player, licence and source, and one under CC BY or CC BY-SA carries its `licence` in `CLIPS` in `sound.js`, so that the solved screen names who is playing. A sound effect needs the same record of where it came from.

**Fonts** must allow being bundled in a paid app (the SIL Open Font Licence does), with the licence text kept beside them.

Not yet cleared, to be settled before the app is sold:

- The pictures by Michalina Janoszanka (died 1952, so the 95-year test matters), Virginia Frances Sterrett, the Hudson River School and all but one by Artemisia Gentileschi have no record of where their files came from.
- `sound-effects/` has no record of sources or licences.
- The solved screen names the player of a licensed recording but not the licence, which CC BY and CC BY-SA ask to be named and linked. The app needs a credits page for that.
- `fonts/` has no copy of the Open Font Licence that Spectral and Averia Serif come under.

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

   Before either copy is made, be sure the picture passes the rights section above, and that its source and licence are on record. One that does not pass gets no puzzle; tell the user which and why.

3. **Puzzle entry** — look at the picture, then add an entry to `puzzles/puzzles.json` with the same fields the existing entries use (`image`, `artist`, `name`, `scientific` for the italic line, plus any optional fields the neighbouring entries carry, such as `music`: `moonlight`, `clair`, `pathetique`, `arabesque`, `flaxen`, `reflets`, `lente`, `gondola1`, `gondola2` or `gondola3`; a puzzle without one takes the next tune in that order by its position in the list, unless its `content` has `violence` or `frightening`, when it takes the next of the stormy tunes, which are played on the lute where the others are played on the piano: `summer`, `diesirae`, `strife`, `lamentoso`, `mountainking`, `valkyries`, `baldmountain` or `newworld`; every tune ends on a few seconds of a recording kept in `music/`, whose sources and licences are in `music/CREDITS.md`). Give the entry `"sacred": true` if its subject is religious: a scene from the Bible, a saint, a Madonna, a prophet. Such a picture takes the next of the sacred tunes in place of the piano ones (`kyrie` is the only one so far; any tune in `sound.js` marked `sacred` joins them), unless its `content` makes it stormy, when it keeps the stormy tunes. A church seen as a building, a churchman's portrait and a figure from myth are not religious pictures. Give the entry `"effect": "sword"` if the picture shows a sword or a battle, drawn or sheathed, so that a clash of swords from `sound-effects/Sword.m4a` sounds with the ending music; a dagger, a lance or a commander's baton does not count. Give it `"effect": "gallop"` if the picture shows a horse, ridden, harnessed or loose, so that hooves from `sound-effects/Gallop.m4a` sound there instead; a horse too small to pick out does not count. A picture with both takes `"effect": ["sword", "gallop"]`. Say which titles, dates or attributions are guesses. If the artist is new, add them to `puzzles/artists.json` too.

   Give the entry a `content` list if the picture shows any of these, and leave it out otherwise: `nudity` (any visible nudity at all, including the naked infant in a Madonna and Child, cherubs and nude statues), `violence` (fighting, weapons in use, wounds, blood, killed animals, martyrdoms, abductions, menace against women, as in Susanna and the Elders, and any reference to rape, in the title or the story the picture tells, however calm the picture looks, as in Lucretia or The Feast of the Gods) and `frightening` (monsters, menacing beasts, corpses, human skulls, people in peril). Settings can hide each kind, and Kids mode hides all three, so when unsure, tag it. Say which pictures were tagged.

4. **Check** — load the gallery in the preview and confirm the artist's card is there, every card on their page shows its picture and the new puzzle opens. Tap the splash away first. Kids mode must be off for this (Settings, hold Off for three seconds), or tagged pictures will be missing.

Thumbnails are part of adding a puzzle, never a separate request. If any listed puzzle is missing its file in `puzzles/thumbs/`, generate it.

## Pulling pictures from the National Gallery of Art

`node nga.js "Claude Monet"` fetches every open-access picture by that artist from the gallery's open data into `puzzles/images/` (4096 px on the longest side, as JPEGs named ready to use as the slug) and writes `puzzles/images/<surname>.nga.json` with the gallery's title, date, medium, credit line and a description of each picture. It skips pictures already downloaded. A second word keeps to one kind of work, for an artist the gallery also holds hundreds of prints by: `node nga.js "Mary Cassatt" Painting`. Then carry out the four steps above for each one, taking titles and dates from that file rather than guessing.

## Pulling pictures from Wikimedia Commons

For an artist whose paintings hang where there is no open-access programme, as Caravaggio's do in Italian churches and museums. Wikidata lists an artist's paintings with the Commons file of each (`wdt:P170` for the artist, `wdt:P18` for the picture, `wdt:P373` for the Commons category, which often holds a larger file); the Commons API (`prop=imageinfo&iiprop=size|extmetadata|url`) gives each file's size and, in `LicenseShortName`, its licence. Keep only files marked "Public domain" or CC0 whose longest side is at least 2048 px. Download the original, or the 3840 px rendering (`iiurlwidth=3840`) of one larger than 5000 px, into `puzzles/images/` under the slug, sending a User-Agent that names the app. Write `puzzles/images/<surname>.commons.json` with each picture's `file`, `title`, `date`, `collection`, `wikidata` id, `source` (the Commons page), `licence`, `size` and `italianHeritageNotice` (whether the page carries the Italian heritage template).

Then look at every picture before carrying out the four steps: leave out black-and-white photographs of lost paintings, files that show a frame or a room, and pictures doubtfully attributed. Commons gives no dependable titles or dates, so take the usual scholarly ones and say that they are such. Where two pictures share a title, start the italic line with the city, as in "Paris, c. 1595–1598".

## Publishing

- Push to GitHub only when the user asks. The repo is public, so everything pushed is public. The pages at GitHub are a free preview of what will be sold, so the rights section applies to them in full.
- `puzzles/images/` (originals), `dist/`, `mockups/` and `.claude/` are git-ignored on purpose.
- After a push, GitHub Pages takes a minute or two to update.

## Running locally

`node serve.js` serves the app on port 8000 (the preview uses `.claude/launch.json`).
