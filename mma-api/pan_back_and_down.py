import os
import json
import argparse


from dotenv import load_dotenv
from lib.mma import MmaConnection

load_dotenv()

parser = argparse.ArgumentParser(
    prog="Pan all locations back and down.",
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

with open("backup/pan_back_and_down_before.json", "w") as fp:
    json.dump(existing_locs, fp, indent=4)

heading_delta = 180
pitch_delta = -10

adjusted_locs = []
for loc in existing_locs:
    loc["heading"] += heading_delta
    if loc["heading"] < 0:
        loc["heading"] += 360
    elif loc["heading"] >= 360:
        loc["heading"] -= 360
    loc["pitch"] += pitch_delta
    adjusted_locs.append(loc)

if True:
    conn.remove_locs_from_map(map_id, existing_locs)
    conn.add_locs_to_map(map_id, adjusted_locs)
