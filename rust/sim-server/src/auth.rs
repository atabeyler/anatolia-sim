use axum::{
    extract::State,
    http::{header, HeaderValue, StatusCode},
    response::IntoResponse,
    Json,
};
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::Utc;
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::db::{create_or_update_user, load_user_by_code, load_user_by_id, UserRow, AppState};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub id: String,
    pub username: String,
    pub email: String,
    pub role: String,
    pub exp: usize,
}

#[derive(Debug, Deserialize)]
pub struct RegisterPayload {
    pub first_name: String,
    pub last_name: String,
    pub tc_no: String,
    pub email: String,
    pub password: String,
    pub user_code: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginPayload {
    pub user_code: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct PublicUser {
    pub id: String,
    pub username: String,
    pub email: String,
    pub role: String,
    pub first_name: String,
    pub last_name: String,
}

pub fn public_user(user: &UserRow) -> PublicUser {
    PublicUser {
        id: user.id.clone(),
        username: user.user_code.clone().or_else(|| user.username.clone()).unwrap_or_default(),
        email: user.email.clone(),
        role: user.role.clone().unwrap_or_else(|| "pending".to_string()),
        first_name: user.first_name.clone(),
        last_name: user.last_name.clone(),
    }
}

pub fn access_secret() -> String {
    std::env::var("JWT_SECRET").unwrap_or_else(|_| "anatolia-sim-local-access-secret".to_string())
}

pub fn refresh_secret() -> String {
    std::env::var("JWT_REFRESH_SECRET").unwrap_or_else(|_| "anatolia-sim-local-refresh-secret".to_string())
}

pub fn is_desktop_local_db() -> bool {
    matches!(std::env::var("DESKTOP_LOCAL_DB"), Ok(v) if v == "1" || v.eq_ignore_ascii_case("true"))
}

pub fn validate_password(password: &str) -> Option<&'static str> {
    if password.len() < 8 {
        return Some("Password must be at least 8 characters.");
    }
    if !password.chars().any(|c| c.is_ascii_uppercase()) {
        return Some("Password must contain at least one uppercase letter.");
    }
    if !password.chars().any(|c| c.is_ascii_lowercase()) {
        return Some("Password must contain at least one lowercase letter.");
    }
    if !password.chars().any(|c| c.is_ascii_digit()) {
        return Some("Password must contain at least one digit.");
    }
    if !password.chars().any(|c| !c.is_ascii_alphanumeric()) {
        return Some("Password must contain at least one punctuation/special character.");
    }
    None
}

fn sign_access(user: &UserRow) -> Result<String, jsonwebtoken::errors::Error> {
    let claims = Claims {
        id: user.id.clone(),
        username: user.user_code.clone().or_else(|| user.username.clone()).unwrap_or_default(),
        email: user.email.clone(),
        role: user.role.clone().unwrap_or_else(|| "pending".to_string()),
        exp: (Utc::now().timestamp() + 15 * 60) as usize,
    };
    encode(&Header::default(), &claims, &EncodingKey::from_secret(access_secret().as_bytes()))
}

fn sign_refresh(user_id: &str) -> Result<String, jsonwebtoken::errors::Error> {
    let claims = Claims {
        id: user_id.to_string(),
        username: String::new(),
        email: String::new(),
        role: String::new(),
        exp: (Utc::now().timestamp() + 30 * 24 * 60 * 60) as usize,
    };
    encode(&Header::default(), &claims, &EncodingKey::from_secret(refresh_secret().as_bytes()))
}

fn cookie_value(token: &str) -> String {
    let is_prod = std::env::var("NODE_ENV").map(|v| v == "production").unwrap_or(false) || std::env::var("RENDER").is_ok();
    format!(
        "refresh_token={}; Path=/; HttpOnly; SameSite={}; Max-Age={};{}",
        token,
        if is_prod { "None" } else { "Strict" },
        30 * 24 * 60 * 60,
        if is_prod { " Secure;" } else { "" },
    )
}

fn extract_cookie(req: &axum::http::HeaderMap, name: &str) -> Option<String> {
    let raw = req.get(header::COOKIE)?.to_str().ok()?;
    raw.split(';')
        .map(|part| part.trim())
        .find_map(|part| part.strip_prefix(&format!("{name}=")).map(|v| v.to_string()))
}

pub fn decode_access_token(token: &str) -> Option<Claims> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(access_secret().as_bytes()),
        &Validation::new(Algorithm::HS256),
    )
    .ok()
    .map(|data| data.claims)
}

pub fn decode_refresh_token(token: &str) -> Option<Claims> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(refresh_secret().as_bytes()),
        &Validation::new(Algorithm::HS256),
    )
    .ok()
    .map(|data| data.claims)
}

pub fn auth_user_from_headers(headers: &axum::http::HeaderMap) -> Option<Claims> {
    let value = headers.get(header::AUTHORIZATION)?.to_str().ok()?;
    let token = value.strip_prefix("Bearer ")?;
    decode_access_token(token)
}

pub fn require_admin(headers: &axum::http::HeaderMap) -> bool {
    auth_user_from_headers(headers).map(|u| u.role == "admin").unwrap_or(false)
}

