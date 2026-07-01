use serde_json::{json, Value};
use sim_core::SimulationState;
use sqlx::{
    sqlite::SqlitePoolOptions,
    FromRow,
    PgPool,
    SqlitePool,
};
use uuid::Uuid;
use std::sync::Arc;

use crate::runtime::RuntimeManager;

#[derive(Clone)]
#[allow(dead_code)]
pub enum DbBackend {
    Postgres(PgPool),
    Sqlite(SqlitePool),
}

#[derive(Clone)]
pub struct AppState {
    pub backend: DbBackend,
    pub runtime: Arc<RuntimeManager>,
}

impl AppState {
    pub async fn new() -> Result<Self, sqlx::Error> {
        let db_path = std::env::current_dir()
            .unwrap_or_else(|_| std::path::PathBuf::from("."))
            .join("rust")
            .join("sim.db");
        let normalized = db_path.to_string_lossy().replace('\\', "/");
        let sqlite_url = format!("sqlite:///{}?mode=rwc", normalized);
        let pool = SqlitePoolOptions::new()
            .max_connections(8)
            .connect(&sqlite_url)
            .await?;
        let backend = DbBackend::Sqlite(pool);

        migrate(&backend).await?;
        Ok(Self {
            backend,
            runtime: Arc::new(RuntimeManager::new()),
        })
    }
}

fn as_pg(backend: &DbBackend) -> Option<&PgPool> {
    match backend {
        DbBackend::Postgres(pool) => Some(pool),
        _ => None,
    }
}

fn as_sqlite(backend: &DbBackend) -> Option<&SqlitePool> {
    match backend {
        DbBackend::Sqlite(pool) => Some(pool),
        _ => None,
    }
}

