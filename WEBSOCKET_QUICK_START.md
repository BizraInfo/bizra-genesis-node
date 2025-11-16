# 🚀 WebSocket Quick Start Guide

Complete guide to running and testing the BIZRA Genesis Node WebSocket system.

---

## 📋 Prerequisites

- **Rust**: 1.75+ (for backend)
- **Node.js**: 18+ (for frontend)
- **npm**: 9+ (for frontend)

---

## 🔧 Backend Setup

### 1. Start WebSocket Server

```bash
# Navigate to project root
cd c:\bizra-genesis-node

# Run the WebSocket demo server
cargo run --example websocket_demo
```

**Expected Output**:
```
╔════════════════════════════════════════════════════════════════╗
║  BIZRA GENESIS NODE - WEBSOCKET SERVER                        ║
║  Real-time Agent Communication Infrastructure                 ║
╚════════════════════════════════════════════════════════════════╝

📋 Server Configuration:
   • Bind Address: 127.0.0.1:8080
   • Max Connections/IP: 10
   • Rate Limit: 10 msg/sec
   • Encryption: ✅ Enabled
   • Session Timeout: 300s
   • Max Message Size: 1048576 bytes

🚀 Starting WebSocket server...
✅ WebSocket server listening on 127.0.0.1:8080
```

### 2. Test with WebSocket Client

You can test the server with any WebSocket client. Here are some options:

#### Option A: Browser Console

```javascript
// Open browser console and paste:
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  console.log('✅ Connected!');

  // Authenticate
  ws.send(JSON.stringify({
    message_type: 'authenticate',
    payload: { token: 'demo_user123' }
  }));
};

ws.onmessage = (event) => {
  console.log('📨 Received:', JSON.parse(event.data));
};

// Send agent message
function sendMessage(content) {
  ws.send(JSON.stringify({
    message_type: 'agent_message',
    payload: {
      agent_id: 'ACE',
      content: content
    }
  }));
}

// Try it
sendMessage('Hello, ACE!');
```

#### Option B: wscat (CLI Tool)

```bash
# Install wscat
npm install -g wscat

# Connect to server
wscat -c ws://localhost:8080

# Send authentication
{"message_type":"authenticate","payload":{"token":"demo_user123"}}

# Send agent message
{"message_type":"agent_message","payload":{"agent_id":"ACE","content":"Hello!"}}
```

#### Option C: Python Client

```python
import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://localhost:8080"
    async with websockets.connect(uri) as websocket:
        # Authenticate
        auth_msg = {
            "message_type": "authenticate",
            "payload": {"token": "demo_user123"}
        }
        await websocket.send(json.dumps(auth_msg))
        response = await websocket.recv()
        print(f"Auth response: {response}")

        # Send agent message
        agent_msg = {
            "message_type": "agent_message",
            "payload": {
                "agent_id": "ACE",
                "content": "Hello from Python!"
            }
        }
        await websocket.send(json.dumps(agent_msg))
        response = await websocket.recv()
        print(f"Agent response: {response}")

asyncio.run(test_websocket())
```

---

## 🎨 Frontend Setup

### 1. Install Dependencies

```bash
cd apps/dashboard
npm install
```

### 2. Configure Environment

Create or update `.env.local`:

```bash
VITE_WS_URL=ws://localhost:8080
```

### 3. Start Development Server

```bash
npm run dev
```

### 4. Access Dashboard

