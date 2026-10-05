# POTM item-score verification — 5 October 2026

The former calculation used only the OVR base table for every item. Normal
cards were correct; campaign/TOTW items and Icons lost their rarity contribution.

EA's launch update confirms that OVR, item rarity and holographic status determine
the score, with bonuses stacking. It does not publish numeric rarity multipliers
in its text:
https://www.ea.com/games/ea-sports-fc/fc-27/news/pitch-notes-fc27-launch-update

The live FUTBIN database supplies the numeric observations below. Multipliers
are inferred from these item scores, rather than presented as a quoted EA rule:
https://www.futbin.com/27/squad-building-challenges/cheapest-item-score

| Item | Base OVR score | Observed item score |
| --- | ---: | ---: |
| 84 normal gold | 830 | 830 |
| 85 normal gold | 2,100 | 2,100 |
| 86 TOTW | 4,100 | 5,125 |
| 87 Destined for Glory / TOTW / Base Hero | 5,500 | 6,875 |
| 94 Icon | 30,000 | 45,000 |

Exact database score filters:
- https://www.futbin.com/27/players?eUnt=1&item_score=5125-5125&order=asc&ps_price=200%2B&sort=ps_price
- https://www.futbin.com/27/players?eUnt=1&item_score=6875-6875&order=asc&ps_price=200%2B&sort=ps_price
- https://www.futbin.com/27/players?eUnt=1&item_score=45000-45000&order=asc&ps_price=200%2B&sort=ps_price

Footera applies ×1.25 to its `special` campaign/TOTW items and ×1.5 to its Icon
items. These Footera campaign equivalents include POTM and Momentum. The current
item rating is used; an Evolution skin does not remove the underlying rarity or
give an additional cosmetic bonus. Normal gold `rare` flags give no bonus.

Each card is rounded once to an integer before summing. FUTBIN's exact score
filter for an 86 holographic TOTW is 7,688 (4,100 ×1.25 ×1.5 = 7,687.5),
supporting nearest-integer rounding. Holographic item variants are not implemented
in Footera, so this change neither creates them nor treats artwork as holographic.

All actual item contributions (picker, review, submission and saved progress)
use the same `scoreForItem` function. The expandable OVR table explicitly lists
normal-card base scores. Previous saved progress is retained: historical saves
contain only aggregate points/counts, not the ratings/rarities of consumed cards,
so retrospective corrections cannot be reconstructed reliably.
