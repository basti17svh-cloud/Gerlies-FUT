# V21.321 – Return after decorative Evolution application

A successful decorative Evolution now clears the selected design/player/search/page and opens the main Evolution overview (available tab). The view scrolls to the top. Previously the success handler explicitly reselected the player and rendered the same preview.

The design, permanent untradeable status, Coin/token spending and save call are unchanged. Failed applications remain in the preview. Restoring the original design remains available by reopening the decorated player.

Validation: 25 targeted cosmetic/Evolution/SBC tests passed, including successful Coin and Champions token applications, cleared selection, repeated apply without spending, and insufficient Coins keeping the preview. Isolated Chromium checks cover the real apply button, returning to the main overview and reopening decorative designs at 360/390/412 pixels. No real account inventory was used.
