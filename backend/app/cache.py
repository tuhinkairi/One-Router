# backend/app/cache.py
"""
Redis connection manager for local development
"""

import os
import redis
from redis.asyncio import Redis
from typing import Optional
import json
from datetime import timedelta, datetime
import uuid
from cryptography.fernet import Fernet
import logging

logger = logging.getLogger(__name__)

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
        self._cipher = self._init_cipher()
    
    def _init_cipher(self) -> Fernet:
        """Initialize encryption cipher for API key storage"""
        encryption_key = os.getenv("API_KEY_ENCRYPTION_KEY")
        if not encryption_key:
            # Generate and store a new key if not provided
            encryption_key = Fernet.generate_key().decode()
            logger.warning("No API_KEY_ENCRYPTION_KEY found. Generated new key. Store this in environment: %s", encryption_key)
        try:
            return Fernet(encryption_key.encode() if isinstance(encryption_key, str) else encryption_key)
        except Exception as e:
            logger.error(f"Failed to initialize cipher: {e}")
            raise ValueError("Invalid encryption key")
    
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
        """Cache encrypted API key validation data"""
        redis = await self._get_redis()
        key = "apikey:{}".format(key_hash)
        
        data = {
            "user_id": user_id,
            "is_active": is_active,
            "environment": environment,
            "rate_limit_per_min": rate_limit_per_min,
            "cached_at": str(datetime.utcnow())
        }
        
        # Encrypt the data before storing
        try:
            encrypted_data = self._cipher.encrypt(json.dumps(data).encode())
            await redis.set(key, encrypted_data.decode(), ex=ttl)
        except Exception as e:
            logger.error(f"Failed to cache API key: {e}")
            raise
    
    async def get_api_key(self, key_hash: str) -> Optional[dict]:
        """Get decrypted cached API key data"""
        redis = await self._get_redis()
        key = "apikey:{}".format(key_hash)
        
        encrypted_data = await redis.get(key)
        if not encrypted_data:
            return None
        
        try:
            decrypted_data = self._cipher.decrypt(encrypted_data.encode())
            data = json.loads(decrypted_data.decode())
            return {
                "user_id": data.get("user_id"),
                "is_active": data.get("is_active"),
                "environment": data.get("environment"),
                "rate_limit_per_min": data.get("rate_limit_per_min", 60)
            }
        except Exception as e:
            logger.error(f"Failed to decrypt API key: {e}")
            return None
    
    # ============================================
    # RATE LIMITING
    # ============================================
    
    # Lua script for atomic rate limiting check
    _RATE_LIMIT_LUA_SCRIPT = """
    local key = KEYS[1]
    local limit = tonumber(ARGV[1])
    local now = tonumber(ARGV[2])
    local window = 60
    
    -- Remove entries outside the window
    redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
    
    -- Count requests in current window
    local count = redis.call('ZCARD', key)
    
    if count < limit then
        -- Add current request with unique score
        redis.call('ZADD', key, now, now .. ':' .. tostring(math.random(100000)))
        redis.call('EXPIRE', key, window)
        -- Return: [allowed=1, remaining_requests, reset_at_timestamp]
        return {1, limit - count - 1, now + window}
    else
        -- Return: [allowed=0, remaining_requests=0, reset_at_timestamp]
        return {0, 0, now + window}
    end
    """
    
    async def check_rate_limit(
        self, 
        api_key_id: str,
        limit_per_minute: int = 60
    ) -> tuple[bool, int, int]:
        """
        Check if rate limit is exceeded using atomic Lua script.
        Uses sliding window with distributed lock via Lua.
        
        Returns: (is_allowed, remaining_requests, reset_at_timestamp)
        """
        redis = await self._get_redis()
        key = f"ratelimit:{api_key_id}:minute"
        
        now = (await redis.time())[0]  # Current server timestamp
        
        try:
            # Execute Lua script atomically (no race conditions)
            # redis-py v4+ signature: eval(script, numkeys, key1, key2, ..., arg1, arg2, ...)
            result = await redis.eval(
                self._RATE_LIMIT_LUA_SCRIPT,
                1,  # numkeys
                key,  # key
                limit_per_minute,  # arg1
                now  # arg2
            )
            
            is_allowed = bool(result[0])
            remaining = int(result[1])
            reset_at = int(result[2])
            
            return is_allowed, remaining, reset_at
        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            # Fail open - allow request on error
            return True, limit_per_minute, int(now) + 60
    
    async def get_rate_limit_info(self, api_key_id: str) -> dict:
        """Get current rate limit statistics"""
        redis = await self._get_redis()
        key = f"ratelimit:{api_key_id}:minute"
        
        now = (await redis.time())[0]
        window_start = now - 60
        
        # Remove expired entries
        await redis.zremrangebyscore(key, 0, window_start)
        current_count = await redis.zcard(key)
        
        return {
            "requests_in_window": current_count,
            "window_seconds": 60,
            "resets_at": int(now + 60)
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
        key = "creds:{}:{}:{}".format(user_id, service_name, environment)
        
        await redis.set(key, encrypted_credentials, ex=ttl)
    
    async def get_credentials(
        self,
        user_id: str,
        service_name: str,
        environment: str
    ) -> Optional[str]:
        """Get cached encrypted credentials"""
        redis = await self._get_redis()
        key = "creds:{}:{}:{}".format(user_id, service_name, environment)
        
        return await redis.get(key)
    
    async def invalidate_credentials(
        self,
        user_id: str,
        service_name: str,
        environment: str
    ):
        """Invalidate cached credentials"""
        redis = await self._get_redis()
        key = "creds:{}:{}:{}".format(user_id, service_name, environment)
        
        await redis.delete(key)
    
    # ============================================
    # IDEMPOTENCY
    # ============================================
    
    async def acquire_idempotency_lock(
        self,
        idempotency_key: str,
        ttl: int = 30
    ) -> bool:
        """
        Acquire lock to prevent duplicate request processing.
        Returns True if lock acquired, False if already locked (duplicate in progress)
        """
        redis = await self._get_redis()
        lock_key = f"idempotency:lock:{idempotency_key}"
        
        # Set lock only if key doesn't exist (nx=True)
        result = await redis.set(lock_key, "1", ex=ttl, nx=True)
        return result is not None
    
    async def release_idempotency_lock(self, idempotency_key: str):
        """Release idempotency lock"""
        redis = await self._get_redis()
        lock_key = f"idempotency:lock:{idempotency_key}"
        
        await redis.delete(lock_key)
    
    async def cache_idempotent_response(
        self,
        user_id: str,
        idempotency_key: str,
        response_data: dict,
        ttl: int = 86400  # 24 hours
    ):
        """Cache response for idempotent requests"""
        redis = await self._get_redis()
        key = "idempotent:{}:{}".format(user_id, idempotency_key)
        
        await redis.set(key, json.dumps(response_data), ex=ttl)
    
    async def get_idempotent_response(
        self,
        user_id: str,
        idempotency_key: str
    ) -> Optional[dict]:
        """Get cached idempotent response"""
        redis = await self._get_redis()
        key = "idempotent:{}:{}".format(user_id, idempotency_key)
        
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
        key = "session:{}".format(clerk_user_id)
        
        await redis.set(key, json.dumps(session_data), ex=ttl)
    
    async def get_user_session(self, clerk_user_id: str) -> Optional[dict]:
        """Get cached user session"""
        redis = await self._get_redis()
        key = "session:{}".format(clerk_user_id)
        
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