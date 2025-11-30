"""
H3 Geospatial Utilities for Hyperlocal Feed
Uses Uber H3 hexagonal hierarchical spatial index for efficient proximity queries.

Resolution Guide:
- Resolution 7: ~5.16 km² (~2 mile diameter) - City district level
- Resolution 8: ~0.74 km² (~0.75 mile diameter) - Neighborhood level  
- Resolution 9: ~0.11 km² (~0.25 mile diameter) - Block level (default)
- Resolution 10: ~0.015 km² - Street level
"""

import h3
from typing import List, Tuple, Dict, Set
from functools import lru_cache

# Default resolution for micro-location grid (~0.25 mile)
DEFAULT_RESOLUTION = 9

# Radius to resolution mapping (approximate)
RADIUS_TO_RESOLUTION = {
    0.25: 9,   # ~0.25 mile -> resolution 9
    0.5: 9,    # ~0.5 mile -> resolution 9 with k=1
    1.0: 8,    # ~1 mile -> resolution 8
    3.0: 7,    # ~3 miles -> resolution 7
    5.0: 7,    # ~5 miles -> resolution 7 with larger k
}

# K-ring sizes for different radii at resolution 9
RADIUS_TO_KRING = {
    0.25: 0,   # Just the center hex
    0.5: 1,    # Center + immediate neighbors
    1.0: 3,    # ~1 mile radius
    3.0: 8,    # ~3 mile radius
    5.0: 13,   # ~5 mile radius
}


def coords_to_h3(lat: float, lng: float, resolution: int = DEFAULT_RESOLUTION) -> str:
    """
    Convert latitude/longitude coordinates to H3 hex index.
    
    Args:
        lat: Latitude in decimal degrees
        lng: Longitude in decimal degrees
        resolution: H3 resolution (0-15), default 9 for ~0.25 mile hexes
        
    Returns:
        H3 hex index string (e.g., '892a100d2c3ffff')
    """
    return h3.geo_to_h3(lat, lng, resolution)


def h3_to_coords(h3_index: str) -> Tuple[float, float]:
    """
    Get center coordinates of an H3 hex.
    
    Args:
        h3_index: H3 hex index string
        
    Returns:
        Tuple of (latitude, longitude)
    """
    return h3.h3_to_geo(h3_index)


def get_hex_boundary(h3_index: str) -> List[Tuple[float, float]]:
    """
    Get polygon boundary coordinates for an H3 hex.
    Useful for rendering hex zones on maps.
    
    Args:
        h3_index: H3 hex index string
        
    Returns:
        List of (lat, lng) tuples forming the hex boundary
    """
    return h3.h3_to_geo_boundary(h3_index)


def get_radius_hexes(
    lat: float, 
    lng: float, 
    radius_miles: float,
    resolution: int = DEFAULT_RESOLUTION
) -> List[str]:
    """
    Get all H3 hexes within a radius of a point.
    Uses k-ring expansion for efficient coverage.
    
    Args:
        lat: Center latitude
        lng: Center longitude
        radius_miles: Radius in miles (0.25, 0.5, 1.0, 3.0, 5.0)
        resolution: H3 resolution to use
        
    Returns:
        List of H3 hex indices covering the radius
    """
    center_hex = h3.geo_to_h3(lat, lng, resolution)
    
    # Get appropriate k-ring size for radius
    k = RADIUS_TO_KRING.get(radius_miles, int(radius_miles * 2.5))
    
    # k_ring returns a set of all hexes within k steps
    return list(h3.k_ring(center_hex, k))


def get_hex_ring(h3_index: str, k: int = 1) -> List[str]:
    """
    Get hexes at exactly k distance from center (ring, not disk).
    Useful for expanding search gradually.
    
    Args:
        h3_index: Center hex index
        k: Ring distance
        
    Returns:
        List of hex indices at distance k
    """
    return list(h3.hex_ring(h3_index, k))


def get_hex_neighbors(h3_index: str) -> List[str]:
    """
    Get immediate neighbors of a hex (k=1 ring).
    
    Args:
        h3_index: Center hex index
        
    Returns:
        List of 6 neighboring hex indices
    """
    return list(h3.hex_ring(h3_index, 1))


