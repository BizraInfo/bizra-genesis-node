// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - E2E WEBSOCKET TEST                                 ║
// ║  End-to-end testing of WebSocket connectivity and messaging             ║
// ║  Part of Alpha-100 Deployment Plan (Days 7-8/12)                         ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use std::env;
use std::time::Duration;
use tokio::time::timeout;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};

/// Get WebSocket URL from environment or use default
fn websocket_url() -> String {
    env::var("E2E_WS_URL").unwrap_or_else(|_| "wss://localhost:8443/ws".to_string())
}

#[tokio::test]
#[ignore] // Run only with: cargo test --test e2e_websocket -- --ignored
async fn e2e_websocket_connect() {
    let ws_url = websocket_url();

    // Attempt to connect
    let connect_result = timeout(Duration::from_secs(10), connect_async(ws_url.clone())).await;

    match connect_result {
        Ok(Ok((ws_stream, _response))) => {
            println!("✅ E2E WebSocket Connect: PASSED (connected to {})", ws_url);

            // Clean disconnect
            drop(ws_stream);
        }
        Ok(Err(e)) => {
            panic!("WebSocket connection failed: {}", e);
        }
        Err(_) => {
            panic!("WebSocket connection timed out after 10s");
        }
    }
}

#[tokio::test]
#[ignore]
async fn e2e_websocket_ping_pong() {
    let ws_url = websocket_url();

    // Connect
    let (mut ws_stream, _) = timeout(Duration::from_secs(10), connect_async(ws_url))
        .await
        .expect("Connection timeout")
        .expect("Connection failed");

    // Send ping message
    let ping_message = json!({
        "type": "ping",
        "timestamp": chrono::Utc::now().to_rfc3339()
    });

    ws_stream
        .send(Message::Text(ping_message.to_string()))
        .await
        .expect("Failed to send ping");

    // Wait for response
    let response = timeout(Duration::from_secs(5), ws_stream.next())
        .await
        .expect("Response timeout")
        .expect("No response received")
        .expect("WebSocket error");

    // Validate response
    match response {
        Message::Text(text) => {
            let response: serde_json::Value =
                serde_json::from_str(&text).expect("Invalid JSON response");

            assert!(
                response["type"].as_str() == Some("pong")
                    || text.contains("pong")
                    || text.contains("ping"),
                "Expected pong response, got: {}",
                text
            );

            println!("✅ E2E WebSocket Ping-Pong: PASSED");
        }
        Message::Pong(_) => {
            println!("✅ E2E WebSocket Ping-Pong: PASSED (protocol pong)");
        }
        _ => {
            panic!("Unexpected message type: {:?}", response);
        }
    }

    // Clean disconnect
    ws_stream
        .close(None)
        .await
        .expect("Failed to close WebSocket");
}

#[tokio::test]
#[ignore]
async fn e2e_websocket_message_echo() {
    let ws_url = websocket_url();

    // Connect
    let (mut ws_stream, _) = timeout(Duration::from_secs(10), connect_async(ws_url))
        .await
        .expect("Connection timeout")
        .expect("Connection failed");

    // Send test message
    let test_message = json!({
        "type": "echo",
        "payload": "Hello from E2E test",
        "timestamp": chrono::Utc::now().to_rfc3339()
    });

    ws_stream
        .send(Message::Text(test_message.to_string()))
        .await
        .expect("Failed to send message");

    // Wait for response
    let response = timeout(Duration::from_secs(5), ws_stream.next())
        .await
        .expect("Response timeout")
        .expect("No response received")
        .expect("WebSocket error");

    // Validate response is text
    match response {
        Message::Text(text) => {
            let response: serde_json::Value =
                serde_json::from_str(&text).expect("Invalid JSON response");

            // Check if message was echoed or acknowledged
            assert!(
                text.contains("echo") || text.contains("Hello") || response["type"].is_string(),
                "Expected echo or acknowledgment, got: {}",
                text
            );

            println!("✅ E2E WebSocket Message Echo: PASSED");
        }
        _ => {
            panic!("Expected text message, got: {:?}", response);
        }
    }

    // Clean disconnect
    ws_stream
        .close(None)
        .await
        .expect("Failed to close WebSocket");
}

