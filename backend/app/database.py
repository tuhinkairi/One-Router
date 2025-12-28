from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from .config import settings

# Create async engine
# Convert connection string for asyncpg
database_url = settings.DATABASE_URL
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Clean up parameters that asyncpg doesn't understand
database_url = database_url.replace("&sslmode=require", "").replace("?sslmode=require", "")
database_url = database_url.replace("&channel_binding=require", "")

engine = create_async_engine(
    database_url,
    echo=settings.DEBUG,
    # Connection pooling configuration for production workloads
    pool_size=20,                   # Number of connections to keep pooled
    max_overflow=40,                # Allow up to 40 additional connections for burst traffic
    pool_timeout=30,                # Wait up to 30 seconds for a connection to become available
    pool_recycle=3600,              # Recycle connections every hour (prevents idle connection drops)
    pool_pre_ping=True,             # Test connections before using them (health check)
    connect_args={
        "server_settings": {
            "application_name": "onerouter_backend",
            "jit": "off"             # Disable JIT compilation for predictable performance
        }
    }
)

# Create async session factory
async_session = async_sessionmaker(engine, expire_on_commit=False)

async def get_db():
    """Database session dependency"""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()

# Add connection diagnostics
async def check_connection_health():
    """Check database connection health"""
    try:
        from sqlalchemy import text
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT version()"), {})
            version = result.scalar()
            print(f"Database connected: {version[:50]}...")
            return True
    except Exception as e:
        print(f"Database connection failed: {e}")
        return False