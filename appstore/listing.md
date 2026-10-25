# App Store listing

Text to paste into App Store Connect. The limits Apple sets are in brackets; `node appstore/check.js` counts each field against them.

## App name [30]

Art History: Painting Puzzles

The name must be unique on the App Store, and plain "Art History" is likely taken. The name under the icon on the iPad stays "Art History" (`appName` in `capacitor.config.json`).

## Subtitle [30]

Jigsaws of the great paintings

## Promotional text [170]

921 paintings and treasures, from Monet's water lilies back to ancient Egypt. Solve each artist's pictures one by one, then read the story behind each painting.

## Keywords [100]

jigsaw,puzzle,painting,museum,masterpiece,monet,impressionism,renaissance,classical,culture,relax

## Description [4000]

Piece together the great paintings of the world, one artist at a time.

Art History turns 921 paintings and treasures into jigsaw puzzles, from Monet's gardens and Degas's dancers to the Pre-Raphaelites, the Old Masters, and the art of ancient Egypt, Greece and Rome. Every picture is a public-domain work from museums such as the National Gallery of Art, the Metropolitan Museum of Art and the Art Institute of Chicago.

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
The paintings come in three collections, Collection 1, Collection 2 and Collection 3. The first 10 Monet puzzles are free. Unlock each collection with a one-time purchase, or all three together for less. Purchases are restored on your other devices with Restore purchases.

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

© 2026 (your name or company). The paintings are in the public domain.
