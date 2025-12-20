import os
import json
import re
import argparse
import copy

"""This script removes YY-MM tags."""

from dotenv import load_dotenv
from lib.mma import MmaConnection

load_dotenv()

parser = argparse.ArgumentParser(
    prog="Remove month tags",
)
parser.add_argument("map_id")
parser.add_argument(
    "-t",
    "--tags",
    nargs="*",
    help="If provided, only locations that include any of these tags will be changed",
)
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

with open("backup/remove_month_tags_before.json", "w") as fp:
    json.dump(locs, fp, indent=4)


def process_tags(tag_list):
    yy_m_mm_pattern = re.compile(r"^\d{2}-\d{1,2}$")
    found = False
    processed_tags = []
    for tag in tag_list:
        match = yy_m_mm_pattern.match(tag)
        if isinstance(tag, str) and match:
            found = True
        else:
            processed_tags.append(tag)
    return found, processed_tags


new_locs = []
remove_locs = []

for loc in existing_locs:
    if args.tags is not None and not any((t in args.tags for t in loc["tags"])):
        continue
    found, tags = process_tags(loc["tags"])
    if found:
        new_loc = copy.deepcopy(loc)
        new_loc["tags"] = tags
        new_locs.append(new_loc)
        remove_locs.append(loc)

print(f"Adding {len(new_locs)} and removing {len(remove_locs)}")

if True:
    conn.remove_locs_from_map(map_id, remove_locs)
    conn.add_locs_to_map(map_id, new_locs)
