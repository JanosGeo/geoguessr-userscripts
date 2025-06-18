import os
import json
import argparse

import numpy as np
from tqdm import tqdm
from dotenv import load_dotenv

from lib.mma import MmaConnection
from lib.distances import haversine_distance_coord

"""This file looks at an existing map, and a file with updates, and removes locations in the original map"""

parser = argparse.ArgumentParser(
    prog="Remove locations that have had updated coverage",
)
parser.add_argument("map_id")
parser.add_argument("--distance", required=False, default=1000)

args = parser.parse_args()
load_dotenv()
TOKEN = os.environ["API_KEY"]
conn = MmaConnection(TOKEN)

with open("input/updated_cov.json", "r") as fp:
    new_locs = json.load(fp)["customCoordinates"]

existing_locs = conn.get_map_locations(args.map_id)
print(f"Checking for {len(new_locs)} new locations")

# Speed up calculations
lat_lngs = np.zeros((2, len(existing_locs)))
for i, old_coord in enumerate(existing_locs):
    lat_lngs[0, i] = old_coord["location"]["lat"]
    lat_lngs[1, i] = old_coord["location"]["lng"]

remove_locs = {}
for new_coord in tqdm(new_locs):
    d = haversine_distance_coord(new_coord["lat"], new_coord["lng"], lat_lngs)
    indices = np.where(d < args.distance)
    for idx in indices[0]:
        loc = existing_locs[idx]
        if loc["id"] not in remove_locs:
            remove_locs[loc["id"]] = loc

print(f"Found {len(remove_locs)} to remove")

if len(remove_locs) > 0:
    os.makedirs("backup", exist_ok=True)
    with open("backup/update_map.json", "w+") as fp:
        json.dump(existing_locs, fp)

    conn.remove_locs_from_map(args.map_id, remove_locs.values())
