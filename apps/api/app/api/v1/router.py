from fastapi import APIRouter

from app.api.v1.endpoints import ai_trade, auth, listings, trade_evaluation, trade_product, users, wanted_posts


api_router = APIRouter()
api_router.include_router(listings.router, prefix="/listings", tags=["listings"])
api_router.include_router(wanted_posts.router, prefix="/wanted-posts", tags=["wanted-posts"])
api_router.include_router(ai_trade.router, prefix="/ai", tags=["trade-intelligence"])
api_router.include_router(trade_evaluation.router, prefix="/ai/trade/evaluation", tags=["trade-evaluation"])
api_router.include_router(trade_product.router, tags=["trade-product"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