def get_parent_hex(h3_index: str, parent_resolution: int) -> str:
    """
    Get parent hex at coarser resolution.
    Useful for aggregating data at different zoom levels.
    
    Args:
        h3_index: Child hex index
        parent_resolution: Target resolution (must be < current resolution)
        
    Returns:
        Parent hex index
    """
    return h3.h3_to_parent(h3_index, parent_resolution)


def get_children_hexes(h3_index: str, child_resolution: int) -> List[str]:
    """
    Get all child hexes at finer resolution.
    
    Args:
        h3_index: Parent hex index
        child_resolution: Target resolution (must be > current resolution)
        
    Returns:
        List of child hex indices
    """
    return list(h3.h3_to_children(h3_index, child_resolution))


def hex_distance(h3_index_1: str, h3_index_2: str) -> int:
    """
    Get grid distance between two hexes (number of steps).
    
    Args:
        h3_index_1: First hex index
        h3_index_2: Second hex index
        
    Returns:
        Grid distance (number of hex steps)
    """
    return h3.h3_distance(h3_index_1, h3_index_2)


def are_neighbors(h3_index_1: str, h3_index_2: str) -> bool:
    """
    Check if two hexes are immediate neighbors.
    
    Args:
        h3_index_1: First hex index
        h3_index_2: Second hex index
        
    Returns:
        True if hexes are adjacent
    """
    return h3.h3_indexes_are_neighbors(h3_index_1, h3_index_2)


@lru_cache(maxsize=1000)
def get_hex_area_km2(resolution: int) -> float:
    """
    Get average area of hexes at a resolution in km².
    Cached for performance.
    
    Args:
        resolution: H3 resolution
        
    Returns:
        Average hex area in km²
    """
    return h3.hex_area(resolution, unit='km^2')


def compact_hexes(hex_set: Set[str]) -> List[str]:
    """
    Compact a set of hexes to minimal representation.
    Replaces groups of 7 child hexes with their parent.
    
    Args:
        hex_set: Set of H3 hex indices
        
    Returns:
        Compacted list of hex indices
    """
    return list(h3.compact(hex_set))


def uncompact_hexes(hex_set: Set[str], resolution: int) -> List[str]:
    """
    Expand compacted hexes to target resolution.
    
    Args:
        hex_set: Set of compacted H3 hex indices
        resolution: Target resolution
        
    Returns:
        Expanded list of hex indices at target resolution
    """
    return list(h3.uncompact(hex_set, resolution))


def polyfill_geojson(geojson: Dict, resolution: int = DEFAULT_RESOLUTION) -> List[str]:
    """
    Fill a GeoJSON polygon with H3 hexes.
    Useful for defining custom zones.
    
    Args:
        geojson: GeoJSON polygon dict
        resolution: H3 resolution
        
    Returns:
        List of hex indices covering the polygon
    """
    return list(h3.polyfill_geojson(geojson, resolution))


def hexes_to_geojson(hex_list: List[str]) -> Dict:
    """
    Convert list of hexes to GeoJSON MultiPolygon.
    Useful for rendering on maps.
    
    Args:
        hex_list: List of H3 hex indices
        
    Returns:
        GeoJSON dict with MultiPolygon geometry
    """
    features = []
    for hex_id in hex_list:
        boundary = h3.h3_to_geo_boundary(hex_id, geo_json=True)
        features.append({
            "type": "Feature",
            "properties": {"h3_index": hex_id},
            "geometry": {
                "type": "Polygon",
                "coordinates": [boundary]
            }
        })
    
    return {
        "type": "FeatureCollection",
        "features": features
    }


def get_resolution_for_radius(radius_miles: float) -> int:
    """
    Get optimal H3 resolution for a given search radius.
    
    Args:
        radius_miles: Search radius in miles
        
    Returns:
        Recommended H3 resolution
    """
    if radius_miles <= 0.5:
        return 9
    elif radius_miles <= 1.5:
        return 8
    elif radius_miles <= 5:
        return 7
    else:
        return 6


def estimate_distance_miles(h3_index_1: str, h3_index_2: str) -> float:
    """
    Estimate distance between two hex centers in miles.
    
    Args:
        h3_index_1: First hex index
        h3_index_2: Second hex index
        
    Returns:
        Approximate distance in miles
    """
    from math import radians, sin, cos, sqrt, atan2
    
    lat1, lng1 = h3.h3_to_geo(h3_index_1)
    lat2, lng2 = h3.h3_to_geo(h3_index_2)
    
    # Haversine formula
    R = 3959  # Earth's radius in miles
    
    lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c
