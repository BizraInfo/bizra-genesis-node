# ⚡ WebSocket Quick Testing Guide

**Time Required**: 5 minutes
**Purpose**: Verify WebSocket integration works end-to-end

---

## 🚀 FASTEST PATH TO TESTING

### Option 1: Full Stack Test (Both Servers)

**Terminal 1 - WebSocket Server**:
```bash
cd c:\bizra-genesis-node
cargo run --example websocket_demo
```
Wait for: `✅ WebSocket server listening on 127.0.0.1:8080`

**Terminal 2 - Dashboard**:
```bash
cd c:\bizra-genesis-node\apps\dashboard
npm run dev
```
Wait for: `➜  Local:   http://localhost:5173/`

**Browser**:
1. Open `http://localhost:5173`
2. Login: `demo@bizra.ai` / `demo123`
3. Navigate to **Agents** page
4. Select any agent (e.g., "ACE - Advanced Coding Engine")
5. Type a message and press Send
6. **Verify**: Real-time response appears

**Expected Result**: ✅ Message sent, agent responds in real-time

---

### Option 2: HTML Test Client (No Login Required)

**Terminal 1 - WebSocket Server**:
```bash
cd c:\bizra-genesis-node
cargo run --example websocket_demo
```

**Browser**:
1. Open `test-websocket.html` (double-click file)
2. Click **"Connect"** button
3. Verify status shows "Connected" (green dot)
4. Click **"Send Message"** button
5. **Verify**: Response appears in messages panel

**Expected Result**: ✅ Echo response from WebSocket server

---

### Option 3: Command Line Test (wscat)

**Terminal 1 - WebSocket Server**:
```bash
cargo run --example websocket_demo
```

**Terminal 2 - wscat Client**:
```bash
# Install wscat (if not installed)
npm install -g wscat

# Connect to server
wscat -c ws://localhost:8080

# Send authentication
{"message_type":"authenticate","payload":{"token":"demo_user123"}}

# Send agent message
{"message_type":"agent_message","payload":{"agent_id":"ACE","content":"Hello!"}}
```

**Expected Result**: ✅ JSON responses from server

---

## 📊 SUCCESS INDICATORS

### ✅ **WebSocket Server Running**
```
✅ WebSocket server listening on 127.0.0.1:8080
📥 New connection from: 127.0.0.1:XXXXX
✨ Session created: 550e8400-e29b-41d4-a716-446655440000
```

### ✅ **React Client Connected**
**Browser Console**:
```
✅ WebSocket connected
✅ Authenticated as demo_user123
```

### ✅ **Messages Flowing**
**Server Logs**:
```
📥 New connection from: 127.0.0.1:XXXXX
✨ Session created: abc-123-def
📨 Received: authenticate
📨 Received: agent_message
```

**Client Logs**:
```
📨 Received: auth_response
📨 Received: agent_response
```

---

## 🔧 TROUBLESHOOTING

### Problem: "Connection refused"
**Cause**: WebSocket server not running
**Solution**: Start server with `cargo run --example websocket_demo`

### Problem: "Authentication failed"
**Cause**: Invalid token or server not accepting demo tokens
**Solution**: Use token `demo_user123` or check server logs

### Problem: "No response from agent"
**Cause**: Agent message not reaching server
**Solution**:
1. Check browser console for errors
2. Verify WebSocket status is "Connected"
3. Check server logs for received messages

### Problem: TypeScript errors in dashboard
**Cause**: Missing dependencies or type definitions
**Solution**:
```bash
cd apps/dashboard
npm install
npm run type-check
```

### Problem: Rust compilation errors
**Cause**: Missing dependencies or outdated Rust
**Solution**:
```bash
rustc --version  # Should be 1.75+
cargo build --release
```

---

## 🎯 QUICK VERIFICATION CHECKLIST

- [ ] WebSocket server starts without errors
- [ ] React dashboard starts without errors
- [ ] Browser connects to dashboard (no console errors)
- [ ] Login works with demo credentials
- [ ] WebSocket connection establishes automatically
- [ ] Agents page loads with 18 agents visible
- [ ] Can select an agent
- [ ] Can send a message
- [ ] Agent responds in real-time
- [ ] Connection status indicator shows "Connected"

---

## 📈 PERFORMANCE EXPECTATIONS

| Metric | Expected | Actual |
|--------|----------|--------|
| **Connection Time** | < 100ms | ___ |
| **Message Latency** | < 50ms | ___ |
| **Authentication Time** | < 200ms | ___ |
| **Response Time** | < 500ms | ___ |
| **Reconnection Time** | < 2s | ___ |

---

## 🔍 DEBUGGING TIPS

### Enable Verbose Logging

**Rust Server**:
```bash
RUST_LOG=debug cargo run --example websocket_demo
```

**React Client**:
Open browser DevTools:
- **Console**: See WebSocket connection logs
- **Network > WS**: See WebSocket traffic
- **Application > Local Storage**: See stored tokens

### Common Log Patterns

**✅ Successful Connection**:
```
Server: 📥 New connection from: 127.0.0.1:XXXXX
Client: ✅ WebSocket connected
Server: ✨ Session created: abc-123
Client: ✅ Authenticated as demo_user123
```

**❌ Failed Connection**:
```
Client: ❌ WebSocket error: Connection refused
Client: 🔄 Reconnecting in 1000ms (attempt 1/5)
```

**✅ Successful Message**:
```
Client: 📤 Sent: agent_message
Server: 📨 Received: agent_message
Server: ✅ Handling message for session: abc-123
Client: 📨 Received: agent_response
```

---

## 🎖️ NEXT STEPS AFTER VERIFICATION

Once you confirm WebSocket works:

1. **Connect to Real Agents** - Route messages to 18-agent system
2. **Add Live Synthesis** - Stream synthesis workflow progress
3. **Polish Error Handling** - Improve UX for connection issues
4. **Performance Testing** - Load test with multiple concurrent users
5. **Security Audit** - Verify encryption and authentication

---

*BIZRA Genesis Node - WebSocket Testing Guide*
*Professional Elite Implementation - Phase 4A.2*
