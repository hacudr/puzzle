# App Store listing

Text to paste into App Store Connect. The limits Apple sets are in brackets; `node appstore/check.js` counts each field against them.

## App name [30]

Art History Puzzles

This is the name registered in App Store Connect, since plain "Art History" was taken. The name under the icon on the iPad stays "Art History" (`appName` in `capacitor.config.json`).

## Subtitle [30]

Jigsaws of the great paintings

## Promotional text [170]

921 paintings and treasures, from Monet's water lilies back to ancient Egypt. Solve each artist's pictures one by one, then read the story behind each painting.

## Keywords [100]

jigsaw,puzzle,painting,museum,masterpiece,monet,impressionism,renaissance,classical,culture,relax

## Description [4000]

Piece together the great paintings of the world, one artist at a time.

Art History Puzzles turns 921 paintings and treasures into jigsaw puzzles, from Monet's gardens and Degas's dancers to the Pre-Raphaelites, the Old Masters, and the art of ancient Egypt, Greece and Rome. Every picture is a public-domain work from museums such as the National Gallery of Art, the Metropolitan Museum of Art and the Art Institute of Chicago.

ONE ARTIST AT A TIME
Each artist is a chapter. Their pictures are revealed one by one, the next shown only as a blur of its colours until you get there. Finish an artist's chapter and the gold leaf falls.

HUNG IN A GILT FRAME
A solved painting hangs in a carved gilt frame. Spread two fingers to look closely at the brushwork, and swipe through everything you have finished.

THE STORY BEHIND THE PICTURE
Tap a finished painting to read its wall card: the myth, scripture, history or poem behind it, or the story of the picture itself.

MUSIC TO FINISH ON
Each puzzle ends on a few bars of classical music, among them Debussy, Satie, Handel and Fauré, chosen to suit the picture.

PLAY YOUR WAY
• Five difficulties, from 10 pieces to about 200
• Expert: solve the picture in black and white, with no reference picture
• Pick up where you left off: the app opens on your next puzzle
• Kids mode, and settings to hide nudity, violence or frightening subjects
• Larger text and a choice of themes and frames
• Plays offline, with no ads, no account and no tracking

THREE COLLECTIONS
The paintings come in three collections, Collection 1, Collection 2 and Collection 3. The first 10 Monet puzzles are free. Unlock each collection with a one-time purchase, or all three at once. Purchases are restored on your other devices with Restore purchases.

## Category

Primary: Games › Puzzle. Secondary: Education.

## URLs

- Privacy policy: https://hacudr.github.io/puzzle/privacy.html
- Support URL: the same page will do, as it has the contact address, or a support page of its own.

## In-app purchases

All four are Non-Consumable. Display name [30] and description [45] as in `ios/App/Products.storekit`. The store names no collection and gives no count of its artists or puzzles, as the app does, so that pictures can move between collections freely:

| Product ID | Display name | Description | Price |
|---|---|---|---|
| com.hacudr.arthistory.collection1 | Collection 1 | Unlocks every puzzle in Collection 1 | $4.99 |
| com.hacudr.arthistory.collection2 | Collection 2 | Unlocks every puzzle in Collection 2 | $4.99 |
| com.hacudr.arthistory.collection3 | Collection 3 | Unlocks every puzzle in Collection 3 | $4.99 |
| com.hacudr.arthistory.all | All Collections | Unlocks all three collections | $12.99 |

Each needs a screenshot of the pay screen for Apple's review.

## Screenshots

PNG, up to 10 per device. iPhone: `screenshots/iphone/`, 1290 × 2796 (Apple's 6.9" size, which it scales down for smaller iPhones), in the order to upload them, the first three being the ones shown in search: the solved picture in its frame, the splash, the Gallery, Collection 1, the wall card, Monet's page, Kids mode, Settings. They were made from copies 924 × 2000 the user sent from an iPhone (kept in `screenshots/iphone/received/`), enlarged and sharpened a little (ffmpeg's `unsharp=5:5:0.8`). iPad: `screenshots/ipad/`, 13" size, 2064 × 2752 (the last, the solved Heart of the Andes, landscape at 2752 × 2064), in upload order: the solved picture in its frame, the splash, the Gallery, a puzzle half done, a 100-piece puzzle, the wall card, the close look, an artist's bio, Up next, the landscape solved picture. Ten chosen from nineteen the user sent from an iPad at 1390 × 2000 (kept in `screenshots/ipad/received/`), a narrower shape than 3:4: the screens with a plain ground were widened by carrying their edge colour outwards, the splash and the close look cropped a little top and bottom, and all enlarged and sharpened as the iPhone ones were. Heart of the Andes is by the Hudson River School, whose files have no record of where they came from yet (see the rights list in CLAUDE.md); it is kept at the user's wish, but that record is still to be settled before the listing goes live.

## App Privacy

Data Not Collected. Answer "No" to "Do you or your third-party partners collect data from this app?"

## Age rating

Answers to the questionnaire, as the pictures stand. Apple works out the rating from them, likely 13+:

- Sexual Content or Nudity: Infrequent/Mild (classical nudes, Madonna and Child)
- Realistic Violence: Infrequent/Mild (battles, martyrdoms, myths)
- Horror/Fear Themes: Infrequent/Mild (skulls, monsters)
- Mature or Suggestive Themes: Infrequent/Mild (stories that refer to rape, such as Lucretia)
- Everything else: None. No web access, chat, gambling or user-made content.

Don't put the app in the Kids category: its rules forbid links out and purchases outside a parental gate.

## Notes for App Review

No sign-in is needed. The first collection's card and Claude Monet's first 10 puzzles are free. Tapping any grey (locked) artist or collection opens the pay screen, where collections can be bought one by one or all three together, and Restore purchases is on that screen and at the foot of Settings. All pictures are public-domain works; their sources are recorded with the app's files, and the licences that ask for credit are credited under Settings › Sources & Credits.

## Copyright line

© 2026 H.C. Dreher
