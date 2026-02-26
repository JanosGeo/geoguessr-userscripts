import os
import json
import re
import argparse
import copy

"""This script splits YY-MM tags into two tags, YYYY and MM."""

from dotenv import load_dotenv
from lib.mma import MmaConnection
from lib.argparser import add_mapid

load_dotenv()

parser = argparse.ArgumentParser(
    prog="Split month tags",
)
add_mapid(parser)
parser.add_argument(
    "-t",
    "--tags",
    nargs="*",
    help="If provided, only locations that include any of these tags will be changed",
)
parser.add_argument("--keep-yymm", action="store_true", help="If set, will keep the YY-MM tag as well as adding YYYY and MM tags.")

args = parser.parse_args()
map_id = int(args.map_id)
TOKEN = os.environ["API_KEY"]
conn = MmaConnection(TOKEN)
maps = conn.get_maps()
locs = []
existing_locs = []
for map in maps:
    if map.get("id") == map_id:
        existing_locs = conn.get_map_locations(map["id"])

with open("split_tags_before.json", "w") as fp:
    json.dump(locs, fp, indent=4)


def process_tags(tag_list, keep_yymm):
    processed_list = []
    yy_m_mm_pattern = re.compile(r"^\d{2}-\d{1,2}$")
    found = False
    for tag in tag_list:
        match = yy_m_mm_pattern.match(tag)
        if isinstance(tag, str) and match:
            found = True
            # Split the tag at the hyphen
            year_suffix, month_str = tag.split("-")

            # Prepend '20' to the year suffix to get the full year
            full_year = f"20{year_suffix}"

            # Pad the month with a leading zero if it's a single digit
            padded_month = month_str.zfill(2)  # zfill(2) pads with zeros until length 2

            processed_list.append(full_year)
            processed_list.append(padded_month)
            if keep_yymm:
                processed_list.append(tag)
        else:
            processed_list.append(tag)
        
    return found, list(set(processed_list))


new_locs = []
remove_locs = []

for loc in existing_locs:
    if args.tags is not None and not any((t in args.tags for t in loc["tags"])):
        continue
    found, tags = process_tags(loc["tags"], args.keep_yymm)
    if found:
        new_loc = copy.deepcopy(loc)
        new_loc["tags"] = tags
        new_locs.append(new_loc)
        remove_locs.append(loc)

print(f"Adding {len(new_locs)} and removing {len(remove_locs)}")

if True:
    conn.remove_locs_from_map(map_id, remove_locs)
    conn.add_locs_to_map(map_id, new_locs)
