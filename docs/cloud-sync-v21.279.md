# V21.279 — simpler and reliable cloud synchronization

Normal saves no longer require file downloads or confirmations, and a manual save waits for a running background backup. The profile has one main action, Spielstand synchronisieren. It uploads a safe local continuation or lets the existing guarded automatic restore load a newer cloud continuation. Independently changed snapshots remain an explicit choice in the same comparison panel. Selecting this device preserves the old cloud snapshot in IndexedDB under cloud-before-upload, independently from the local rollback. Downloads remain optional; the old online snapshot can be exported from Additional File Backup.

Automatic synchronization is scheduled eight seconds after a successful local game save and when connectivity/focus returns. The existing periodic retry remains in place. Matches, open packs and active Pick operations retain their existing guards.

The sync point now retains a canonical content fingerprint as well as the legacy fingerprint. PostgreSQL JSONB key ordering no longer causes false content differences when the revision advances without gameplay changes. Legacy points are accepted using their existing fingerprint until safely renewed.

Online uploads and profile comparisons prefer a validated snapshot of the running game over a stale localStorage copy. This avoids uploading old coins or Champions progress after a local storage write failed. Restores check the running game again and preserve that actual device snapshot before replacement.

A Pick already acknowledged by the exact persisted server claim can be consumed in gameplay without permanently blocking future manual saves. Missing or different server claims still block replacement. Wallets, cards and independent gameplay snapshots are never added together. Account ownership, user rechecks and server compare-and-swap remain enforced.

Validation: 161 focused Node tests passed. Real Chromium profile checks passed at 360/390/768/1366 px with a mock backend, including different wallet/Champions values, both cancelled replacement paths, account mismatch, offline state and normal saving. Production account save timestamp was read for diagnosis; no production player save was replaced during development.
