from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseAdapter(ABC):
    """Abstract base class for all payment service adapters"""

    def __init__(self, credentials: Dict[str, str]):
        self.credentials = credentials
        self.base_url = None

    @abstractmethod
    async def _get_base_url(self) -> str:
        """Return service base URL"""
        pass

    @abstractmethod
    async def validate_credentials(self) -> bool:
        """Validate stored credentials work"""
        pass

    @abstractmethod
    async def create_order(self, amount: float, currency: str = "INR", **kwargs) -> Dict[str, Any]:
        """Create payment order"""
        pass

    @abstractmethod
    async def get_order(self, order_id: str) -> Dict[str, Any]:
        """Get order details"""
        pass

    async def normalize_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Convert unified request to provider format"""
        return request

    async def normalize_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Convert provider response to unified format"""
        return response