import redis

from core.config import Settings

redis_client = redis.from_url(Settings.REDIS_URL, decode_responses=True)


def blacklist_token(jti: str, ttl: int):
    redis_client.setex(f"bl:{jti}", ttl, "1")


def is_token_blacklisted(jti: str) -> bool:
    return redis_client.exists(f"bl:{jti}") == 1
