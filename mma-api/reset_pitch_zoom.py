import os
import json
import re
import argparse
import copy

"""This script reset pitch and zoom to zero for all locs."""

from dotenv import load_dotenv
from lib.mma import MmaConnection

load_dotenv()

parser = argparse.ArgumentParser(
    prog="Pan all locations according to a reference location. Useful for i.e. mapping smudges.",
)
parser.add_argument("map_id")

args = parser.parse_args()
map_id = int(args.map_id)
TOKEN = os.environ["API_KEY"]
conn = MmaConnection(TOKEN)
maps = conn.get_maps()

existing_locs = []
for map in maps:
    if map.get("id") == map_id:
        existing_locs = conn.get_map_locations(map["id"])

with open("reset_zoom_before.json", "w") as fp:
    json.dump(existing_locs, fp, indent=4)

new_locs = []
for loc in existing_locs:
    new_loc = copy.deepcopy(loc)
    new_loc["zoom"] = 0
    new_loc["pitch"] = 0
    new_locs.append(new_loc)

if True:
    conn.remove_locs_from_map(map_id, existing_locs)
    conn.add_locs_to_map(map_id, new_locs)
