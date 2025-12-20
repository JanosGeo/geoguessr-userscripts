import os
import json
import argparse

import numpy as np
from tqdm import tqdm
from dotenv import load_dotenv
import plotly.graph_objects as go

from lib.mma import MmaConnection
from lib.distances import haversine_distance_coord

"""This file plots the nearest neighbor for each location in a map in a histogram"""

parser = argparse.ArgumentParser(
    prog="Plot neighbor distance as a histogram",
)
parser.add_argument("map_id")
parser.add_argument(
    "-t",
    "--tags",
    nargs="*",
    help="If provided, only locations that include any of these tags will be changed",
)

args = parser.parse_args()
load_dotenv()
TOKEN = os.environ["API_KEY"]
conn = MmaConnection(TOKEN)

existing_locs = conn.get_map_locations(args.map_id)

if args.tags:
    existing_locs = [
        loc for loc in existing_locs if any((t in args.tags for t in loc.tags))
    ]

assert len(existing_locs) > 0, "No existing locations"
print(f"Calculating distances for {len(existing_locs)} locations")

# Speed up calculations
lat_lngs = np.zeros((2, len(existing_locs)))
for i, old_coord in enumerate(existing_locs):
    lat_lngs[0, i] = old_coord["location"]["lat"]
    lat_lngs[1, i] = old_coord["location"]["lng"]

distances = []
for loc in tqdm(existing_locs):
    lat, lng = loc["location"]["lat"], loc["location"]["lng"]

    # Check distance from existing locations
    d_existing = haversine_distance_coord(lat, lng, lat_lngs)
    mask = np.abs(d_existing) > 1e-1
    distances.append(np.min(d_existing[mask]))

assert len(distances) > 0

fig = go.Figure(data=[go.Histogram(x=distances)])
fig.show()
