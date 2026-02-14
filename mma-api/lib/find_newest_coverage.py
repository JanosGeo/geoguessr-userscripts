from datetime import datetime
from math import radians, cos, sin, asin, sqrt
from typing import Optional, Dict

import requests

def _haversine_meters(lat1, lon1, lat2, lon2):
    R = 6371000
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    lat1 = radians(lat1)
    lat2 = radians(lat2)

    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * asin(sqrt(a))
    return R * c


def _safe_get_core(data):
    try:
        if not data or len(data) < 2:
            return None

        level1 = data[1]
        if not level1:
            return None

        level2 = level1[0]
        if len(level2) <= 5:
            return None

        level3 = level2[5]
        if not level3:
            return None

        return level3[0]
    except (IndexError, TypeError):
        return None


def _fetch_metadata(pano_id: str):
    url = (
        "https://maps.googleapis.com/"
        "$rpc/google.internal.maps.mapsjs.v1."
        "MapsJsInternalService/GetMetadata"
    )

    headers = {
        "Content-Type": "application/json+protobuf",
        "X-User-Agent": "grpc-web-javascript/0.1",
    }

    for pano_type in (2, 10):  # try both types
        payload = [
            ["apiv3", None, None, None, "US",
             None, None, None, None, None, [[0]]],
            ["en", "US"],
            [[[pano_type, pano_id]]],
            [[1, 2, 3, 4, 8, 6]],
        ]

        try:
            r = requests.post(
                url,
                json=payload,
                headers=headers,
                timeout=15
            )
            r.raise_for_status()
            data = r.json()

            if _safe_get_core(data) is not None:
                return data

        except requests.RequestException:
            continue

    return None


def _extract_date(data):
    def find_date(obj):
        if isinstance(obj, list):
            if (
                len(obj) == 2
                and isinstance(obj[0], int)
                and isinstance(obj[1], int)
                and 1900 <= obj[0] <= 2100
                and 1 <= obj[1] <= 12
            ):
                return obj
            for item in obj:
                result = find_date(item)
                if result:
                    return result
        return None

    date_pair = find_date(data)
    if date_pair:
        return datetime(date_pair[0], date_pair[1], 1)
    return None


def find_newest_pano_within_radius(
    pano_id: str,
    expected_year: str,
    expected_month: str,
    radius_m: float = 20.0
):
    """
    Find the newest pano within radius_m of the given pano.

    Spatial links are skipped if history already contains
    coverage more than 2 months newer.
    """

    try:
        reference_date = datetime(
            int(expected_year),
            int(expected_month),
            1
        )
    except ValueError:
        return None

    base_data = _fetch_metadata(pano_id)
    if base_data is None:
        return None

    core = _safe_get_core(base_data)
    if core is None:
        return None

    try:
        base_lat = core[1][0][2]
        base_lng = core[1][0][3]
        nodes = core[3][0]
        history_links = core[8] or []
        spatial_links = core[6] or []
    except (IndexError, TypeError):
        return None

    newest = {
        "pano_id": pano_id,
        "date": reference_date,
        "lat": base_lat,
        "lng": base_lng,
    }

    # --- Check history (same tripod) ---
    for hist in history_links:
        node_idx = hist[0]
        year, month = hist[1]
        candidate_date = datetime(year, month, 1)

        if candidate_date > newest["date"]:
            hist_id = nodes[node_idx][0][1]
            newest = {
                "pano_id": hist_id,
                "date": candidate_date,
                "lat": base_lat,
                "lng": base_lng,
            }

    # --- Compute month difference ---
    month_diff = (
        (newest["date"].year - reference_date.year) * 12
        + (newest["date"].month - reference_date.month)
    )

    # ✅ Skip spatial if history is > 2 months newer
    if month_diff <= 2:
        for link in spatial_links:
            node_idx = link[0]
            spatial_id = nodes[node_idx][0][1]

            spatial_data = _fetch_metadata(spatial_id)
            if spatial_data is None:
                continue

            s_core = _safe_get_core(spatial_data)
            if s_core is None:
                continue

            try:
                s_lat = s_core[1][0][2]
                s_lng = s_core[1][0][3]
            except (IndexError, TypeError):
                continue

            distance = _haversine_meters(
                base_lat, base_lng, s_lat, s_lng
            )

            if distance > radius_m:
                continue

            s_date = _extract_date(spatial_data)
            if not s_date:
                continue

            if s_date > newest["date"]:
                newest = {
                    "pano_id": spatial_id,
                    "date": s_date,
                    "lat": s_lat,
                    "lng": s_lng,
                }

    # Final evaluation
    month_diff = (
        (newest["date"].year - reference_date.year) * 12
        + (newest["date"].month - reference_date.month)
    )

    has_newer = month_diff > 0
    is_only_one_month_newer = month_diff == 1

    return {
        "pano_id": newest["pano_id"],
        "date": newest["date"].strftime("%y-%m"),
        "lat": newest["lat"],
        "lng": newest["lng"],
        "has_newer_coverage": has_newer,
        "is_only_one_month_newer": is_only_one_month_newer,
    }
