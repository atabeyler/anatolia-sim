-- Cloud (Render) schema: only users/auth
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS antsim;
SET search_path TO antsim;

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
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS user_code VARCHAR(20) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS tc_no VARCHAR(11) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- Masaüstü yerel simülasyonlarının son checkpoint'ini saklar (çapraz cihaz sync)
CREATE TABLE IF NOT EXISTS cloud_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  simulation_id UUID NOT NULL,
  simulation_name VARCHAR(255) NOT NULL,
  current_day INTEGER NOT NULL DEFAULT 0,
  current_year INTEGER NOT NULL DEFAULT 0,
  population_count INTEGER NOT NULL DEFAULT 0,
  population_snapshot JSONB NOT NULL DEFAULT '[]',
  world_state JSONB NOT NULL DEFAULT '{}',
  cultural_state JSONB NOT NULL DEFAULT '{}',
  tech_state JSONB NOT NULL DEFAULT '{}',
  belief_state JSONB NOT NULL DEFAULT '[]',
  art_state JSONB NOT NULL DEFAULT '[]',
  groups JSONB NOT NULL DEFAULT '[]',
  stats JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cloud_cp_user_sim ON cloud_checkpoints(user_id, simulation_id);

-- Masaüstü canlı simülasyonlarının anlık görüntüsü (her 20 saniyede bir UPSERT, web'den izleme için)
CREATE TABLE IF NOT EXISTS live_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  simulation_id UUID NOT NULL,
  simulation_name VARCHAR(255) NOT NULL,
  current_day INTEGER NOT NULL DEFAULT 0,
  current_year INTEGER NOT NULL DEFAULT 0,
  population_count INTEGER NOT NULL DEFAULT 0,
  agents_snapshot JSONB NOT NULL DEFAULT '[]',
  stats JSONB NOT NULL DEFAULT '{}',
  groups JSONB NOT NULL DEFAULT '[]',
  is_running BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_live_snap_user_sim ON live_snapshots(user_id, simulation_id);
