"""Refresh FC 27 skills/feet from EA ratings and physical stats from the roster CSV.

Run from the repository root: python3 scripts/update-player-traits.py
Only player IDs and four gameplay fields are stored; names and artwork stay in
the existing roster. Failed or incomplete downloads never replace the checked-in file.
"""

import concurrent.futures
import csv
import datetime
import http.client
import io
import json
import pathlib
import time
import urllib.parse
import urllib.request


ROOT = pathlib.Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "assets" / "player-traits.json"
API = "https://drop-api.ea.com/rating/ea-sports-fc"
ROSTER = "https://raw.githubusercontent.com/mzafram2001/ea-fc/main/data/dataset_ea_fc_27.csv"
PAGE_SIZE = 100


def request_page(gender, offset):
    query = urllib.parse.urlencode(
        {"locale": "en", "gender": gender, "limit": PAGE_SIZE, "offset": offset}
    )
    for attempt in range(5):
        try:
            with urllib.request.urlopen(f"{API}?{query}", timeout=25) as response:
                return json.load(response)
        except (OSError, ValueError, http.client.IncompleteRead):
            if attempt == 4:
                raise
            time.sleep(min(2 ** attempt, 8))


def official_stars(value):
    try:
        number = int(value)
    except (TypeError, ValueError):
        return 0
    return number if 1 <= number <= 5 else 0


def main():
    first = {gender: request_page(gender, 0) for gender in (0, 1)}
    totals = {gender: int(data["totalItems"]) for gender, data in first.items()}
    if totals[0] < 10000 or totals[1] < 1000:
        raise ValueError(f"Incomplete EA ratings response: {totals}")

    work = [
        (gender, offset)
        for gender, total in totals.items()
        for offset in range(PAGE_SIZE, total, PAGE_SIZE)
    ]
    pages = list(first.values())
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(request_page, *args): args for args in work}
        for future in concurrent.futures.as_completed(futures):
            page = future.result()
            gender, offset = futures[future]
            expected = min(PAGE_SIZE, totals[gender] - offset)
            if len(page.get("items", [])) != expected:
                raise ValueError(f"Incomplete page at gender={gender}, offset={offset}")
            pages.append(page)

    traits = {}
    for page in pages:
        for player in page["items"]:
            player_id = str(player.get("id", ""))
            skills = official_stars(player.get("skillMoves"))
            weak_foot = official_stars(player.get("weakFootAbility"))
            foot = int(player.get("preferredFoot") or 0)
            if player_id.isdecimal() and skills and weak_foot and foot in (1, 2):
                traits[player_id] = [skills, weak_foot, foot, 0]

    official_count = len(traits)
    if official_count < (totals[0] + totals[1]) * .95:
        raise ValueError(f"Too few complete player traits: {len(traits)} of {sum(totals.values())}")
    for attempt in range(4):
        try:
            with urllib.request.urlopen(ROSTER, timeout=90) as response:
                roster_bytes = response.read()
            break
        except (OSError, http.client.IncompleteRead):
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)
    roster = csv.DictReader(io.StringIO(roster_bytes.decode("utf-8-sig")))
    physical_count = 0
    for player in roster:
        player_id = str(player.get("sofifa_id", ""))
        try:
            physical = int(player.get("physical") or 0)
        except ValueError:
            continue
        if not player_id.isdecimal() or not 20 <= physical <= 99:
            continue
        foot_name = str(player.get("preferred_foot") or "").lower()
        foot = 2 if foot_name == "left" else 1 if foot_name == "right" else 0
        traits.setdefault(player_id, [0, 0, foot, 0])[3] = physical
        physical_count += 1
    if physical_count < 18000:
        raise ValueError(f"Too few physical ratings in source roster: {physical_count}")
    payload = {
        "date": datetime.date.today().isoformat(),
        "fields": ["skillMoves", "weakFoot", "preferredFoot", "physical"],
        "players": dict(sorted(traits.items(), key=lambda pair: int(pair[0]))),
    }
    temporary = OUTPUT.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    temporary.replace(OUTPUT)
    print(f"Updated {official_count} EA skill profiles and {physical_count} roster physical ratings in {OUTPUT}")


if __name__ == "__main__":
    main()