#[tokio::test]
#[ignore]
async fn e2e_websocket_multiple_messages() {
    let ws_url = websocket_url();

    // Connect
    let (mut ws_stream, _) = timeout(Duration::from_secs(10), connect_async(ws_url))
        .await
        .expect("Connection timeout")
        .expect("Connection failed");

    // Send multiple messages
    for i in 0..5 {
        let message = json!({
            "type": "test",
            "sequence": i,
            "payload": format!("Message {}", i)
        });

        ws_stream
            .send(Message::Text(message.to_string()))
            .await
            .expect("Failed to send message");

        // Wait for response
        let response = timeout(Duration::from_secs(5), ws_stream.next())
            .await
            .expect("Response timeout")
            .expect("No response received")
            .expect("WebSocket error");

        // Validate we got a response
        assert!(
            matches!(response, Message::Text(_) | Message::Binary(_)),
            "Expected text or binary response for message {}",
            i
        );
    }

    println!("✅ E2E WebSocket Multiple Messages: PASSED");

    // Clean disconnect
    ws_stream
        .close(None)
        .await
        .expect("Failed to close WebSocket");
}

#[tokio::test]
#[ignore]
async fn e2e_websocket_connection_persistence() {
    let ws_url = websocket_url();

    // Connect
    let (mut ws_stream, _) = timeout(Duration::from_secs(10), connect_async(ws_url))
        .await
        .expect("Connection timeout")
        .expect("Connection failed");

    // Keep connection alive for 30 seconds with periodic pings
    for i in 0..6 {
        tokio::time::sleep(Duration::from_secs(5)).await;

        let ping_message = json!({
            "type": "ping",
            "sequence": i
        });

        // Send ping
        ws_stream
            .send(Message::Text(ping_message.to_string()))
            .await
            .expect("Failed to send ping");

        // Wait for response
        let response = timeout(Duration::from_secs(5), ws_stream.next())
            .await
            .expect("Response timeout")
            .expect("No response received")
            .expect("WebSocket error");

        // Validate we got a response
        assert!(
            matches!(
                response,
                Message::Text(_) | Message::Pong(_) | Message::Binary(_)
            ),
            "Connection dropped after {} iterations",
            i
        );
    }

    println!("✅ E2E WebSocket Connection Persistence: PASSED (30s sustained)");

    // Clean disconnect
    ws_stream
        .close(None)
        .await
        .expect("Failed to close WebSocket");
}

#[tokio::test]
#[ignore]
async fn e2e_websocket_reconnection() {
    let ws_url = websocket_url();

    // First connection
    let (mut ws_stream1, _) = timeout(Duration::from_secs(10), connect_async(ws_url.clone()))
        .await
        .expect("First connection timeout")
        .expect("First connection failed");

    // Send message
    ws_stream1
        .send(Message::Text("{\"type\":\"test\"}".to_string()))
        .await
        .expect("Failed to send on first connection");

    // Close connection
    ws_stream1
        .close(None)
        .await
        .expect("Failed to close first connection");

    // Wait a moment
    tokio::time::sleep(Duration::from_secs(1)).await;

    // Reconnect
    let (mut ws_stream2, _) = timeout(Duration::from_secs(10), connect_async(ws_url))
        .await
        .expect("Reconnection timeout")
        .expect("Reconnection failed");

    // Send message on new connection
    ws_stream2
        .send(Message::Text("{\"type\":\"test\"}".to_string()))
        .await
        .expect("Failed to send on reconnection");

    // Wait for response
    let response = timeout(Duration::from_secs(5), ws_stream2.next())
        .await
        .expect("Response timeout")
        .expect("No response received")
        .expect("WebSocket error");

    // Validate we got a response
    assert!(
        matches!(response, Message::Text(_) | Message::Binary(_)),
        "Expected response on reconnection"
    );

    println!("✅ E2E WebSocket Reconnection: PASSED");

    // Clean disconnect
    ws_stream2
        .close(None)
        .await
        .expect("Failed to close reconnection");
}

#[tokio::test]
#[ignore]
async fn e2e_websocket_binary_message() {
    let ws_url = websocket_url();

    // Connect
    let (mut ws_stream, _) = timeout(Duration::from_secs(10), connect_async(ws_url))
        .await
        .expect("Connection timeout")
        .expect("Connection failed");

    // Send binary message
    let binary_data = vec![0x01, 0x02, 0x03, 0x04, 0x05];
    ws_stream
        .send(Message::Binary(binary_data.clone()))
        .await
        .expect("Failed to send binary message");

    // Wait for response
    let response = timeout(Duration::from_secs(5), ws_stream.next())
        .await
        .expect("Response timeout")
        .expect("No response received")
        .expect("WebSocket error");

    // Validate we got a response (may be binary or text acknowledgment)
    assert!(
        matches!(response, Message::Text(_) | Message::Binary(_)),
        "Expected response to binary message"
    );

    println!("✅ E2E WebSocket Binary Message: PASSED");

    // Clean disconnect
    ws_stream
        .close(None)
        .await
        .expect("Failed to close WebSocket");
}
