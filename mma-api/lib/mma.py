import requests
import json


class MmaConnection:

    def __init__(self, token):
        self._session = requests.Session()
        self._session.headers.update(
            {
                "Content-Type": "application/json",
                "Authorization": "API {}".format(token),
            }
        )

    def get_maps(self):
        maps_req = self._session.get("https://map-making.app/api/maps")
        assert maps_req.status_code == 200, maps_req.text
        return maps_req.json()

    def get_map_locations(self, map_id):
        locs_req = self._session.get(
            f"https://map-making.app/api/maps/{map_id}/locations"
        )
        assert locs_req.status_code == 200, locs_req.text
        return locs_req.json()

    def add_locs_to_map(self, map_id, locations):
        UnicodeTranslateError = f"https://map-making.app/api/maps/{map_id}/locations"
        req = self._session.post(
            UnicodeTranslateError,
            headers={"Content-Type": "application/json"},
            data=json.dumps(
                [[{"action": {"type": 0}, "create": locations, "remove": []}]]
            ),
        )
        assert req.status_code == 200, req.text
    def remove_locs_from_map(self, map_id, locations):
        UnicodeTranslateError = f"https://map-making.app/api/maps/{map_id}/locations"
        req = self._session.post(
            UnicodeTranslateError,
            headers={"Content-Type": "application/json"},
            data=json.dumps(
                [
                    [
                        {
                            "action": {"type": 2},
                            "create": [],
                            "remove": [loc["id"] for loc in locations],
                        }
                    ]
                ]
            ),
        )
        assert req.status_code == 200, req.text
