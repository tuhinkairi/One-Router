# backend/app/routes/analytics.py
"""
Advanced Analytics Dashboard
Provides comprehensive usage analytics, performance metrics, and cost analysis
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_, or_, case, text
from sqlalchemy.orm import joinedload
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from ..database import get_db
from ..auth.dependencies import get_current_user
from ..models import TransactionLog, ApiKey, User, WebhookEvent

router = APIRouter()


class AnalyticsService:
    """Service for analytics calculations"""

    @staticmethod
    async def get_date_range(period: str) -> datetime:
        """Convert period string to datetime"""
        now = datetime.utcnow()
        if period == "7d":
            return now - timedelta(days=7)
        elif period == "30d":
            return now - timedelta(days=30)
        elif period == "90d":
            return now - timedelta(days=90)
        elif period == "1y":
            return now - timedelta(days=365)
        else:
            return now - timedelta(days=30)  # default to 30 days

    @staticmethod
    async def get_user_api_keys(user_id: str, db: AsyncSession) -> List[str]:
        """Get all API key IDs for a user"""
        result = await db.execute(
            select(ApiKey.id).where(ApiKey.user_id == user_id)
        )
        return [str(key_id) for key_id in result.scalars().all()]

    @staticmethod
    async def calculate_overview_metrics(user_id: str, api_key_ids: List[str], since_date: datetime, db: AsyncSession) -> Dict[str, Any]:
        """Calculate overview metrics"""
        # Total API calls
        total_result = await db.execute(
            select(func.count(TransactionLog.id))
            .where(
                TransactionLog.api_key_id.in_(api_key_ids),
                TransactionLog.created_at >= since_date
            )
        )
        total_calls = total_result.scalar() or 0

        # Success rate
        success_result = await db.execute(
            select(
                func.avg(
                    case(
                        (TransactionLog.status == "success", 1.0),
                        else_=0.0
                    )
                ) * 100
            )
            .where(
                TransactionLog.api_key_id.in_(api_key_ids),
                TransactionLog.created_at >= since_date
            )
        )
        success_rate = round(success_result.scalar() or 0, 2)

        # Average response time
        response_time_result = await db.execute(
            select(func.avg(TransactionLog.response_time_ms))
            .where(
                TransactionLog.api_key_id.in_(api_key_ids),
                TransactionLog.created_at >= since_date,
                TransactionLog.response_time_ms.isnot(None)
            )
        )
        avg_response_time = round(response_time_result.scalar() or 0, 2)

        # Top services used
        services_result = await db.execute(
            select(
                TransactionLog.service_name,
                func.count(TransactionLog.id).label('call_count')
            )
            .where(
                TransactionLog.api_key_id.in_(api_key_ids),
                TransactionLog.created_at >= since_date
            )
            .group_by(TransactionLog.service_name)
            .order_by(desc('call_count'))
            .limit(5)
        )
        top_services = [
            {"service": row.service_name, "calls": row.call_count}
            for row in services_result
        ]

        # Error rate by service
        error_result = await db.execute(
            select(
                TransactionLog.service_name,
                func.count(TransactionLog.id).label('total_calls'),
                func.sum(
                    case(
                        (TransactionLog.status == "error", 1),
                        else_=0
                    )
                ).label('error_count')
            )
            .where(
                TransactionLog.api_key_id.in_(api_key_ids),
                TransactionLog.created_at >= since_date
            )
            .group_by(TransactionLog.service_name)
        )

        error_rates = {}
        for row in error_result:
            if row.total_calls > 0:
                error_rates[row.service_name] = round((row.error_count / row.total_calls) * 100, 2)

        return {
            "total_calls": total_calls,
            "success_rate": success_rate,
            "avg_response_time": avg_response_time,
            "top_services": top_services,
            "error_rate_by_service": error_rates
        }

    @staticmethod
    async def calculate_time_series_data(user_id: str, api_key_ids: List[str], since_date: datetime, db: AsyncSession) -> Dict[str, Any]:
        """Calculate time series data for charts"""
        # Daily volume and errors
        daily_result = await db.execute(
            select(
                func.date(TransactionLog.created_at).label('date'),
                func.count(TransactionLog.id).label('total_calls'),
                func.sum(
                    case(
                        (TransactionLog.status == "error", 1),
                        else_=0
                    )
                ).label('errors'),
                func.avg(TransactionLog.response_time_ms).label('avg_response_time')
            )
            .where(
                TransactionLog.api_key_id.in_(api_key_ids),
                TransactionLog.created_at >= since_date
            )
            .group_by(func.date(TransactionLog.created_at))
            .order_by(func.date(TransactionLog.created_at))
        )

        daily_volume = []
        for row in daily_result:
            daily_volume.append({
                "date": str(row.date),
                "calls": row.total_calls,
                "errors": row.errors or 0,
                "avg_response_time": round(row.avg_response_time or 0, 2)
            })

        return {
            "daily_volume": daily_volume
        }

    @staticmethod
    async def calculate_cost_analytics(user_id: str, api_key_ids: List[str], since_date: datetime, db: AsyncSession) -> Dict[str, Any]:
        """Calculate cost analytics (placeholder - would need actual pricing data)"""
        # For now, return placeholder cost data
        # In production, this would integrate with actual pricing tiers and provider costs

        services_result = await db.execute(
            select(
                TransactionLog.service_name,
                func.count(TransactionLog.id).label('call_count')
            )
            .where(
                TransactionLog.api_key_id.in_(api_key_ids),
                TransactionLog.created_at >= since_date
            )
            .group_by(TransactionLog.service_name)
        )

        # Placeholder cost calculation (₹0.01 per API call)
        cost_per_call = 0.01
        cost_breakdown = {}
        total_cost = 0

        for row in services_result:
            service_cost = row.call_count * cost_per_call
            cost_breakdown[row.service_name] = round(service_cost, 2)
            total_cost += service_cost

        # Projected monthly cost (simple extrapolation)
        days_in_period = (datetime.utcnow() - since_date).days
        if days_in_period > 0:
            daily_avg_cost = total_cost / days_in_period
            projected_monthly = daily_avg_cost * 30
        else:
            projected_monthly = 0

        return {
            "cost_breakdown": cost_breakdown,
            "total_cost": round(total_cost, 2),
            "projected_monthly": round(projected_monthly, 2),
            "cost_per_call": cost_per_call,
            "period_days": days_in_period
        }


@router.get("/api/analytics/overview")
async def get_analytics_overview(
    period: str = "30d",
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get comprehensive analytics overview

    Returns:
    - Total API calls
    - Success rate
    - Average response time
    - Top services used
    - Error rate by service
    - Cost breakdown
    """
    try:
        user_id = str(user.get("id"))
        since_date = await AnalyticsService.get_date_range(period)
        api_key_ids = await AnalyticsService.get_user_api_keys(user_id, db)

        if not api_key_ids:
            return {
                "period": period,
                "total_calls": 0,
                "success_rate": 0,
                "avg_response_time": 0,
                "top_services": [],
                "error_rate_by_service": {},
                "cost_breakdown": {},
                "total_cost": 0
            }

        overview = await AnalyticsService.calculate_overview_metrics(user_id, api_key_ids, since_date, db)
        costs = await AnalyticsService.calculate_cost_analytics(user_id, api_key_ids, since_date, db)

        return {
            "period": period,
            "since_date": since_date.isoformat(),
            **overview,
            **costs
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics error: {str(e)}")


@router.get("/api/analytics/timeseries")
async def get_analytics_timeseries(
    period: str = "30d",
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get time series data for charts
    """
    try:
        user_id = str(user.get("id"))
        since_date = await AnalyticsService.get_date_range(period)
        api_key_ids = await AnalyticsService.get_user_api_keys(user_id, db)

        if not api_key_ids:
            return {"daily_volume": []}

        return await AnalyticsService.calculate_time_series_data(user_id, api_key_ids, since_date, db)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Time series analytics error: {str(e)}")


@router.get("/api/analytics/service/{service_name}")
async def get_service_analytics(
    service_name: str,
    period: str = "30d",
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get service-specific analytics
    """
    try:
        user_id = str(user.get("id"))
        since_date = await AnalyticsService.get_date_range(period)
        api_key_ids = await AnalyticsService.get_user_api_keys(user_id, db)

        if not api_key_ids:
            return {
                "service": service_name,
                "period": period,
                "total_calls": 0,
                "success_rate": 0,
                "avg_response_time": 0,
                "error_count": 0,
                "top_endpoints": []
            }

        # Service-specific metrics
        service_result = await db.execute(
            select(
                func.count(TransactionLog.id).label('total_calls'),
                func.avg(
                    case(
                        (TransactionLog.status == "success", 1.0),
                        else_=0.0
                    )
                ).label('success_rate'),
                func.avg(TransactionLog.response_time_ms).label('avg_response_time'),
                func.sum(
                    case(
                        (TransactionLog.status == "error", 1),
                        else_=0
                    )
                ).label('error_count')
            )
            .where(
                TransactionLog.api_key_id.in_(api_key_ids),
                TransactionLog.service_name == service_name,
                TransactionLog.created_at >= since_date
            )
        )

        row = service_result.first()
        if row:
            metrics = {
                "total_calls": row.total_calls or 0,
                "success_rate": round((row.success_rate or 0) * 100, 2),
                "avg_response_time": round(row.avg_response_time or 0, 2),
                "error_count": row.error_count or 0
            }
        else:
            metrics = {
                "total_calls": 0,
                "success_rate": 0,
                "avg_response_time": 0,
                "error_count": 0
            }

        # Top endpoints for this service
        endpoints_result = await db.execute(
            select(
                TransactionLog.endpoint,
                func.count(TransactionLog.id).label('call_count')
            )
            .where(
                TransactionLog.api_key_id.in_(api_key_ids),
                TransactionLog.service_name == service_name,
                TransactionLog.created_at >= since_date
            )
            .group_by(TransactionLog.endpoint)
            .order_by(desc('call_count'))
            .limit(10)
        )

        top_endpoints = [
            {"endpoint": row.endpoint, "calls": row.call_count}
            for row in endpoints_result
        ]

        return {
            "service": service_name,
            "period": period,
            "since_date": since_date.isoformat(),
            **metrics,
            "top_endpoints": top_endpoints
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Service analytics error: {str(e)}")


@router.get("/api/analytics/errors")
async def get_error_analytics(
    period: str = "30d",
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get error analytics and trends
    """
    try:
        user_id = str(user.get("id"))
        since_date = await AnalyticsService.get_date_range(period)
        api_key_ids = await AnalyticsService.get_user_api_keys(user_id, db)

        if not api_key_ids:
            return {
                "total_errors": 0,
                "error_rate": 0,
                "error_types": [],
                "daily_errors": [],
                "errors_by_service": {}
            }

        # Total errors and error rate
        error_summary = await db.execute(
            select(
                func.count(TransactionLog.id).label('total_calls'),
                func.sum(
                    case(
                        (TransactionLog.status == "error", 1),
                        else_=0
                    )
                ).label('total_errors')
            )
            .where(
                TransactionLog.api_key_id.in_(api_key_ids),
                TransactionLog.created_at >= since_date
            )
        )

        summary_row = error_summary.first()
        if summary_row:
            total_calls = summary_row.total_calls or 0
            total_errors = summary_row.total_errors or 0
        else:
            total_calls = 0
            total_errors = 0
        error_rate = round((total_errors / total_calls * 100) if total_calls > 0 else 0, 2)

        # Error types
        error_types_result = await db.execute(
            select(
                TransactionLog.error_message,
                func.count(TransactionLog.id).label('count')
            )
            .where(
                TransactionLog.api_key_id.in_(api_key_ids),
                TransactionLog.status == "error",
                TransactionLog.created_at >= since_date,
                TransactionLog.error_message.isnot(None)
            )
            .group_by(TransactionLog.error_message)
            .order_by(desc('count'))
            .limit(10)
        )

        error_types = [
            {"message": row.error_message, "count": row.count}
            for row in error_types_result
        ]

        # Daily error trends
        daily_errors_result = await db.execute(
            select(
                func.date(TransactionLog.created_at).label('date'),
                func.count(TransactionLog.id).label('error_count')
            )
            .where(
                TransactionLog.api_key_id.in_(api_key_ids),
                TransactionLog.status == "error",
                TransactionLog.created_at >= since_date
            )
            .group_by(func.date(TransactionLog.created_at))
            .order_by(func.date(TransactionLog.created_at))
        )

        daily_errors = [
            {"date": str(row.date), "errors": row.error_count}
            for row in daily_errors_result
        ]

        # Errors by service
        service_errors_result = await db.execute(
            select(
                TransactionLog.service_name,
                func.count(TransactionLog.id).label('error_count')
            )
            .where(
                TransactionLog.api_key_id.in_(api_key_ids),
                TransactionLog.status == "error",
                TransactionLog.created_at >= since_date
            )
            .group_by(TransactionLog.service_name)
            .order_by(desc('error_count'))
        )

        errors_by_service = {
            row.service_name: row.error_count
            for row in service_errors_result
        }

        return {
            "period": period,
            "total_errors": total_errors,
            "error_rate": error_rate,
            "error_types": error_types,
            "daily_errors": daily_errors,
            "errors_by_service": errors_by_service
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analytics error: {str(e)}")


@router.get("/api/analytics/costs")
async def get_cost_analytics(
    period: str = "30d",
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get cost analytics and projections
    """
    try:
        user_id = str(user.get("id"))
        since_date = await AnalyticsService.get_date_range(period)
        api_key_ids = await AnalyticsService.get_user_api_keys(user_id, db)

        if not api_key_ids:
            return {
                "period": period,
                "cost_breakdown": {},
                "total_cost": 0,
                "projected_monthly": 0
            }

        return await AnalyticsService.calculate_cost_analytics(user_id, api_key_ids, since_date, db)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cost analytics error: {str(e)}")


@router.get("/api/analytics/logs")
async def get_transaction_logs(
    limit: int = 100,
    offset: int = 0,
    status: Optional[str] = None,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get paginated transaction logs for the frontend logs page"""
    try:
        from ..models import TransactionLog
        from sqlalchemy import select, desc

        query = select(TransactionLog).where(
            TransactionLog.user_id == user["id"]
        ).order_by(desc(TransactionLog.created_at)).limit(limit).offset(offset)

        if status:
            query = query.where(TransactionLog.status == status)

        result = await db.execute(query)
        logs = result.scalars().all()

        return {
            "logs": [
                {
                    "id": str(log.id),
                    "transaction_id": log.transaction_id,
                    "service_name": log.service_name,
                    "endpoint": log.endpoint,
                    "http_method": log.http_method,
                    "status": log.status,
                    "response_status": log.response_status,
                    "response_time_ms": log.response_time_ms,
                    "created_at": log.created_at.isoformat()
                }
                for log in logs
            ],
            "total": len(logs),
            "limit": limit,
            "offset": offset
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Logs analytics error: {str(e)}")