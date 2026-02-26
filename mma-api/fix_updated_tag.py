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
from lib.get_adjecent_panos import get_adjacent_panos
from lib.get_pano_date import get_pano_date
from lib.get_lat_lng import get_pano_lat_lng
from lib.argparser import add_mapid

parser = argparse.ArgumentParser(
    prog="Fix locations tagged as updated. Remember to give the tags YY-MM tags before running this script",
)
add_mapid(parser)

def pprint(obj):
    print(json.dumps(obj, indent=2))

args = parser.parse_args()
load_dotenv()
TOKEN = os.environ["API_KEY"]
conn = MmaConnection(TOKEN)

existing_locs = conn.get_map_locations(args.map_id)
assert len(existing_locs) > 0, "No existing locations"

def try_to_find_old_or_newer_coverage(loc, year_tag, month_tag):
    pano_id = loc["panoId"]
    adjacent = get_adjacent_panos(pano_id)
    ret = None
    ret_year, ret_month = int(year_tag), int(month_tag)
    found_newer = False
    
    for sp in itertools.chain([adjacent["current"]], adjacent["history"], adjacent["spatial"]):
        if sp is None:
            continue
        if found_newer and sp["date"] is None:
            continue # Don't fetch any more dates if we already found new coverage
        
        pano_date = sp["date"] or get_pano_date(sp["pano_id"])
        if pano_date is None:
            continue
        pano_year, pano_month = map(int, pano_date.split("-"))
        if (pano_year, pano_month) >= (ret_year, ret_month):
            ret = sp
            ret_year = pano_year
            ret_month = pano_month
            if (pano_year, pano_month) > (ret_year, ret_month):
                found_newer = True
    return None if ret is None else (ret["pano_id"], str(ret_year), str(ret_month).zfill(2), f"{str(ret_year)[2:]}-{str(ret_month)}")

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


def on_loc_updated(loc, yymm_tag):
    LOG["Found update, removing tags"] += 1
    add_loc = copy.deepcopy(loc)
    add_loc["tags"] = ["NEW", *tag.split_yymm_tag([yymm_tag])]
    add_locs.append(add_loc)
    remove_locs.append(loc)


check_locs = [loc for loc in existing_locs if "Updated" in loc.get("tags", [])]

for loc in tqdm.tqdm(check_locs):
    pano_id = loc.get("panoId")
    if pano_id is None:
        LOG["ERROR: No panoId found for location"] += 1
        on_error(loc)
        continue
    tags = loc.get("tags", [])

    year_tag = tag.extract_year_tag(tags)
    month_tag = tag.extract_month_tag(tags)
    if ret := tag.split_yymm_tag(tags):
        yymm_tag, updated_year_tag, updated_month_tag = ret
    else:
        on_error(loc)
        LOG["ERROR: No YY-MM found for location"] += 1
        continue

    if year_tag is None or month_tag is None:
        on_error(loc)
        LOG["ERROR: No year/month tag found for location"] += 1
        continue

    if (year_tag, month_tag) == (updated_year_tag, updated_month_tag):
        LOG["False update"] += 1
        add_loc = copy.deepcopy(loc)
        tags.remove(yymm_tag)
        tags.remove("Updated")
        add_loc["tags"] = tags
        add_locs.append(add_loc)
        remove_locs.append(loc)
        continue

    elif abs(int(year_tag) * 12 + int(month_tag) - (int(updated_year_tag) * 12 + int(updated_month_tag))) < 2:
        LOG["Possible false update"] += 1
        on_review(loc)
        continue

    elif (year_tag, month_tag) < (updated_year_tag, updated_month_tag):
        on_loc_updated(loc, yymm_tag)
    elif (year_tag, month_tag) > (updated_year_tag, updated_month_tag):
        new_loc = try_to_find_old_or_newer_coverage(loc, year_tag, month_tag)
        if new_loc is not None:
            new_pano_id, new_year, new_month, new_yymm_tag = new_loc
            assert new_pano_id is not None, new_loc
            add_loc = copy.deepcopy(loc)
            add_loc["panoId"] = new_pano_id
            try:
                lat, lng = get_pano_lat_lng(new_pano_id)
            except ValueError:
                on_error(loc)
                LOG["ERROR: Could not get lat/lng for pano"] += 1
                continue
            add_loc["lat"] = lat
            add_loc["lng"] = lng
            tags = loc["tags"]

            if yymm_tag == new_yymm_tag:
                tags.remove(yymm_tag)
                tags.remove("Updated")
                LOG["Found old coverage"] += 1
            elif (new_year, new_month) == (new_year, new_month):
                LOG["False update after searching for new coverage"] += 1
                tags.remove(yymm_tag)
                tags.remove("Updated")
            else:
                LOG["Found even newer coverage"] += 1
                assert new_year is not None
                assert new_month is not None
                assert new_yymm_tag is not None
                assert new_pano_id is not None
                tags = ["EVENNEWER", new_year, new_month, new_yymm_tag]
            
            add_loc["tags"] = tags
            add_locs.append(add_loc)
            remove_locs.append(loc)

print("The following fixes were applied:")
for k, v in LOG.items():
    print(f"{k}: {v}")

if True:
    conn.remove_locs_from_map(args.map_id, remove_locs)
    conn.add_locs_to_map(args.map_id, add_locs)
