# V21.280 — compact Player Pick delivery and automatic recovery

The existing claim RPC uploaded the complete local save and returned another complete save. The affected club's synchronized JSON was approximately 2.3 MB, making a single-card delivery depend on two large transfers. After a timeout, its persistent pending selection disabled other Picks and required a manual recovery action.

The Store now uses footera_choose_player_pick_compact with only Pick ID, option ID, save ID and expected cloud revision. If local gameplay is not yet synchronized, the guarded normal save runs first. The server derives the delivered card from its fixed offer and the already synchronized cloud save, retains the existing atomic duplicate routing and CAS implementation, and returns a compact delivery receipt. Existing clients can continue using the original RPC.

A repeated confirmation returns the original selected item without another inventory insertion, even if a later legitimate cloud update has advanced the revision. The client never marks an independently newer cloud snapshot as synchronized merely because it recovered an older receipt. Account and club identity are checked before and after the request. Missing, mismatched or interrupted responses keep the accepted choice marker. Atomic ownership/selection/revision rejections clear only that marker so recovery cannot permanently lock the Store.

Listing the Store automatically resumes a pending accepted choice, without first downloading and comparing the complete cloud save. Repeated automatic attempts are limited to once per 30 seconds. Row-lock waiting in the compact server transaction is bounded to two seconds.

Validation: 167 focused Node tests passed. Real Chromium checks at 360/390/412 px passed, including a simulated server commit followed by a lost response, automatic recovery from a subsequent list with no remaining ticket, exact-once local delivery, and no complete-save fields in the claim request. The real-database integration test cloned the actual large-save shape into isolated fixtures and passed within a five-second statement timeout. It covered initial delivery, retries, a newer cloud revision, changed selection rejection, stale revision rejection and account isolation. All fixtures rolled back. No production Pick selection was changed during testing.

The database migration online/footera-player-picks-compact-v21.280.sql was applied before the frontend release. The user's already accepted pending option can resume on the next Store refresh; no player is selected on the user's behalf.