pub async fn migrate(backend: &DbBackend) -> Result<(), sqlx::Error> {
    if let Some(pool) = as_pg(backend) {
        sqlx::query("CREATE EXTENSION IF NOT EXISTS pgcrypto")
            .execute(pool)
            .await?;
        sqlx::query("CREATE SCHEMA IF NOT EXISTS antsim")
            .execute(pool)
            .await?;
        sqlx::query("SET search_path TO antsim, public")
            .execute(pool)
            .await?;
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_code VARCHAR(20) UNIQUE,
                username VARCHAR(50) UNIQUE,
                first_name VARCHAR(100) NOT NULL DEFAULT '',
                last_name VARCHAR(100) NOT NULL DEFAULT '',
                tc_no VARCHAR(11) UNIQUE,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'pending',
                is_approved BOOLEAN DEFAULT false,
                is_banned BOOLEAN DEFAULT false,
                ban_reason TEXT,
                email_verified BOOLEAN DEFAULT false,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
            "#,
        )
        .execute(pool)
        .await?;
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS simulations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID,
                name VARCHAR(255) NOT NULL,
                status VARCHAR(20) DEFAULT 'paused',
                current_day INTEGER DEFAULT 0,
                current_year INTEGER DEFAULT 0,
                start_latitude DOUBLE PRECISION NOT NULL DEFAULT 0,
                start_longitude DOUBLE PRECISION NOT NULL DEFAULT 0,
                speed_multiplier INTEGER DEFAULT 1,
                founder_1 JSONB NOT NULL DEFAULT '{}'::jsonb,
                founder_2 JSONB NOT NULL DEFAULT '{}'::jsonb,
                world_state JSONB DEFAULT '{}'::jsonb,
                settings JSONB DEFAULT '{}'::jsonb,
                state_json JSONB NOT NULL DEFAULT '{}'::jsonb,
                population_count INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            "#,
        )
        .execute(pool)
        .await?;
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS individuals (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                simulation_id UUID NOT NULL,
                birth_day INTEGER NOT NULL,
                death_day INTEGER,
                alive BOOLEAN DEFAULT true,
                is_dead BOOLEAN DEFAULT false,
                sex VARCHAR(10) NOT NULL DEFAULT 'unknown',
                x DOUBLE PRECISION NOT NULL DEFAULT 0,
                y DOUBLE PRECISION NOT NULL DEFAULT 0,
                genome JSONB NOT NULL DEFAULT '{}'::jsonb,
                phenotype JSONB NOT NULL DEFAULT '{}'::jsonb,
                epigenome JSONB DEFAULT '{}'::jsonb,
                health JSONB DEFAULT '{}'::jsonb,
                mind JSONB DEFAULT '{}'::jsonb,
                social JSONB DEFAULT '{}'::jsonb,
                skills JSONB DEFAULT '[]'::jsonb,
                beliefs JSONB DEFAULT '[]'::jsonb,
                language JSONB DEFAULT '{}'::jsonb,
                memory JSONB DEFAULT '{}'::jsonb,
                parent_1_id UUID,
                parent_2_id UUID,
                death_cause VARCHAR(50),
                is_founder BOOLEAN DEFAULT false,
                home_x DOUBLE PRECISION,
                home_y DOUBLE PRECISION,
                group_id VARCHAR(100),
                inbreeding_coeff DOUBLE PRECISION DEFAULT 0,
                psychology JSONB DEFAULT '{}'::jsonb,
                inventory JSONB DEFAULT '{}'::jsonb,
                known_techs JSONB DEFAULT '[]'::jsonb,
                data_json JSONB,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
            "#,
        )
        .execute(pool)
        .await?;
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS checkpoints (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                simulation_id UUID NOT NULL,
                sim_day INTEGER NOT NULL,
                sim_year INTEGER NOT NULL,
                population_count INTEGER NOT NULL,
                population_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
                world_state JSONB NOT NULL DEFAULT '{}'::jsonb,
                tech_state JSONB NOT NULL DEFAULT '[]'::jsonb,
                belief_state JSONB NOT NULL DEFAULT '[]'::jsonb,
                art_state JSONB NOT NULL DEFAULT '[]'::jsonb,
                groups JSONB NOT NULL DEFAULT '[]'::jsonb,
                stats JSONB NOT NULL DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
            "#,
        )
        .execute(pool)
        .await?;
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS god_interventions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                simulation_id UUID NOT NULL,
                sim_day INTEGER NOT NULL,
                sim_year INTEGER NOT NULL,
                type VARCHAR(50) NOT NULL,
                params JSONB NOT NULL,
                affected_individuals INTEGER DEFAULT 0,
                deaths INTEGER DEFAULT 0,
                user_note TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
            "#,
        )
        .execute(pool)
        .await?;
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS simulation_events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                simulation_id UUID NOT NULL,
                sim_day INTEGER NOT NULL,
                sim_year INTEGER NOT NULL,
                event_type VARCHAR(100) NOT NULL,
                description TEXT,
                data JSONB DEFAULT '{}'::jsonb,
                importance INTEGER DEFAULT 1,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
            "#,
        )
        .execute(pool)
        .await?;
        return Ok(());
    }

    if let Some(pool) = as_sqlite(backend) {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                user_code TEXT UNIQUE,
                username TEXT UNIQUE,
                first_name TEXT NOT NULL DEFAULT '',
                last_name TEXT NOT NULL DEFAULT '',
                tc_no TEXT UNIQUE,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'pending',
                is_approved INTEGER NOT NULL DEFAULT 0,
                is_banned INTEGER NOT NULL DEFAULT 0,
                ban_reason TEXT,
                email_verified INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            "#,
        )
        .execute(pool)
        .await?;
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS simulations (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                status TEXT NOT NULL,
                current_day INTEGER NOT NULL DEFAULT 0,
                current_year INTEGER NOT NULL DEFAULT 0,
                population_count INTEGER NOT NULL DEFAULT 0,
                state_json TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            "#,
        )
        .execute(pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS individuals (
                id TEXT PRIMARY KEY,
                simulation_id TEXT NOT NULL,
                birth_day INTEGER NOT NULL,
                alive INTEGER NOT NULL DEFAULT 1,
                is_dead INTEGER NOT NULL DEFAULT 0,
                data_json TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            "#,
        )
        .execute(pool)
        .await?;
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS checkpoints (
                id TEXT PRIMARY KEY,
                simulation_id TEXT NOT NULL,
                sim_day INTEGER NOT NULL,
                sim_year INTEGER NOT NULL,
                population_count INTEGER NOT NULL,
                population_snapshot TEXT NOT NULL,
                world_state TEXT NOT NULL,
                tech_state TEXT NOT NULL,
                belief_state TEXT NOT NULL,
                art_state TEXT NOT NULL,
                groups TEXT NOT NULL,
                stats TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            "#,
        )
        .execute(pool)
        .await?;
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS god_interventions (
                id TEXT PRIMARY KEY,
                simulation_id TEXT NOT NULL,
                sim_day INTEGER NOT NULL,
                sim_year INTEGER NOT NULL,
                type TEXT NOT NULL,
                params TEXT NOT NULL,
                affected_individuals INTEGER NOT NULL DEFAULT 0,
                deaths INTEGER NOT NULL DEFAULT 0,
                user_note TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            "#,
        )
        .execute(pool)
        .await?;
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS simulation_events (
                id TEXT PRIMARY KEY,
                simulation_id TEXT NOT NULL,
                sim_day INTEGER NOT NULL,
                sim_year INTEGER NOT NULL,
                event_type TEXT NOT NULL,
                description TEXT,
                data TEXT NOT NULL DEFAULT '{}',
                importance INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            "#,
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}

#[derive(Debug, FromRow)]
pub struct SimulationRow {
    pub id: String,
    pub name: String,
    pub status: String,
    pub current_day: i64,
    pub current_year: i64,
    pub population_count: i64,
    pub state_json: Value,
}

#[derive(Debug, FromRow)]
pub struct CheckpointRow {
    pub id: String,
    pub simulation_id: String,
    pub sim_day: i64,
    pub sim_year: i64,
    pub population_count: i64,
    pub population_snapshot: Value,
    pub world_state: Value,
    pub tech_state: Value,
    pub belief_state: Value,
    pub art_state: Value,
    pub groups: Value,
    pub stats: Value,
    pub created_at: String,
}

#[derive(Debug, FromRow)]
pub struct UserRow {
    pub id: String,
    pub user_code: Option<String>,
    pub username: Option<String>,
    pub first_name: String,
    pub last_name: String,
    pub tc_no: Option<String>,
    pub email: String,
    pub password_hash: String,
    pub role: Option<String>,
    pub is_approved: i64,
    pub is_banned: i64,
    pub ban_reason: Option<String>,
    pub email_verified: i64,
    pub created_at: String,
    pub updated_at: String,
}

pub async fn load_simulation(backend: &DbBackend, id: &str) -> Result<Option<SimulationRow>, sqlx::Error> {
    if let Some(pool) = as_pg(backend) {
        return sqlx::query_as::<_, SimulationRow>(
            r#"
            SELECT id::text AS id, name, status, current_day, current_year, population_count, state_json
            FROM simulations
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await;
    }

    if let Some(pool) = as_sqlite(backend) {
        return sqlx::query_as::<_, SimulationRow>(
            r#"
            SELECT id, name, status, current_day, current_year, population_count, state_json
            FROM simulations
            WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await;
    }

    Ok(None)
}

pub async fn save_state(backend: &DbBackend, state: &SimulationState) -> Result<(), sqlx::Error> {
    let id = state
        .id
        .clone()
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    let name = state.name.clone().unwrap_or_else(|| "Untitled Simulation".to_string());
    let state_json = serde_json::to_value(state).unwrap_or_else(|_| serde_json::json!({}));
    let population_count = state.individuals.len() as i64;

    if let Some(pool) = as_pg(backend) {
        sqlx::query(
            r#"
            INSERT INTO simulations (id, name, status, current_day, current_year, speed_multiplier, population_count, state_json, updated_at)
            VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, NOW())
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                status = excluded.status,
                current_day = excluded.current_day,
                current_year = excluded.current_year,
                speed_multiplier = excluded.speed_multiplier,
                population_count = excluded.population_count,
                state_json = excluded.state_json,
                updated_at = NOW()
            "#,
        )
        .bind(id)
        .bind(name)
        .bind(state.status.clone().unwrap_or_else(|| "running".to_string()))
        .bind(state.current_day)
        .bind(state.current_year)
        .bind(state.speed_multiplier.unwrap_or(1))
        .bind(population_count)
        .bind(state_json)
        .execute(pool)
        .await?;
        return Ok(());
    }

    if let Some(pool) = as_sqlite(backend) {
        sqlx::query(
            r#"
            INSERT INTO simulations (id, name, status, current_day, current_year, population_count, state_json, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                status = excluded.status,
                current_day = excluded.current_day,
                current_year = excluded.current_year,
                population_count = excluded.population_count,
                state_json = excluded.state_json,
                updated_at = CURRENT_TIMESTAMP
            "#,
        )
        .bind(id)
        .bind(name)
        .bind(state.status.clone().unwrap_or_else(|| "running".to_string()))
        .bind(state.current_day)
        .bind(state.current_year)
        .bind(population_count)
        .bind(serde_json::to_string(state).unwrap_or_else(|_| "{}".to_string()))
        .execute(pool)
        .await?;
    }

    Ok(())
}

pub async fn update_simulation_fields(
    backend: &DbBackend,
    id: &str,
    status: Option<&str>,
    speed_multiplier: Option<i32>,
) -> Result<Option<SimulationState>, sqlx::Error> {
    let mut state = match load_simulation(backend, id).await? {
        Some(row) => row_to_state(&row),
        None => return Ok(None),
    };

    if let Some(next_status) = status {
        state.status = Some(next_status.to_string());
    }
    if let Some(speed) = speed_multiplier {
        state.speed_multiplier = Some(speed);
    }

    save_state(backend, &state).await?;
    Ok(Some(state))
}

pub async fn delete_simulation(backend: &DbBackend, id: &str) -> Result<bool, sqlx::Error> {
    if let Some(pool) = as_pg(backend) {
        let mut tx = pool.begin().await?;
        let affected = sqlx::query("DELETE FROM individuals WHERE simulation_id = $1")
            .bind(id)
            .execute(&mut *tx)
            .await?
            .rows_affected();
        let _ = sqlx::query("DELETE FROM checkpoints WHERE simulation_id = $1")
            .bind(id)
            .execute(&mut *tx)
            .await?;
        let _ = sqlx::query("DELETE FROM simulations WHERE id = $1")
            .bind(id)
            .execute(&mut *tx)
            .await?;
        tx.commit().await?;
        return Ok(affected > 0);
    }

    if let Some(pool) = as_sqlite(backend) {
        let mut tx = pool.begin().await?;
        let affected = sqlx::query("DELETE FROM individuals WHERE simulation_id = ?")
            .bind(id)
            .execute(&mut *tx)
            .await?
            .rows_affected();
        let _ = sqlx::query("DELETE FROM checkpoints WHERE simulation_id = ?")
            .bind(id)
            .execute(&mut *tx)
            .await?;
        let _ = sqlx::query("DELETE FROM simulations WHERE id = ?")
            .bind(id)
            .execute(&mut *tx)
            .await?;
        tx.commit().await?;
        return Ok(affected > 0);
    }

    Ok(false)
}

pub async fn system_counts(backend: &DbBackend) -> Result<(i64, i64), sqlx::Error> {
    if let Some(pool) = as_pg(backend) {
        let sims = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM simulations WHERE status = 'running'")
            .fetch_one(pool)
            .await?;
        let pop = sqlx::query_scalar::<_, i64>("SELECT COALESCE(SUM(population_count), 0) FROM simulations")
            .fetch_one(pool)
            .await?;
        return Ok((sims, pop));
    }

    if let Some(pool) = as_sqlite(backend) {
        let sims = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM simulations WHERE status = 'running'")
            .fetch_one(pool)
            .await?;
        let pop = sqlx::query_scalar::<_, i64>("SELECT COALESCE(SUM(population_count), 0) FROM simulations")
            .fetch_one(pool)
            .await?;
        return Ok((sims, pop));
    }

    Ok((0, 0))
}

pub async fn list_simulations(backend: &DbBackend) -> Result<Vec<SimulationRow>, sqlx::Error> {
    if let Some(pool) = as_pg(backend) {
        return sqlx::query_as::<_, SimulationRow>(
            r#"
            SELECT id::text AS id, name, status, current_day, current_year, population_count, state_json
            FROM simulations
            ORDER BY updated_at DESC
            "#,
        )
        .fetch_all(pool)
        .await;
    }

    if let Some(pool) = as_sqlite(backend) {
        return sqlx::query_as::<_, SimulationRow>(
            r#"
            SELECT id, name, status, current_day, current_year, population_count, state_json
            FROM simulations
            ORDER BY updated_at DESC
            "#,
        )
        .fetch_all(pool)
        .await;
    }

    Ok(vec![])
}

pub fn row_to_state(row: &SimulationRow) -> SimulationState {
    let mut state: SimulationState = serde_json::from_value(row.state_json.clone()).unwrap_or_default();
    if state.id.is_none() {
        state.id = Some(row.id.clone());
    }
    if state.name.is_none() {
        state.name = Some(row.name.clone());
    }
    state.status = Some(row.status.clone());
    state.current_day = row.current_day as i32;
    state.current_year = row.current_year as i32;
    state.extra.insert("_population_count".to_string(), json!(row.population_count));
    state
}

pub async fn upsert_individuals(backend: &DbBackend, state: &SimulationState) -> Result<(), sqlx::Error> {
    let simulation_id = state
        .id
        .as_deref()
        .and_then(|id| Uuid::parse_str(id).ok())
        .unwrap_or_else(Uuid::nil);

    if let Some(pool) = as_pg(backend) {
        let mut tx = pool.begin().await?;
        for individual in &state.individuals {
            let payload = serde_json::to_value(individual).unwrap_or_else(|_| serde_json::json!({}));
            sqlx::query(
                r#"
                INSERT INTO individuals (id, simulation_id, birth_day, alive, is_dead, data_json, updated_at)
                VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, NOW())
                ON CONFLICT(id) DO UPDATE SET
                    simulation_id = excluded.simulation_id,
                    birth_day = excluded.birth_day,
                    alive = excluded.alive,
                    is_dead = excluded.is_dead,
                    data_json = excluded.data_json,
                    updated_at = NOW()
                "#,
            )
            .bind(Uuid::parse_str(&individual.id).unwrap_or_else(|_| Uuid::new_v4()))
            .bind(simulation_id)
            .bind(individual.birth_day)
            .bind(individual.alive)
            .bind(individual.is_dead)
            .bind(payload)
            .execute(&mut *tx)
            .await?;
        }
        tx.commit().await?;
        return Ok(());
    }

    if let Some(pool) = as_sqlite(backend) {
        let mut tx = pool.begin().await?;
        for individual in &state.individuals {
            let payload = serde_json::to_string(individual).unwrap_or_else(|_| "{}".to_string());
            sqlx::query(
                r#"
                INSERT INTO individuals (id, simulation_id, birth_day, alive, is_dead, data_json, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(id) DO UPDATE SET
                    simulation_id = excluded.simulation_id,
                    birth_day = excluded.birth_day,
                    alive = excluded.alive,
                    is_dead = excluded.is_dead,
                    data_json = excluded.data_json,
                    updated_at = CURRENT_TIMESTAMP
                "#,
            )
            .bind(&individual.id)
            .bind(state.id.clone().unwrap_or_default())
            .bind(individual.birth_day)
            .bind(individual.alive as i32)
            .bind(individual.is_dead as i32)
            .bind(payload)
            .execute(&mut *tx)
            .await?;
        }
        tx.commit().await?;
    }

    Ok(())
}

#[allow(dead_code)]
pub async fn load_individual_payloads(backend: &DbBackend, simulation_id: &str) -> Result<Vec<Value>, sqlx::Error> {
    if let Some(pool) = as_pg(backend) {
        let rows = sqlx::query_scalar::<_, Value>(
            r#"
            SELECT data_json
            FROM individuals
            WHERE simulation_id = $1
            ORDER BY created_at ASC
            "#,
        )
        .bind(simulation_id)
        .fetch_all(pool)
        .await?;
        return Ok(rows);
    }

    if let Some(pool) = as_sqlite(backend) {
        let rows = sqlx::query_scalar::<_, String>(
            r#"
            SELECT data_json
            FROM individuals
            WHERE simulation_id = ?
            ORDER BY created_at ASC
            "#,
        )
        .bind(simulation_id)
        .fetch_all(pool)
        .await?;

        return Ok(rows
            .into_iter()
            .filter_map(|json| serde_json::from_str::<Value>(&json).ok())
            .collect());
    }

    Ok(vec![])
}

pub async fn list_checkpoints(backend: &DbBackend, simulation_id: &str) -> Result<Vec<CheckpointRow>, sqlx::Error> {
    if let Some(pool) = as_pg(backend) {
        return sqlx::query_as::<_, CheckpointRow>(
            r#"
            SELECT
                id::text AS id,
                simulation_id::text AS simulation_id,
                sim_day,
                sim_year,
                population_count,
                population_snapshot,
                world_state,
                tech_state,
                belief_state,
                art_state,
                groups,
                stats,
                created_at::text AS created_at
            FROM checkpoints
            WHERE simulation_id = $1
            ORDER BY sim_day DESC, created_at DESC
            "#,
        )
        .bind(simulation_id)
        .fetch_all(pool)
        .await;
    }

    if let Some(pool) = as_sqlite(backend) {
        return sqlx::query_as::<_, CheckpointRow>(
            r#"
            SELECT
                id,
                simulation_id,
                sim_day,
                sim_year,
                population_count,
                population_snapshot,
                world_state,
                tech_state,
                belief_state,
                art_state,
                groups,
                stats,
                created_at
            FROM checkpoints
            WHERE simulation_id = ?
            ORDER BY sim_day DESC, created_at DESC
            "#,
        )
        .bind(simulation_id)
        .fetch_all(pool)
        .await;
    }

    Ok(vec![])
}

pub async fn load_checkpoint(
    backend: &DbBackend,
    checkpoint_id: &str,
    simulation_id: &str,
) -> Result<Option<CheckpointRow>, sqlx::Error> {
    if let Some(pool) = as_pg(backend) {
        return sqlx::query_as::<_, CheckpointRow>(
            r#"
            SELECT
                id::text AS id,
                simulation_id::text AS simulation_id,
                sim_day,
                sim_year,
                population_count,
                population_snapshot,
                world_state,
                tech_state,
                belief_state,
                art_state,
                groups,
                stats,
                created_at::text AS created_at
            FROM checkpoints
            WHERE id = $1 AND simulation_id = $2
            "#,
        )
        .bind(checkpoint_id)
        .bind(simulation_id)
        .fetch_optional(pool)
        .await;
    }

    if let Some(pool) = as_sqlite(backend) {
        return sqlx::query_as::<_, CheckpointRow>(
            r#"
            SELECT
                id,
                simulation_id,
                sim_day,
                sim_year,
                population_count,
                population_snapshot,
                world_state,
                tech_state,
                belief_state,
                art_state,
                groups,
                stats,
                created_at
            FROM checkpoints
            WHERE id = ? AND simulation_id = ?
            "#,
        )
        .bind(checkpoint_id)
        .bind(simulation_id)
        .fetch_optional(pool)
        .await;
    }

    Ok(None)
}

pub async fn insert_checkpoint(
    backend: &DbBackend,
    checkpoint_id: &str,
    simulation_id: &str,
    sim_day: i32,
    sim_year: i32,
    population_count: i64,
    population_snapshot: Value,
    world_state: Value,
    tech_state: Value,
    belief_state: Value,
    art_state: Value,
    groups: Value,
    stats: Value,
) -> Result<(), sqlx::Error> {
    if let Some(pool) = as_pg(backend) {
        sqlx::query(
            r#"
            INSERT INTO checkpoints (
                id, simulation_id, sim_day, sim_year, population_count,
                population_snapshot, world_state, tech_state, belief_state,
                art_state, groups, stats
            ) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            "#,
        )
        .bind(checkpoint_id)
        .bind(simulation_id)
        .bind(sim_day)
        .bind(sim_year)
        .bind(population_count)
        .bind(population_snapshot)
        .bind(world_state)
        .bind(tech_state)
        .bind(belief_state)
        .bind(art_state)
        .bind(groups)
        .bind(stats)
        .execute(pool)
        .await?;
        return Ok(());
    }

    if let Some(pool) = as_sqlite(backend) {
        sqlx::query(
            r#"
            INSERT INTO checkpoints (
                id, simulation_id, sim_day, sim_year, population_count,
                population_snapshot, world_state, tech_state, belief_state,
                art_state, groups, stats
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(checkpoint_id)
        .bind(simulation_id)
        .bind(sim_day)
        .bind(sim_year)
        .bind(population_count)
        .bind(population_snapshot.to_string())
        .bind(world_state.to_string())
        .bind(tech_state.to_string())
        .bind(belief_state.to_string())
        .bind(art_state.to_string())
        .bind(groups.to_string())
        .bind(stats.to_string())
        .execute(pool)
        .await?;
    }

    Ok(())
}

pub async fn load_user_by_code(backend: &DbBackend, user_code: &str) -> Result<Option<UserRow>, sqlx::Error> {
    if let Some(pool) = as_pg(backend) {
        return sqlx::query_as::<_, UserRow>(
            r#"
            SELECT
                id::text AS id,
                user_code,
                username,
                first_name,
                last_name,
                tc_no,
                email,
                password_hash,
                role,
                is_approved::int8 AS is_approved,
                is_banned::int8 AS is_banned,
                ban_reason,
                email_verified::int8 AS email_verified,
                created_at::text AS created_at,
                updated_at::text AS updated_at
            FROM users
            WHERE upper(user_code) = upper($1)
            "#,
        )
        .bind(user_code)
        .fetch_optional(pool)
        .await;
    }

    if let Some(pool) = as_sqlite(backend) {
        return sqlx::query_as::<_, UserRow>(
            r#"
            SELECT
                id,
                user_code,
                username,
                first_name,
                last_name,
                tc_no,
                email,
                password_hash,
                role,
                is_approved,
                is_banned,
                ban_reason,
                email_verified,
                created_at,
                updated_at
            FROM users
            WHERE upper(user_code) = upper(?)
            "#,
        )
        .bind(user_code)
        .fetch_optional(pool)
        .await;
    }

    Ok(None)
}

pub async fn load_user_by_id(backend: &DbBackend, id: &str) -> Result<Option<UserRow>, sqlx::Error> {
    if let Some(pool) = as_pg(backend) {
        return sqlx::query_as::<_, UserRow>(
            r#"
            SELECT
                id::text AS id,
                user_code,
                username,
                first_name,
                last_name,
                tc_no,
                email,
                password_hash,
                role,
                is_approved::int8 AS is_approved,
                is_banned::int8 AS is_banned,
                ban_reason,
                email_verified::int8 AS email_verified,
                created_at::text AS created_at,
                updated_at::text AS updated_at
            FROM users
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await;
    }

    if let Some(pool) = as_sqlite(backend) {
        return sqlx::query_as::<_, UserRow>(
            r#"
            SELECT
                id,
                user_code,
                username,
                first_name,
                last_name,
                tc_no,
                email,
                password_hash,
                role,
                is_approved,
                is_banned,
                ban_reason,
                email_verified,
                created_at,
                updated_at
            FROM users
            WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await;
    }

    Ok(None)
}

pub async fn list_users(backend: &DbBackend) -> Result<Vec<UserRow>, sqlx::Error> {
    if let Some(pool) = as_pg(backend) {
        return sqlx::query_as::<_, UserRow>(
            r#"
            SELECT
                id::text AS id,
                user_code,
                username,
                first_name,
                last_name,
                tc_no,
                email,
                password_hash,
                role,
                is_approved::int8 AS is_approved,
                is_banned::int8 AS is_banned,
                ban_reason,
                email_verified::int8 AS email_verified,
                created_at::text AS created_at,
                updated_at::text AS updated_at
            FROM users
            ORDER BY created_at DESC
            "#,
        )
        .fetch_all(pool)
        .await;
    }

    if let Some(pool) = as_sqlite(backend) {
        return sqlx::query_as::<_, UserRow>(
            r#"
            SELECT
                id,
                user_code,
                username,
                first_name,
                last_name,
                tc_no,
                email,
                password_hash,
                role,
                is_approved,
                is_banned,
                ban_reason,
                email_verified,
                created_at,
                updated_at
            FROM users
            ORDER BY created_at DESC
            "#,
        )
        .fetch_all(pool)
        .await;
    }

    Ok(vec![])
}

pub async fn create_or_update_user(
    backend: &DbBackend,
    user_code: &str,
    email: &str,
    first_name: &str,
    last_name: &str,
    tc_no: &str,
    password_hash: &str,
    role: &str,
    is_approved: bool,
) -> Result<Option<UserRow>, sqlx::Error> {
    if let Some(pool) = as_pg(backend) {
        let row = sqlx::query_as::<_, UserRow>(
            r#"
            INSERT INTO users (user_code, username, first_name, last_name, tc_no, email, password_hash, role, is_approved)
            VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (user_code) DO UPDATE SET
                username = EXCLUDED.username,
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                tc_no = EXCLUDED.tc_no,
                email = EXCLUDED.email,
                password_hash = EXCLUDED.password_hash,
                role = EXCLUDED.role,
                is_approved = EXCLUDED.is_approved,
                is_banned = false,
                ban_reason = NULL,
                updated_at = NOW()
            RETURNING
                id::text AS id,
                user_code,
                username,
                first_name,
                last_name,
                tc_no,
                email,
                password_hash,
                role,
                is_approved::int8 AS is_approved,
                is_banned::int8 AS is_banned,
                ban_reason,
                email_verified::int8 AS email_verified,
                created_at::text AS created_at,
                updated_at::text AS updated_at
            "#,
        )
        .bind(user_code)
        .bind(first_name)
        .bind(last_name)
        .bind(tc_no)
        .bind(email)
        .bind(password_hash)
        .bind(role)
        .bind(is_approved)
        .fetch_one(pool)
        .await?;
        return Ok(Some(row));
    }

    if let Some(pool) = as_sqlite(backend) {
        let row = sqlx::query_as::<_, UserRow>(
            r#"
            INSERT INTO users (id, user_code, username, first_name, last_name, tc_no, email, password_hash, role, is_approved, is_banned, ban_reason, email_verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, 0)
            ON CONFLICT(user_code) DO UPDATE SET
                username = excluded.username,
                first_name = excluded.first_name,
                last_name = excluded.last_name,
                tc_no = excluded.tc_no,
                email = excluded.email,
                password_hash = excluded.password_hash,
                role = excluded.role,
                is_approved = excluded.is_approved,
                is_banned = 0,
                ban_reason = NULL,
                updated_at = CURRENT_TIMESTAMP
            RETURNING
                id,
                user_code,
                username,
                first_name,
                last_name,
                tc_no,
                email,
                password_hash,
                role,
                is_approved,
                is_banned,
                ban_reason,
                email_verified,
                created_at,
                updated_at
            "#,
        )
        .bind(Uuid::new_v4().to_string())
        .bind(user_code)
        .bind(user_code)
        .bind(first_name)
        .bind(last_name)
        .bind(tc_no)
        .bind(email)
        .bind(password_hash)
        .bind(role)
        .bind(i64::from(is_approved))
        .fetch_one(pool)
        .await?;
        return Ok(Some(row));
    }

    Ok(None)
}

pub async fn update_user_flag(
    backend: &DbBackend,
    id: &str,
    approved: Option<bool>,
    banned: Option<bool>,
    ban_reason: Option<&str>,
    role: Option<&str>,
) -> Result<Option<UserRow>, sqlx::Error> {
    if let Some(pool) = as_pg(backend) {
        let row = sqlx::query_as::<_, UserRow>(
            r#"
            UPDATE users
            SET
                is_approved = COALESCE($2, is_approved),
                is_banned = COALESCE($3, is_banned),
                ban_reason = COALESCE($4, ban_reason),
                role = COALESCE($5, role),
                updated_at = NOW()
            WHERE id = $1
            RETURNING
                id::text AS id,
                user_code,
                username,
                first_name,
                last_name,
                tc_no,
                email,
                password_hash,
                role,
                is_approved::int8 AS is_approved,
                is_banned::int8 AS is_banned,
                ban_reason,
                email_verified::int8 AS email_verified,
                created_at::text AS created_at,
                updated_at::text AS updated_at
            "#,
        )
        .bind(id)
        .bind(approved)
        .bind(banned)
        .bind(ban_reason)
        .bind(role)
        .fetch_optional(pool)
        .await?;
        return Ok(row);
    }

    if let Some(pool) = as_sqlite(backend) {
        let row = sqlx::query_as::<_, UserRow>(
            r#"
            UPDATE users
            SET
                is_approved = COALESCE(?, is_approved),
                is_banned = COALESCE(?, is_banned),
                ban_reason = COALESCE(?, ban_reason),
                role = COALESCE(?, role),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            RETURNING
                id,
                user_code,
                username,
                first_name,
                last_name,
                tc_no,
                email,
                password_hash,
                role,
                is_approved,
                is_banned,
                ban_reason,
                email_verified,
                created_at,
                updated_at
            "#,
        )
        .bind(approved.map(i64::from))
        .bind(banned.map(i64::from))
        .bind(ban_reason)
        .bind(role)
        .bind(id)
        .fetch_optional(pool)
        .await?;
        return Ok(row);
    }

    Ok(None)
}

pub async fn delete_user(backend: &DbBackend, id: &str) -> Result<bool, sqlx::Error> {
    if let Some(pool) = as_pg(backend) {
        return Ok(sqlx::query("DELETE FROM users WHERE id = $1")
            .bind(id)
            .execute(pool)
            .await?
            .rows_affected()
            > 0);
    }

    if let Some(pool) = as_sqlite(backend) {
        return Ok(sqlx::query("DELETE FROM users WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await?
            .rows_affected()
            > 0);
    }

    Ok(false)
}

pub async fn cleanup_simulation_data(backend: &DbBackend) -> Result<(u64, u64, u64), sqlx::Error> {
    if let Some(pool) = as_pg(backend) {
        let checkpoints = sqlx::query("DELETE FROM checkpoints").execute(pool).await?.rows_affected();
        let events = sqlx::query(
            "DELETE FROM simulation_events WHERE id IN (SELECT id FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY simulation_id ORDER BY sim_day DESC) AS rn FROM simulation_events) t WHERE rn > 200)"
        ).execute(pool).await?.rows_affected();
        let dead = sqlx::query("DELETE FROM individuals WHERE alive = false").execute(pool).await?.rows_affected();
        return Ok((checkpoints, events, dead));
    }

    if let Some(pool) = as_sqlite(backend) {
        let checkpoints = sqlx::query("DELETE FROM checkpoints").execute(pool).await?.rows_affected();
        let events = sqlx::query("DELETE FROM simulation_events WHERE id IN (SELECT id FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY simulation_id ORDER BY sim_day DESC) AS rn FROM simulation_events) WHERE rn > 200)")
            .execute(pool).await?.rows_affected();
        let dead = sqlx::query("DELETE FROM individuals WHERE alive = 0").execute(pool).await?.rows_affected();
        return Ok((checkpoints, events, dead));
    }

    Ok((0, 0, 0))
}
