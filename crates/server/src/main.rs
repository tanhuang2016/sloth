use axum::{routing::get, routing::post, Json, Router};
use sloth_core::{GreetRequest, GreetResponse};
use tower_http::cors::CorsLayer;

async fn greet(Json(payload): Json<GreetRequest>) -> Json<GreetResponse> {
    Json(sloth_core::greet(payload.name))
}

async fn heartbeat() -> Json<serde_json::Value> {
    use std::time::{SystemTime, UNIX_EPOCH};

    let dur = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();

    Json(serde_json::json!({
        "now_unix_ms": dur.as_millis(),
        "now_unix_s": dur.as_secs(),
    }))
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/api/greet", post(greet))
        .route("/api/heartbeat", get(heartbeat))
        .layer(CorsLayer::permissive());

    let addr = std::env::var("SLOTH_SERVER_ADDR").unwrap_or_else(|_| "127.0.0.1:3001".into());

    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("failed to bind");

    axum::serve(listener, app).await.expect("server error");
}

