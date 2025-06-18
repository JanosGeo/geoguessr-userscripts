import os
import json
import argparse

"""This script combines several maps into one map. Used to combine subdivision maps into complete maps."""

from dotenv import load_dotenv
from lib.mma import MmaConnection

load_dotenv()

parser = argparse.ArgumentParser(
    prog="Combine maps",
)
parser.add_argument("config")
args = parser.parse_args()

with open(f"combinations/{args.config}.json") as fp:
    config = json.load(fp)

TOKEN = os.environ["API_KEY"]
conn = MmaConnection(TOKEN)
maps = conn.get_maps()

locs = []
existing_locs = []
edit_map_id = None
for map in maps:
    if (
        map.get("folder") == config["folder"]
        and map["name"] not in config["ignore"]
        and map["archivedAt"] is None
    ):
        # Get all locations
        map_locs = conn.get_map_locations(map["id"])
        if map["name"] == config["edit_map_name"]:
            edit_map_id = map["id"]
            existing_locs = map_locs
        else:
            locs.extend(map_locs)

assert edit_map_id is not None

with open("data.json", "w") as fp:
    json.dump(locs, fp, indent=4)

with open("existing.json", "w") as fp:
    json.dump(existing_locs, fp, indent=4)

# Find new locs
existing_keys = [(v["panoId"], *v["tags"]) for v in existing_locs]
new_keys = [(v["panoId"], *v["tags"]) for v in locs]

new_locs = []
for loc, key_ in zip(locs, new_keys):
    if key_ not in existing_keys:
        new_locs.append(loc)

print(f"Found {len(new_locs)} locations to add")

# Find locs to remove
remove_locs = []
for loc, key_ in zip(existing_locs, existing_keys):
    if key_ not in new_keys and not any(("anki" in tag for tag in loc["tags"])):
        remove_locs.append(loc)

print(f"Found {len(remove_locs)} locations to remove")

if True:
    conn.remove_locs_from_map(edit_map_id, remove_locs)
    conn.add_locs_to_map(edit_map_id, new_locs)
