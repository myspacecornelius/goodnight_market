"""
Activity Stream WebSocket - Real-time feed events.

Provides WebSocket connection for live activity ribbon updates.
Clients subscribe to geographic channels based on their location.
"""

import json
import asyncio
import logging
from typing import Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import h3

from services.core.redis_client import get_redis

logger = logging.getLogger(__name__)

router = APIRouter(tags=["activity-stream"])


class ConnectionManager:
    """Manages WebSocket connections and their subscriptions"""
    
    def __init__(self):
        # Map of websocket -> set of subscribed channels
        self.active_connections: dict[WebSocket, Set[str]] = {}
    
    async def connect(self, websocket: WebSocket, channels: Set[str]):
        """Accept connection and register channel subscriptions"""
        await websocket.accept()
        self.active_connections[websocket] = channels
        logger.info(f"WebSocket connected, subscribed to {len(channels)} channels")
    
    def disconnect(self, websocket: WebSocket):
        """Remove connection"""
        if websocket in self.active_connections:
            del self.active_connections[websocket]
            logger.info("WebSocket disconnected")
    
    async def send_to_websocket(self, websocket: WebSocket, message: dict):
        """Send message to specific websocket"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Failed to send to websocket: {e}")
    
    def get_connections_for_channel(self, channel: str) -> list[WebSocket]:
        """Get all websockets subscribed to a channel"""
        return [
            ws for ws, channels in self.active_connections.items()
            if channel in channels
        ]


manager = ConnectionManager()


@router.websocket("/ws/activity")
async def activity_stream(
    websocket: WebSocket,
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius: float = Query(default=3.0, ge=1.0, le=10.0)
):
    """
    WebSocket endpoint for real-time activity feed.
    
    Subscribes to feed events within the specified radius of the user's location.
    Events are pushed as they occur (new listings, price drops, sales, etc.)
    
    Query params:
    - lat: User's latitude
    - lng: User's longitude  
    - radius: Radius in miles to subscribe to (default 3.0)
    
    Message format (outbound):
    {
        "type": "feed_event",
        "data": {
            "id": "uuid",
            "type": "NEW_LISTING",
            "entity_type": "listing",
            "entity_id": "uuid",
            "display_text": "New listing: Jordan 4 Bred - $250",
            "payload": {...},
            "created_at": "2024-01-15T10:30:00Z"
        }
    }
    """
    # Get H3 hexes to subscribe to at resolution 7 (broader coverage)
    center_h3 = h3.geo_to_h3(lat, lng, 7)
    k = int(radius * 0.8)
    hexes = list(h3.k_ring(center_h3, k))
    
    # Create channel names
    channels = {f"feed:{hex_id}" for hex_id in hexes}
    
    # Also subscribe to resolution 8 and 9 for more granular events
    center_h3_r8 = h3.geo_to_h3(lat, lng, 8)
    center_h3_r9 = h3.geo_to_h3(lat, lng, 9)
    channels.add(f"feed:{center_h3_r8}")
    channels.add(f"feed:{center_h3_r9}")
    
    await manager.connect(websocket, channels)
    
    try:
        # Get Redis client
        redis_client = await get_redis()
        pubsub = redis_client.pubsub()
        
        # Subscribe to all channels
        for channel in channels:
            await pubsub.subscribe(channel)
        
        logger.info(f"Subscribed to {len(channels)} Redis channels")
        
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connected",
            "data": {
                "center": {"lat": lat, "lng": lng},
                "radius_miles": radius,
                "channels_count": len(channels)
            }
        })
        
        # Create tasks for receiving from Redis and handling client messages
        async def listen_redis():
            """Listen for Redis pub/sub messages"""
            async for message in pubsub.listen():
                if message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        await websocket.send_json({
                            "type": "feed_event",
                            "channel": message["channel"],
                            "data": data
                        })
                    except json.JSONDecodeError:
                        logger.warning(f"Invalid JSON in Redis message: {message['data']}")
                    except Exception as e:
                        logger.error(f"Error processing Redis message: {e}")
                        break
        
        async def listen_client():
            """Listen for client messages (ping/pong, location updates)"""
            while True:
                try:
                    data = await websocket.receive_json()
                    
                    if data.get("type") == "ping":
                        await websocket.send_json({"type": "pong"})
                    
                    elif data.get("type") == "update_location":
                        # Client moved - update subscriptions
                        new_lat = data.get("lat")
                        new_lng = data.get("lng")
                        if new_lat and new_lng:
                            # Unsubscribe from old channels
                            for channel in channels:
                                await pubsub.unsubscribe(channel)
                            
                            # Calculate new channels
                            new_center = h3.geo_to_h3(new_lat, new_lng, 7)
                            new_hexes = list(h3.k_ring(new_center, k))
                            channels.clear()
                            channels.update({f"feed:{hex_id}" for hex_id in new_hexes})
                            
                            # Subscribe to new channels
                            for channel in channels:
                                await pubsub.subscribe(channel)
                            
                            await websocket.send_json({
                                "type": "location_updated",
                                "data": {
                                    "center": {"lat": new_lat, "lng": new_lng},
                                    "channels_count": len(channels)
                                }
                            })
                
                except WebSocketDisconnect:
                    break
                except Exception as e:
                    logger.error(f"Error receiving client message: {e}")
                    break
        
        # Run both listeners concurrently
        redis_task = asyncio.create_task(listen_redis())
        client_task = asyncio.create_task(listen_client())
        
        # Wait for either to complete (usually client disconnect)
        done, pending = await asyncio.wait(
            [redis_task, client_task],
            return_when=asyncio.FIRST_COMPLETED
        )
        
        # Cancel pending tasks
        for task in pending:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
    
    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        # Cleanup
        manager.disconnect(websocket)
        try:
            await pubsub.unsubscribe()
            await pubsub.close()
        except Exception:
            pass


@router.websocket("/ws/listing/{listing_id}")
async def listing_updates(
    websocket: WebSocket,
    listing_id: str
):
    """
    WebSocket endpoint for real-time updates on a specific listing.
    
    Useful for:
    - Live view count updates
    - Price changes
    - Status changes (sold, pending)
    """
    await websocket.accept()
    
    channel = f"listing:{listing_id}"
    
    try:
        redis_client = await get_redis()
        pubsub = redis_client.pubsub()
        await pubsub.subscribe(channel)
        
        await websocket.send_json({
            "type": "connected",
            "listing_id": listing_id
        })
        
        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    data = json.loads(message["data"])
                    await websocket.send_json({
                        "type": "listing_update",
                        "data": data
                    })
                except Exception as e:
                    logger.error(f"Error processing listing update: {e}")
    
    except WebSocketDisconnect:
        pass
    finally:
        try:
            await pubsub.unsubscribe()
            await pubsub.close()
        except Exception:
            pass
