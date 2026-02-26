import argparse
from urllib.parse import urlparse

def int_or_url(text: str) -> int:
    """Accepts '123' or 'https://map-making.app/maps/123'. Always returns the map id as int."""
    # 1. plain integer
    try:
        return int(text)
    except ValueError:
        pass

    # 2. extract id from URL path
    try:
        parsed = urlparse(text)
        if parsed.netloc == "map-making.app" and parsed.path.startswith("/maps/"):
            return int(parsed.path.split("/")[2])
    except (ValueError, IndexError):
        pass

    raise argparse.ArgumentTypeError(
        f"expected an integer or a map-making.app URL, got {text!r}"
    )


def add_mapid(parser):
    parser.add_argument(
    "map_id",
    type=int_or_url,
    help="map id (integer) or full URL pointing to the map"
)
