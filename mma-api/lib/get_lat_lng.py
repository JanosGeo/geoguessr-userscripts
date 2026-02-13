import requests
from typing import Tuple


def get_pano_lat_lng(
    pano_id: str,
    region: str = "US",
    language: str = "en",
) -> Tuple[float, float]:
    """
    Fetch latitude and longitude for a Street View pano ID.

    Returns:
        (latitude, longitude)

    Raises:
        ValueError if coordinates cannot be extracted.
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

    try:
        core = data[1][0][5][0]
        lat = core[1][0][2]
        lng = core[1][0][3]
        return float(lat), float(lng)

    except (IndexError, TypeError):
        raise ValueError("Could not extract latitude/longitude")