pub async fn register(State(state): State<AppState>, Json(payload): Json<RegisterPayload>) -> impl IntoResponse {
    if payload.first_name.trim().is_empty()
        || payload.last_name.trim().is_empty()
        || payload.tc_no.trim().is_empty()
        || payload.email.trim().is_empty()
        || payload.password.is_empty()
        || payload.user_code.trim().is_empty()
    {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "All fields are required."}))).into_response();
    }

    if !payload.tc_no.chars().all(|c| c.is_ascii_digit()) || payload.tc_no.len() != 11 {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "National ID must be an 11-digit number."}))).into_response();
    }

    let code = payload.user_code.trim().to_uppercase();
    if !(4..=20).contains(&code.len()) || !code.chars().all(|c| c.is_ascii_uppercase() || c.is_ascii_digit()) {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "User code must be 4-20 characters, letters and digits only."}))).into_response();
    }

    if let Some(err) = validate_password(&payload.password) {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": err}))).into_response();
    }

    let hashed = match hash(&payload.password, DEFAULT_COST) {
        Ok(v) => v,
        Err(err) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    };
    let is_approved = is_desktop_local_db();
    let role = if is_approved { "user" } else { "pending" };

    match create_or_update_user(
        &state.backend,
        &code,
        &payload.email.trim().to_lowercase(),
        payload.first_name.trim(),
        payload.last_name.trim(),
        payload.tc_no.trim(),
        &hashed,
        role,
        is_approved,
    )
    .await
    {
        Ok(Some(_)) => {
            if is_approved {
                (StatusCode::CREATED, Json(json!({"message": "Registration complete. You can sign in now."}))).into_response()
            } else {
                (StatusCode::CREATED, Json(json!({"message": "Your registration request has been received. Awaiting admin approval."}))).into_response()
            }
        }
        Ok(None) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Registration failed."}))).into_response(),
        Err(err) => {
            let msg = err.to_string();
            if msg.contains("unique") {
                (StatusCode::CONFLICT, Json(json!({"error": "This email, national ID, or user code is already registered."}))).into_response()
            } else {
                (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Registration failed."}))).into_response()
            }
        }
    }
}

pub async fn login(State(state): State<AppState>, Json(payload): Json<LoginPayload>) -> impl IntoResponse {
    let user = match load_user_by_code(&state.backend, &payload.user_code).await {
        Ok(Some(user)) => user,
        Ok(None) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Invalid user code or password."}))).into_response(),
        Err(err) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    };

    if !verify(&payload.password, &user.password_hash).unwrap_or(false) {
        return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Invalid user code or password."}))).into_response();
    }
    if user.is_banned != 0 {
        let reason = user.ban_reason.clone().map(|r| format!(" Reason: {r}")).unwrap_or_default();
        return (StatusCode::FORBIDDEN, Json(json!({"error": format!("Your account has been banned.{reason}")}))).into_response();
    }
    if user.is_approved == 0 && !is_desktop_local_db() {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Your account has not been approved yet. Please wait for admin approval."}))).into_response();
    }

    let access_token = match sign_access(&user) {
        Ok(token) => token,
        Err(err) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    };
    let refresh_token = match sign_refresh(&user.id) {
        Ok(token) => token,
        Err(err) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    };

    let user_public = public_user(&user);
    let mut response = Json(json!({
        "access_token": access_token,
        "user": user_public,
    }))
    .into_response();
    if let Ok(value) = HeaderValue::from_str(&cookie_value(&refresh_token)) {
        response.headers_mut().insert(header::SET_COOKIE, value);
    }
    response
}

pub async fn refresh(State(state): State<AppState>, headers: axum::http::HeaderMap) -> impl IntoResponse {
    let token = match extract_cookie(&headers, "refresh_token") {
        Some(token) => token,
        None => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Session expired."}))).into_response(),
    };
    let claims = match decode_refresh_token(&token) {
        Some(claims) => claims,
        None => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Invalid session."}))).into_response(),
    };
    let user = match load_user_by_id(&state.backend, &claims.id).await {
        Ok(Some(user)) => user,
        _ => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Invalid session."}))).into_response(),
    };
    if user.is_banned != 0 || user.is_approved == 0 {
        return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Invalid session."}))).into_response();
    }
    let access_token = match sign_access(&user) {
        Ok(token) => token,
        Err(err) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    };
    Json(json!({
        "access_token": access_token,
        "user": public_user(&user),
    }))
    .into_response()
}

pub async fn logout() -> impl IntoResponse {
    let mut response = Json(json!({"message": "Logged out."})).into_response();
    response.headers_mut().insert(
        header::SET_COOKIE,
        HeaderValue::from_static("refresh_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Strict"),
    );
    response
}

pub async fn pending_status(State(state): State<AppState>, axum::extract::Path(user_code): axum::extract::Path<String>) -> impl IntoResponse {
    match load_user_by_code(&state.backend, &user_code).await {
        Ok(Some(user)) if user.is_banned != 0 => Json(json!({ "status": "banned" })).into_response(),
        Ok(Some(user)) if user.is_approved != 0 => Json(json!({ "status": "approved" })).into_response(),
        Ok(Some(_)) => Json(json!({ "status": "pending" })).into_response(),
        Ok(None) => Json(json!({ "status": "not_found" })).into_response(),
        Err(_) => Json(json!({ "status": "error" })).into_response(),
    }
}
