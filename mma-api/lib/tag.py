import re
from typing import List, Optional


YEAR_PATTERN = re.compile(r"^(19|20)\d{2}$")
MONTH_PATTERN = re.compile(r"^(0[1-9]|1[0-2])$")
YY_MM_PATTERN = re.compile(r"^\d{2}-\d{1,2}$")


def extract_year_tag(tags: List[str]) -> Optional[str]:
    """
    Extract a single YYYY tag from a list of strings.

    Raises:
        ValueError: if more than one valid year tag is found.
    """
    matches = [tag for tag in tags if YEAR_PATTERN.match(tag)]

    if len(matches) > 1:
        raise ValueError(
            f"Multiple year tags found: {matches}"
        )

    return matches[0] if matches else None


def extract_month_tag(tags: List[str]) -> Optional[str]:
    """
    Extract a single MM tag (01-12) from a list of strings.

    Raises:
        ValueError: if more than one valid month tag is found.
    """
    matches = [tag for tag in tags if MONTH_PATTERN.match(tag)]

    if len(matches) > 1:
        raise ValueError(
            f"Multiple month tags found: {matches}"
        )

    return matches[0] if matches else None


def split_yymm_tag(tag_list):
    for tag in tag_list:
        match = YY_MM_PATTERN.match(tag)
        if isinstance(tag, str) and match:
            # Split the tag at the hyphen
            year_suffix, month_str = tag.split("-")

            # Prepend '20' to the year suffix to get the full year
            full_year = f"20{year_suffix}"

            # Pad the month with a leading zero if it's a single digit
            padded_month = month_str.zfill(2)  # zfill(2) pads with zeros until length 2
            return tag, full_year, padded_month
    return None
