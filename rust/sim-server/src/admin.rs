use axum::{
    extract::{Path, State},
    http::{header, HeaderValue, StatusCode},
    response::IntoResponse,
    Json,
};
use bcrypt::hash;
use serde::Deserialize;
use serde_json::json;
use crate::{
    auth::{require_admin, public_user},
    db::{cleanup_simulation_data, delete_user, list_users as load_users, update_user_flag, AppState},
};

#[derive(Debug, Deserialize)]
pub struct BanPayload {
    pub reason: Option<String>,
}

pub async fn list_users(State(state): State<AppState>, headers: axum::http::HeaderMap) -> impl IntoResponse {
    if !require_admin(&headers) {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Admin permission required."}))).into_response();
    }
    match load_users(&state.backend).await {
        Ok(rows) => {
            let payload: Vec<_> = rows
                .into_iter()
                .map(|user| {
                    json!({
                        "id": user.id,
                        "user_code": user.user_code,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                        "tc_no": user.tc_no,
                        "email": user.email,
                        "role": user.role,
                        "is_approved": user.is_approved != 0,
                        "is_banned": user.is_banned != 0,
                        "ban_reason": user.ban_reason,
                        "created_at": user.created_at,
                        "updated_at": user.updated_at,
                        "email_verified": user.email_verified != 0,
                    })
                })
                .collect();
            Json(payload).into_response()
        }
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    }
}

pub async fn approve_user(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: axum::http::HeaderMap,
) -> impl IntoResponse {
    if !require_admin(&headers) {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Admin permission required."}))).into_response();
    }
    match update_user_flag(&state.backend, &id, Some(true), Some(false), None, Some("user")).await {
        Ok(Some(user)) => Json(json!({"message": "User approved.", "user": public_user(&user)})).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, Json(json!({"error": "User not found."}))).into_response(),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    }
}

pub async fn reject_user(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: axum::http::HeaderMap,
) -> impl IntoResponse {
    if !require_admin(&headers) {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Admin permission required."}))).into_response();
    }
    match delete_user(&state.backend, &id).await {
        Ok(true) => Json(json!({"message": "Request rejected."})).into_response(),
        Ok(false) => (StatusCode::NOT_FOUND, Json(json!({"error": "User not found or already approved."}))).into_response(),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    }
}

pub async fn ban_user(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<BanPayload>,
) -> impl IntoResponse {
    if !require_admin(&headers) {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Admin permission required."}))).into_response();
    }
    match update_user_flag(&state.backend, &id, None, Some(true), payload.reason.as_deref(), None).await {
        Ok(Some(_)) => Json(json!({"message": "User banned."})).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, Json(json!({"error": "User not found."}))).into_response(),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    }
}

pub async fn unban_user(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: axum::http::HeaderMap,
) -> impl IntoResponse {
    if !require_admin(&headers) {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Admin permission required."}))).into_response();
    }
    match update_user_flag(&state.backend, &id, None, Some(false), None, None).await {
        Ok(Some(_)) => Json(json!({"message": "Ban lifted."})).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, Json(json!({"error": "User not found."}))).into_response(),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    }
}

pub async fn delete_user_route(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: axum::http::HeaderMap,
) -> impl IntoResponse {
    if !require_admin(&headers) {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Admin permission required."}))).into_response();
    }
    match delete_user(&state.backend, &id).await {
        Ok(true) => Json(json!({"message": "User deleted."})).into_response(),
        Ok(false) => (StatusCode::NOT_FOUND, Json(json!({"error": "User not found."}))).into_response(),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    }
}

pub async fn seed_admin(State(state): State<AppState>, headers: axum::http::HeaderMap) -> impl IntoResponse {
    let expected = std::env::var("ADMIN_SEED_TOKEN").unwrap_or_default();
    let provided = headers.get("x-seed-token").and_then(|v| v.to_str().ok()).unwrap_or("");
    if expected.is_empty() || provided != expected {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Admin seed token required."}))).into_response();
    }
    let code = match std::env::var("ADMIN_USER_CODE") {
        Ok(v) if !v.trim().is_empty() => v.trim().to_uppercase(),
        _ => return (StatusCode::BAD_REQUEST, Json(json!({"error": "ADMIN_USER_CODE, ADMIN_PASSWORD and ADMIN_EMAIL env vars are required."}))).into_response(),
    };
    let pass = match std::env::var("ADMIN_PASSWORD") {
        Ok(v) if !v.is_empty() => v,
        _ => return (StatusCode::BAD_REQUEST, Json(json!({"error": "ADMIN_USER_CODE, ADMIN_PASSWORD and ADMIN_EMAIL env vars are required."}))).into_response(),
    };
    let email = match std::env::var("ADMIN_EMAIL") {
        Ok(v) if !v.is_empty() => v,
        _ => return (StatusCode::BAD_REQUEST, Json(json!({"error": "ADMIN_USER_CODE, ADMIN_PASSWORD and ADMIN_EMAIL env vars are required."}))).into_response(),
    };

    let hash = match hash(pass, bcrypt::DEFAULT_COST) {
        Ok(v) => v,
        Err(err) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    };
    let result = crate::db::create_or_update_user(
        &state.backend,
        &code,
        &email,
        "Admin",
        "Administrator",
        "00000000000",
        &hash,
        "admin",
        true,
    )
    .await;
    match result {
        Ok(Some(_)) => Json(json!({"message": "Admin created."})).into_response(),
        Ok(None) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Failed to create admin."}))).into_response(),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Failed to create admin.", "detail": err.to_string()}))).into_response(),
    }
}

pub async fn cleanup_admin(State(state): State<AppState>, headers: axum::http::HeaderMap) -> impl IntoResponse {
    if !require_admin(&headers) {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Admin permission required."}))).into_response();
    }
    match cleanup_simulation_data(&state.backend).await {
        Ok((checkpoints, events, dead)) => Json(json!({
            "message": "Cleanup completed.",
            "checkpoints_deleted": checkpoints,
            "events_deleted": events,
            "dead_individuals_deleted": dead,
            "errors": [],
        }))
        .into_response(),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    }
}

pub async fn test_email(State(_state): State<AppState>, headers: axum::http::HeaderMap) -> impl IntoResponse {
    if !require_admin(&headers) {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Admin permission required."}))).into_response();
    }
    Json(json!({"message": "SMTP not configured in Rust backend yet; endpoint is reachable."})).into_response()
}

pub async fn review(Path(token): Path<String>) -> impl IntoResponse {
    let body = format!(
        "<html><body><h1>Registration Review</h1><p>Rust backend is active. Token: {}</p></body></html>",
        token
    );
    (
        [(header::CONTENT_TYPE, HeaderValue::from_static("text/html; charset=utf-8"))],
        body,
    )
        .into_response()
}

pub async fn quick_approve(Path(token): Path<String>) -> impl IntoResponse {
    let body = format!("<html><body><h1>Approved</h1><p>{}</p></body></html>", token);
    (
        [(header::CONTENT_TYPE, HeaderValue::from_static("text/html; charset=utf-8"))],
        body,
    )
        .into_response()
}

pub async fn quick_reject(Path(token): Path<String>) -> impl IntoResponse {
    let body = format!("<html><body><h1>Rejected</h1><p>{}</p></body></html>", token);
    (
        [(header::CONTENT_TYPE, HeaderValue::from_static("text/html; charset=utf-8"))],
        body,
    )
        .into_response()
}
