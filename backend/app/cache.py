# backend/app/cache.py
"""
Redis connection manager for local development
"""

import os
import redis
from redis.asyncio import Redis
from typing import Optional
import json
from datetime import timedelta
import uuid

class RedisManager:
    """Manages Redis connection and operations"""
    
    _instance: Optional[Redis] = None
    
    @classmethod
    async def get_redis(cls) -> Redis:
        """Get or create Redis connection"""
        if cls._instance is None:
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
            cls._instance = await Redis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True,
                max_connections=10
            )
        return cls._instance
    
    @classmethod
    async def close(cls):
        """Close Redis connection"""
        if cls._instance:
            await cls._instance.close()
            cls._instance = None


class CacheService:
    """High-level caching operations"""
    
    def __init__(self):
        self.redis: Optional[Redis] = None
    
    async def _get_redis(self) -> Redis:
        """Get Redis instance"""
        if self.redis is None:
            self.redis = await RedisManager.get_redis()
        return self.redis
    
    # ============================================
    # API KEY CACHING
    # ============================================
    
    async def cache_api_key(
        self, 
        key_hash: str, 
        user_id: str,
        is_active: bool,
        environment: str,
        rate_limit_per_min: int,
        ttl: int = 300  # 5 minutes
    ):
        """Cache API key validation data"""
        redis = await self._get_redis()
        key = f"apikey:{key_hash}"
        
        data = {
            "user_id": user_id,
            "is_active": str(is_active),
            "environment": environment,
            "rate_limit_per_min": str(rate_limit_per_min)
        }
        
        await redis.hset(key, mapping=data)
        await redis.expire(key, ttl)
    
    async def get_api_key(self, key_hash: str) -> Optional[dict]:
        """Get cached API key data"""
        redis = await self._get_redis()
        key = f"apikey:{key_hash}"
        
        data = await redis.hgetall(key)
        if not data:
            return None
        
        return {
            "user_id": data.get("user_id"),
            "is_active": data.get("is_active") == "True",
            "environment": data.get("environment"),
            "rate_limit_per_min": int(data.get("rate_limit_per_min", 60))
        }
    
    # ============================================
    # RATE LIMITING
    # ============================================
    
    async def check_rate_limit(
        self, 
        api_key_id: str,
        limit_per_minute: int = 60
    ) -> tuple[bool, int]:
        """
        Check if rate limit is exceeded using sliding window
        Returns: (is_allowed, remaining_requests)
        """
        redis = await self._get_redis()
        key = f"ratelimit:{api_key_id}:minute"
        
        now = (await redis.time())[0]  # Current timestamp
        window_start = now - 60  # 60 seconds ago
        
        # Remove old entries
        await redis.zremrangebyscore(key, 0, window_start)
        
        # Count requests in current window
        current_count = await redis.zcard(key)
        
        if current_count >= limit_per_minute:
            return False, 0
        
        # Add current request
        
        await redis.zadd(key, {f"{now}:{uuid.uuid4().hex[:8]}": now})
        await redis.expire(key, 60)        
        remaining = limit_per_minute - current_count - 1
        return True, remaining
    
    async def get_rate_limit_info(self, api_key_id: str) -> dict:
        """Get rate limit statistics"""
        redis = await self._get_redis()
        key = f"ratelimit:{api_key_id}:minute"
        
        now = (await redis.time())[0]
        window_start = now - 60
        
        await redis.zremrangebyscore(key, 0, window_start)
        current_count = await redis.zcard(key)
        
        return {
            "requests_in_window": current_count,
            "window_seconds": 60,
            "resets_at": now + 60
        }
    
    # ============================================
    # CREDENTIAL CACHING
    # ============================================
    
    async def cache_credentials(
        self,
        user_id: str,
        service_name: str,
        environment: str,
        encrypted_credentials: str,
        ttl: int = 600  # 10 minutes
    ):
        """Cache encrypted service credentials"""
        redis = await self._get_redis()
        key = f"creds:{user_id}:{service_name}:{environment}"
        
        await redis.set(key, encrypted_credentials, ex=ttl)
    
    async def get_credentials(
        self,
        user_id: str,
        service_name: str,
        environment: str
    ) -> Optional[str]:
        """Get cached encrypted credentials"""
        redis = await self._get_redis()
        key = f"creds:{user_id}:{service_name}:{environment}"
        
        return await redis.get(key)
    
    async def invalidate_credentials(
        self,
        user_id: str,
        service_name: str,
        environment: str
    ):
        """Invalidate cached credentials"""
        redis = await self._get_redis()
        key = f"creds:{user_id}:{service_name}:{environment}"
        
        await redis.delete(key)
    
    # ============================================
    # IDEMPOTENCY
    # ============================================
    
    async def cache_idempotent_response(
        self,
        user_id: str,
        idempotency_key: str,
        response_data: dict,
        ttl: int = 86400  # 24 hours
    ):
        """Cache response for idempotent requests"""
        redis = await self._get_redis()
        key = f"idempotent:{user_id}:{idempotency_key}"
        
        await redis.set(key, json.dumps(response_data), ex=ttl)
    
    async def get_idempotent_response(
        self,
        user_id: str,
        idempotency_key: str
    ) -> Optional[dict]:
        """Get cached idempotent response"""
        redis = await self._get_redis()
        key = f"idempotent:{user_id}:{idempotency_key}"
        
        data = await redis.get(key)
        if data:
            return json.loads(data)
        return None
    
    # ============================================
    # SESSION CACHING
    # ============================================
    
    async def cache_user_session(
        self,
        clerk_user_id: str,
        session_data: dict,
        ttl: int = 3600  # 1 hour
    ):
        """Cache user session data"""
        redis = await self._get_redis()
        key = f"session:{clerk_user_id}"
        
        await redis.set(key, json.dumps(session_data), ex=ttl)
    
    async def get_user_session(self, clerk_user_id: str) -> Optional[dict]:
        """Get cached user session"""
        redis = await self._get_redis()
        key = f"session:{clerk_user_id}"
        
        data = await redis.get(key)
        if data:
            return json.loads(data)
        return None
    
    # ============================================
    # UTILITY METHODS
    # ============================================
    
    async def ping(self) -> bool:
        """Check if Redis is connected"""
        try:
            redis = await self._get_redis()
            await redis.ping()
            return True
        except Exception as e:
            print(f"Redis ping failed: {e}")
            return False

    async def get_connection_info(self) -> dict:
        """Get Redis connection information"""
        try:
            redis = await self._get_redis()
            info = await redis.info()
            return {
                "status": "connected",
                "version": info.get("redis_version", "unknown"),
                "connected_clients": info.get("connected_clients", 0),
                "used_memory_human": info.get("used_memory_human", "unknown")
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }


async def check_redis_connection() -> dict:
    """Check Redis connection health for health checks"""
    try:
        cache = CacheService()
        is_connected = await cache.ping()

        if is_connected:
            info = await cache.get_connection_info()
            return {
                "status": "healthy",
                "connection": "established",
                "version": info.get("version", "unknown"),
                "clients": info.get("connected_clients", 0)
            }
        else:
            return {"status": "error", "message": "Redis ping failed"}

    except Exception as e:
        return {"status": "error", "message": str(e)}
    
    async def clear_pattern(self, pattern: str):
        """Clear all keys matching pattern (use with caution!)"""
        redis = await self._get_redis()
        cursor = 0
        
        while True:
            cursor, keys = await redis.scan(cursor, match=pattern, count=100)
            if keys:
                await redis.delete(*keys)
            if cursor == 0:
                break


# Global cache instance
cache_service = CacheService()


# ============================================
# STARTUP/SHUTDOWN EVENTS
# ============================================

async def init_redis():
    """Initialize Redis on app startup"""
    try:
        redis = await RedisManager.get_redis()
        await redis.ping()
        print("Redis connection established")
    except Exception as e:
        print(f"Redis connection failed: {e}")
        print("Warning: App will continue but caching will not work")


async def close_redis():
    """Close Redis on app shutdown"""
    await RedisManager.close()
    print("Redis connection closed")