import math

import numpy as np


def haversine_distance(lat, lng, points: np.ndarray):
    assert points.shape[0] == 2

    R = 6371.071
    rlat1 = lat * (math.pi / 180)
    rlat2 = points[0, :] * (math.pi / 180)

    difflat = rlat2 - rlat1
    difflon = (points[1, :] - lng) * (math.pi / 180)
    km = (
        2
        * R
        * np.arcsin(
            np.sqrt(
                np.sin(difflat / 2) * np.sin(difflat / 2)
                + np.cos(rlat1)
                * np.cos(rlat2)
                * np.sin(difflon / 2)
                * np.sin(difflon / 2)
            )
        )
    )
    return km * 1000


def haversine_distance_coord(lat, lng, points: np.ndarray):
    return haversine_distance(lat, lng, points)
