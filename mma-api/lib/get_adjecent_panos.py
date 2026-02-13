import requests
from typing import Dict, List, Optional


def get_adjacent_panos(
    pano_id: str,
    region: str = "US",
    language: str = "en",
) -> Dict[str, List[dict]]:
    """
    Fetch adjacent panoramas.

    Includes:
    - Spatial links (walkable) → date=None
    - History links (same location) → date included
    - Current pano → included in 'current'

    Only one RPC call.
    """

    url = (
        "https://maps.googleapis.com/"
        "$rpc/google.internal.maps.mapsjs.v1."
        "MapsJsInternalService/GetMetadata"
    )

    pano_type = 10 if pano_id.startswith("CIHM") else 2

    payload = [
        ["apiv3", None, None, None, region,
         None, None, None, None, None, [[0]]],
        [language, region],
        [[[pano_type, pano_id]]],
        [[1, 2, 3, 4, 8, 6]],
    ]

    headers = {
        "Content-Type": "application/json+protobuf",
        "X-User-Agent": "grpc-web-javascript/0.1",
    }

    response = requests.post(url, json=payload, headers=headers, timeout=15)
    response.raise_for_status()
    data = response.json()

    result = {
        "current": None,
        "spatial": [],
        "history": [],
    }

    try:
        core = data[1][0][5][0]

        # Current pano ID
        current_pano_id = data[1][0][1][1]

        # Lat/Lng
        lat = core[1][0][2]
        lng = core[1][0][3]

        # Nodes list
        nodes = core[3][0]

        # Spatial links
        spatial_links = core[6] or []

        # History links
        history_links = core[8] or []

        # --- Extract base pano date ---
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

        base_date = None
        base_date_pair = find_date(data)
        if base_date_pair:
            year, month = base_date_pair
            base_date = f"{year:04d}-{month:02d}"

        result["current"] = {
            "pano_id": current_pano_id,
            "date": base_date,
            "lat": lat,
            "lng": lng,
        }

        # --- Spatial links (no date available in response) ---
        for link in spatial_links:
            node_idx = link[0]
            linked_pano_id = nodes[node_idx][0][1]

            result["spatial"].append({
                "pano_id": linked_pano_id,
                "date": None,  # Not available without extra RPC
            })

        # --- History links (date included) ---
        for hist in history_links:
            node_idx = hist[0]
            year, month = hist[1]
            linked_pano_id = nodes[node_idx][0][1]

            result["history"].append({
                "pano_id": linked_pano_id,
                "date": f"{year:04d}-{month:02d}",
            })

    except (IndexError, TypeError):
        pass

    return result