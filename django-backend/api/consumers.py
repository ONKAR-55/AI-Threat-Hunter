import json
from channels.generic.websocket import AsyncWebsocketConsumer

class DashboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        print("WebSocket HANDSHAKING /ws/alerts/", self.channel_name)
        # Create a group called "dashboard_users"
        await self.channel_layer.group_add("dashboard_users", self.channel_name)
        await self.accept()
        print("WebSocket ACCEPTED")

    async def disconnect(self, close_code):
        print("WebSocket DISCONNECT /ws/alerts/", self.channel_name)
        await self.channel_layer.group_discard("dashboard_users", self.channel_name)

    async def send_alert(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps(event["message"]))
