import os
import json
import re
import argparse
import copy

"""This script uses two reference points, and pans all locations from the panning in the reference, to the panning for the 'aligned' pano.

Usage is to investigate certain car meta behavior. For instance
- Starting from panning straight forwards, pan to a specific smudge that is always on the same place relative to the camera
- Starting from panning straight back, pan to the gen3-antenna, or the truck antenna in some country, or to the box in senegal etc.
"""

from dotenv import load_dotenv
from lib.mma import MmaConnection

load_dotenv()

parser = argparse.ArgumentParser(
    prog="Pan all locations according to a reference location. Useful for i.e. mapping smudges.",
)
parser.add_argument("map_id")
parser.add_argument("aligned")
parser.add_argument("--reference", default="REF", required=False)

args = parser.parse_args()
map_id = int(args.map_id)
TOKEN = os.environ["API_KEY"]
conn = MmaConnection(TOKEN)
maps = conn.get_maps()

existing_locs = []
for map in maps:
    if map.get("id") == map_id:
        existing_locs = conn.get_map_locations(map["id"])

with open("pan_to_loc_before.json", "w") as fp:
    json.dump(existing_locs, fp, indent=4)

# Find the locs to determine the angles for panning
ref_loc = None
aligned_loc = None
remove_locs = []
for loc in existing_locs:
    if args.reference in loc["tags"]:
        assert ref_loc is None, "Only one reference loc allowed"
        ref_loc = loc
    if args.aligned in loc["tags"]:
        assert aligned_loc is None, "Only one reference loc allowed"
        aligned_loc = loc
    else:
        remove_locs.append(loc)

print(aligned_loc)
print(ref_loc)

heading_delta = aligned_loc["heading"] - ref_loc["heading"]
pitch_delta = aligned_loc["pitch"] - ref_loc["pitch"]
zoom = aligned_loc["zoom"]

adjusted_locs = []
for loc in remove_locs:
    loc["heading"] += heading_delta
    if loc["heading"] < 0:
        loc["heading"] += 360
    elif loc["heading"] >= 360:
        loc["heading"] -= 360
    loc["pitch"] += pitch_delta
    loc["zoom"] = zoom
    adjusted_locs.append(loc)

if True:
    conn.remove_locs_from_map(map_id, remove_locs)
    conn.add_locs_to_map(map_id, adjusted_locs)
