from collections import defaultdict
import os
import json
import argparse
import itertools
import copy

import tqdm
from dotenv import load_dotenv

from lib import tag
from lib.mma import MmaConnection
from lib.find_newest_coverage import process_all_async
parser = argparse.ArgumentParser(
    prog="Fix locations tagged as updated. Remember to give the tags YY-MM tags before running this script",
)

def pprint(obj):
    print(json.dumps(obj, indent=2))

parser.add_argument("map_id")
args = parser.parse_args()
load_dotenv()
TOKEN = os.environ["API_KEY"]
conn = MmaConnection(TOKEN)

existing_locs = conn.get_map_locations(args.map_id)
assert len(existing_locs) > 0, "No existing locations"

LOG = defaultdict(int)

add_locs = []
remove_locs = []

def on_add_tag(loc, tag):
    nl = copy.deepcopy(loc)
    if "tags" not in nl:
        nl["tags"] = []
    nl["tags"].append(tag)
    add_locs.append(nl)
    remove_locs.append(loc)

def on_error(loc):
    on_add_tag(loc, "ERROR")


def on_review(loc):
    on_add_tag(loc, "REVIEW")


results = process_all_async(existing_locs)


for loc, res in tqdm.tqdm(zip(existing_locs, results)):
    pano_id = loc.get("panoId")
    if pano_id is None:
        LOG["ERROR: No panoId found for location"] += 1
        on_error(loc)
        continue
    if res is None:
        LOG["ERROR: No data found for panoId"] += 1
        on_error(loc)
        continue
    if res["has_newer_coverage"]:
        if res["is_only_one_month_newer"]:
            LOG["Possible false update, review"] += 1
            on_review(loc)
            continue

        pprint(loc)

        LOG["Newer coverage found"] += 1
        new_yymm_tag = res["date"]
        new_pano_id = res["pano_id"]
        assert new_pano_id is not None, res
        add_loc = copy.deepcopy(loc)
        add_loc["panoId"] = new_pano_id
        add_loc["location"]["lat"] = res["lat"]
        add_loc["location"]["lng"] = res["lng"]
        yy, mm = new_yymm_tag.split("-")
        add_loc["tags"].extend([new_pano_id, "Updated", yy+ "-" + str(int(mm))])
        # tags = ["Updated", f"20{yy}", mm, yy+ "-" + str(int(mm))]
        pprint(add_loc)
        add_locs.append(add_loc)
        remove_locs.append(loc)

print("The following fixes were applied:")
for k, v in LOG.items():
    print(f"{k}: {v}")

if True:
    conn.remove_locs_from_map(args.map_id, remove_locs)
    conn.add_locs_to_map(args.map_id, add_locs)