Open browser to: [http://localhost:5173](http://localhost:5173)

1. **Login** with demo credentials:
   - Email: `demo@bizra.ai`
   - Password: `demo123`

2. **Navigate to Agents** page

3. **Select an agent** from the sidebar

4. **Start chatting!** The WebSocket will connect automatically

---

## 🧪 Testing Checklist

### Backend Tests

```bash
# Run all WebSocket tests
cargo test --lib websocket

# Run specific test module
cargo test --lib websocket::session
cargo test --lib websocket::encryption
cargo test --lib websocket::rate_limit

# Run with output
cargo test --lib websocket -- --nocapture
```

### Manual Testing

- [ ] Server starts without errors
- [ ] Client can connect
- [ ] Authentication succeeds with valid token
- [ ] Authentication fails with invalid token
- [ ] Agent messages are delivered
- [ ] Agent responses are received
- [ ] Typing indicators work
- [ ] Rate limiting activates after 10 messages/second
- [ ] Session timeout after 5 minutes of inactivity
- [ ] Automatic reconnection after disconnect
- [ ] Multiple concurrent connections work
- [ ] Connection limit (10 per IP) enforced
- [ ] Encryption/decryption works correctly
- [ ] Ping/pong keep-alive works

---

## 📊 Message Examples

### 1. Authentication

**Request**:
```json
{
  "message_type": "authenticate",
  "payload": {
    "token": "demo_user123"
  }
}
```

**Response**:
```json
{
  "message_type": "auth_response",
  "payload": {
    "success": true,
    "user_id": "demo_user123",
    "error": null,
    "session_id": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": 1705234567890,
  "message_id": "msg-abc123"
}
```

### 2. Send Agent Message

**Request**:
```json
{
  "message_type": "agent_message",
  "payload": {
    "agent_id": "ACE",
    "content": "Explain quantum computing",
    "metadata": {
      "priority": "high"
    },
    "parent_id": null
  }
}
```

**Response**:
```json
{
  "message_type": "agent_response",
  "payload": {
    "agent_id": "ACE",
    "content": "Echo from ACE: Explain quantum computing",
    "metadata": {
      "priority": "high"
    },
    "message_id": "msg-abc123",
    "is_streaming": false,
    "is_complete": true
  },
  "timestamp": 1705234568000,
  "message_id": "msg-def456"
}
```

### 3. Typing Indicator

**Request**:
```json
{
  "message_type": "typing_indicator",
  "payload": {
    "actor_id": "user_123",
    "is_typing": true
  }
}
```

### 4. Presence Update

**Request**:
```json
{
  "message_type": "presence_update",
  "payload": {
    "user_id": "user_123",
    "status": "online",
    "last_activity": 1705234567890
  }
}
```

### 5. Ping/Pong

**Ping**:
```json
{
  "message_type": "ping",
  "payload": {}
}
```

**Pong Response**:
```json
{
  "message_type": "pong",
  "payload": {},
  "timestamp": 1705234567890,
  "message_id": "msg-pong123"
}
```

---

## 🐛 Troubleshooting

### Server Won't Start

**Issue**: `Address already in use`

**Solution**:
```bash
# Windows - find process using port 8080
netstat -ano | findstr :8080

# Kill the process
taskkill /PID <process_id> /F

# Or change port in websocket_demo.rs
```

### Client Can't Connect

**Issue**: `Connection refused`

**Checklist**:
1. ✅ Server is running
2. ✅ Firewall allows port 8080
3. ✅ Correct URL (ws:// not wss://)
4. ✅ Correct port number

### Authentication Fails

**Issue**: `Unauthorized` error

**Solution**:
- Use demo token: `demo_user123`
- Check token format in request
- Verify authentication handler logic

### Rate Limit Hit

**Issue**: `Rate limit exceeded`

**Solution**:
- Slow down message frequency
- Wait 1 second between messages
- Increase rate limit in server config

### Session Timeout

**Issue**: Session expires after 5 minutes

**Solution**:
- Send periodic ping messages
- Increase `session_timeout` in config
- Implement auto-reconnect (already done in client)

---

## 📈 Performance Tips

### Backend

1. **Increase Connection Limit**:
   ```rust
   max_connections_per_ip: 100  // Default: 10
   ```

2. **Adjust Rate Limit**:
   ```rust
   rate_limit: 100  // Default: 10 msg/sec
   ```

3. **Optimize Session Timeout**:
   ```rust
   session_timeout: 600  // 10 minutes instead of 5
   ```

### Frontend

1. **Reduce Reconnect Attempts**:
   ```typescript
   maxReconnectAttempts = 3  // Default: 5
   ```

2. **Adjust Ping Interval**:
   ```typescript
   pingInterval = 60000  // 60 seconds instead of 30
   ```

3. **Batch Messages**:
   ```typescript
   // Send multiple messages together
   messages.forEach(msg => client.send(msg))
   ```

---

## 🔐 Security Notes

### Production Deployment

1. **Use WSS (WebSocket Secure)**:
   ```typescript
   VITE_WS_URL=wss://your-domain.com/ws
   ```

2. **Implement Real JWT Validation**:
   - Replace placeholder token validation
   - Add JWT verification library
   - Validate signature and expiration

3. **Enable TLS on Server**:
   - Use nginx/caddy as reverse proxy
   - Configure SSL certificates
   - Force HTTPS/WSS only

4. **Rate Limiting**:
   - Adjust for production workload
   - Consider per-user limits
   - Log rate limit violations

5. **Session Management**:
   - Store sessions in Redis/database
   - Implement session revocation
   - Add audit logging

---

## 📚 Additional Resources

- [SPRINT_4_1_COMPLETION_REPORT.md](./SPRINT_4_1_COMPLETION_REPORT.md) - Complete technical documentation
- [examples/websocket_demo.rs](./examples/websocket_demo.rs) - Demo server example
- [src/websocket/](./src/websocket/) - Backend implementation
- [apps/dashboard/src/services/websocket.ts](./apps/dashboard/src/services/websocket.ts) - Client implementation

---

## 💬 Support

For issues or questions:
1. Check this guide first
2. Review the completion report
3. Check test cases for examples
4. Open a GitHub issue

---

*BIZRA Genesis Node - Professional Elite WebSocket Implementation*
*Sprint 4.1 Week 31-32 - Agent Interaction Interface*
