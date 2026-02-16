"""
Online geocoder fallback with rate limiting (Nominatim via geopy).
"""
import asyncio
import time
from typing import Optional

from app.config import get_settings

_geopy = None

def _get_geopy():
    global _geopy
    if _geopy is None:
        try:
            from geopy.geocoders import Nominatim
            from geopy.extra.rate_limiter import RateLimiter
            settings = get_settings()
            geocoder = Nominatim(user_agent=settings.geocode_user_agent, timeout=settings.geocode_timeout_seconds)
            _geopy = RateLimiter(geocoder.geocode, min_delay_seconds=60.0 / max(1, settings.geocode_rate_limit_per_minute))
        except ImportError:
            _geopy = False
    return _geopy


async def geocode_online(location_text: str) -> Optional[tuple[float, float, str, float]]:
    """
    Returns (lat, lon, provider, confidence) or None.
    Runs in thread pool to avoid blocking.
    """
    limiter = _get_geopy()
    if limiter is False:
        return None
    loop = asyncio.get_event_loop()
    try:
        result = await loop.run_in_executor(None, lambda: limiter(location_text))
        if result and result.latitude is not None and result.longitude is not None:
            conf = 0.8 if result.raw.get("importance") else 0.6
            return (float(result.latitude), float(result.longitude), "nominatim", conf)
    except Exception:
        pass
    return None
