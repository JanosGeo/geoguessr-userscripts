import requests


def get_pano_date(pano_id: str, region: str = "US",
                             language: str = "en"):
    """
    Fetch Street View pano metadata date using the internal MapsJs RPC endpoint.

    Args:
        pano_id (str): The Street View panorama ID.
        region (str): Region code (default: "US").
        language (str): Language code (default: "en").

    Returns:
        str | None: Pano date in "YYYY-MM" format if found, else None.
    """

    url = (
        "https://maps.googleapis.com/"
        "$rpc/google.internal.maps.mapsjs.v1."
        "MapsJsInternalService/GetMetadata"
    )

    # Determine pano type
    pano_type = 10 if pano_id.startswith("CIHM") else 2

    payload = [
        ["apiv3", None, None, None, region,
         None, None, None, None, None, [[0]]],
        [language, region],
        [[[pano_type, pano_id]]],
        [[1, 2, 3, 4, 8, 6]]
    ]

    headers = {
        "Content-Type": "application/json+protobuf",
        "X-User-Agent": "grpc-web-javascript/0.1",
    }

    response = requests.post(url, json=payload, headers=headers, timeout=15)
    response.raise_for_status()

    data = response.json()

    # The response is deeply nested and undocumented.
    # Date is typically stored as [year, month] somewhere inside.
    # We search recursively for something that looks like [YYYY, M].

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
        year, month = date_pair
        return f"{year:04d}-{month:02d}"

    return None

