from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from .config import settings

# Create async engine
# Convert the connection string for asyncpg
database_url = settings.DATABASE_URL
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Clean up parameters that asyncpg doesn't understand
database_url = database_url.replace("&sslmode=require", "").replace("?sslmode=require", "")
database_url = database_url.replace("&channel_binding=require", "")

engine = create_async_engine(
    database_url,
    echo=settings.DEBUG,
    pool_size=10,
    max_overflow=20,
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