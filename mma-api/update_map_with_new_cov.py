import os
import json
import argparse

import numpy as np
from tqdm import tqdm
from dotenv import load_dotenv

from lib.mma import MmaConnection
from lib.distances import haversine_distance_coord

"""This file looks at an existing map, and a file with updates, and updates the map with new locations far from existing coverage"""

parser = argparse.ArgumentParser(
    prog="Add locations that is new coverage",
)
parser.add_argument("map_id")
parser.add_argument("--distance", type=float, required=False, default=1000)
parser.add_argument("--same-coverage-factor", type=float, required=False, default=0.5)
parser.add_argument("--group-size", type=int, required=False, default=1)

args = parser.parse_args()
load_dotenv()
TOKEN = os.environ["API_KEY"]
conn = MmaConnection(TOKEN)

with open("input/updated_cov.json", "r") as fp:
    new_locs = json.load(fp)["customCoordinates"]

existing_locs = conn.get_map_locations(args.map_id)
assert len(existing_locs) > 0, "No existing locations"
print(f"Checking for {len(new_locs)} new locations")

# Speed up calculations
lat_lngs = np.zeros((2, len(existing_locs)))
for i, old_coord in enumerate(existing_locs):
    lat_lngs[0, i] = old_coord["location"]["lat"]
    lat_lngs[1, i] = old_coord["location"]["lng"]

add_locs = []
add_loc_latlngs = np.empty((2, 0))
for loc in tqdm(new_locs):
    lat, lng = loc["lat"], loc["lng"]

    # Check distance from existing locations
    d_existing = haversine_distance_coord(lat, lng, lat_lngs)
    if np.any(d_existing < args.distance):
        # Too close to an existing location → skip
        continue

    # Check distance from already-added new locations
    if add_loc_latlngs.shape[1] > 0:
        d_added = haversine_distance_coord(lat, lng, add_loc_latlngs)
        if np.any(d_added < (args.same_coverage_factor * args.distance)):
            # Too close to an already-added one → skip
            continue

    # Passed both filters — add it
    add_locs.append(loc)

    # Efficiently append coordinates (fine for modest dataset sizes)
    add_loc_latlngs = np.hstack((add_loc_latlngs, np.array([[lat], [lng]])))

print(f"Found {len(add_locs)} to add")


if args.group_size > 1:
    add_locs_old = add_locs
    add_locs = []

    for loc in add_locs_old:
        lat, lng = loc["lat"], loc["lng"]
        d_added = haversine_distance_coord(lat, lng, add_loc_latlngs)
        num_close = (d_added < 4 * args.distance).flatten().sum()
        if num_close >= args.group_size:
            add_locs.append(loc)

    print(f"After group filtering, keeping {len(add_locs)}")


if len(add_locs) > 0:
    os.makedirs("backup", exist_ok=True)
    with open("backup/update_map.json", "w+") as fp:
        json.dump(existing_locs, fp)

    with open("output/update_map.json", "w+") as fp:
        json.dump(add_locs, fp)

    # conn.add_locs_to_map(args.map_id, add_locs)
