// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - WEBSOCKET DEMONSTRATION                            ║
// ║  Complete WebSocket server with encryption, rate limiting, and agents    ║
// ║  Sprint 4.1 Week 31-32: Agent Interaction Interface                      ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use bizra_genesis_node::websocket::{WebSocketConfig, WebSocketServer};

#[tokio::main]
async fn main() -> Result<(), String> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    println!("╔════════════════════════════════════════════════════════════════╗");
    println!("║  BIZRA GENESIS NODE - WEBSOCKET SERVER                        ║");
    println!("║  Real-time Agent Communication Infrastructure                 ║");
    println!("╚════════════════════════════════════════════════════════════════╝");
    println!();

    // Create WebSocket configuration
    let config = WebSocketConfig {
        bind_address: "127.0.0.1:8080".to_string(),
        max_connections_per_ip: 10,
        rate_limit: 10, // 10 messages per second
        enable_encryption: true,
        session_timeout: 300,          // 5 minutes
        max_message_size: 1024 * 1024, // 1MB
    };

    println!("📋 Server Configuration:");
    println!("   • Bind Address: {}", config.bind_address);
    println!("   • Max Connections/IP: {}", config.max_connections_per_ip);
    println!("   • Rate Limit: {} msg/sec", config.rate_limit);
    println!(
        "   • Encryption: {}",
        if config.enable_encryption {
            "✅ Enabled"
        } else {
            "❌ Disabled"
        }
    );
    println!("   • Session Timeout: {}s", config.session_timeout);
    println!("   • Max Message Size: {} bytes", config.max_message_size);
    println!();

    // Create and start server
    let server = WebSocketServer::new(config);

    println!("🚀 Starting WebSocket server...");
    println!();
    println!("📡 Connect using:");
    println!("   ws://127.0.0.1:8080");
    println!();
    println!("💬 Example messages:");
    println!();
    println!("   1️⃣  Authenticate:");
    println!(r#"   {{"message_type": "authenticate", "payload": {{"token": "demo_user123"}}}}"#);
    println!();
    println!("   2️⃣  Send Agent Message:");
    println!(
        r#"   {{"message_type": "agent_message", "payload": {{"agent_id": "ACE", "content": "Hello!"}}}}"#
    );
    println!();
    println!("   3️⃣  Ping:");
    println!(r#"   {{"message_type": "ping", "payload": {{}}}}"#);
    println!();
    println!("🔧 Features:");
    println!("   ✅ Real-time bidirectional communication");
    println!("   ✅ AES-256-GCM message encryption");
    println!("   ✅ Token bucket rate limiting");
    println!("   ✅ Session management");
    println!("   ✅ Typing indicators");
    println!("   ✅ Presence detection");
    println!("   ✅ Agent message routing");
    println!();
    println!("Press Ctrl+C to stop the server");
    println!("═══════════════════════════════════════════════════════════════");
    println!();

    // Start server (this will run forever)
    server.start().await
}
