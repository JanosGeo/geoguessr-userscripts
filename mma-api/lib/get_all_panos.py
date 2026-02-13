import requests
from typing import List, Dict, Optional


def get_all_panos(
    pano_id: str,
    region: str = "US",
    language: str = "en",
) -> List[Dict]:
    """
    Fetch all panoramas at the same location (different dates)
    using a single RPC request.

    Returns:
        [
            {
                "pano_id": str,
                "date": "YYYY-MM",
                "lat": float,
                "lng": float
            }
        ]
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

    results = []

    try:
        core = data[1][0][5][0]

        # Current pano ID
        current_pano_id = data[1][0][1][1]

        # Lat/Lng
        lat = core[1][0][2]
        lng = core[1][0][3]

        # Nodes list
        nodes = core[3][0]

        # History links (nodeIndex, [year, month])
        history_links = core[8] or []

        # --- Extract current pano date ---
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

        base_date_pair = find_date(data)
        if base_date_pair:
            year, month = base_date_pair
            results.append({
                "pano_id": current_pano_id,
                "date": f"{year:04d}-{month:02d}",
                "lat": lat,
                "lng": lng,
            })

        # --- Extract historical panos ---
        for hist in history_links:
            node_idx = hist[0]
            year, month = hist[1]

            hist_pano_id = nodes[node_idx][0][1]

            results.append({
                "pano_id": hist_pano_id,
                "date": f"{year:04d}-{month:02d}",
                "lat": lat,
                "lng": lng,
            })

    except (IndexError, TypeError):
        pass

    # Remove duplicates (sometimes current pano appears in history)
    unique = {r["pano_id"]: r for r in results}
    results = list(unique.values())

    # Sort chronologically
    results.sort(key=lambda x: x["date"])

    return results
