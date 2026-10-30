# V21.316 – Additional Weekend League Footera Points

The existing Champions rank rewards now include Footera Points:

| Rank | Wins | Additional Points |
| --- | --- | --- |
| VIII | 0–2 | 1,000 |
| VII | 3–4 | 2,000 |
| VI | 5–6 | 3,000 |
| V | 7–8 | 4,500 |
| IV | 9–10 | 6,000 |
| III | 11–12 | 8,000 |
| II | 13–14 | 10,000 |
| I | 15 | 12,000 |

Coins, packs, Player Picks, qualification CP, game limit and existing participation rules remain unchanged. No reward is generated for a weekend with zero games. Rewards already settled before the update retain their stored contents. No retroactive inventory grant is performed.

`championsRewardForWins` stores the currency in `reward.points`. The existing `row.points` still records wins. The normal claim credits the local gameplay Points balance once and persists it together with the claimed reward. Rank chips, claim labels and the reward center show the currency as “Footera Points”. A dedicated Points card uses the existing Points image. Purchased wallet balances are not modified.

## Verification

- Unit tests cover all 0–15 win outcomes: rank settlement, exact payout, no early credit, single claim, rejected second claim, save/reload persistence, unchanged qualification CP and preserved old reward snapshots.
- Actual browser with isolated local fixture: rank labels, reward modal at 360/390/412 pixels, no horizontal overflow, real claim handler, 12,000 additional Points on top of 500 existing Points, reload and repeated-claim rejection. Visual inspection confirmed the Points card and amount. External account services were blocked; no real player account was used.
- Existing reward, rank, cache and Champions tests pass. The full standard suite was rerun after integrating the latest Bronze/Silver Evolution main update.
- The weekly reward workflow now includes a dedicated browser job for the currency payout.

No database schema, real-money wallet or real user inventory was changed by this release.
