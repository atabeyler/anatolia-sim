-- ANTOLİA-SİM MEDENİYET — PostgreSQL Schema
-- RST Q-Nation 200120401018

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

-- Migrate existing users table with new columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_code VARCHAR(20) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS tc_no VARCHAR(11) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;

CREATE TABLE IF NOT EXISTS simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'paused',
  current_day INTEGER DEFAULT 0,
  current_year INTEGER DEFAULT 0,
  start_latitude DOUBLE PRECISION NOT NULL,
  start_longitude DOUBLE PRECISION NOT NULL,
  start_season VARCHAR(10) DEFAULT 'spring',
  speed_multiplier INTEGER DEFAULT 1,
  founder_1 JSONB NOT NULL,
  founder_2 JSONB NOT NULL,
  world_state JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS individuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES simulations(id) ON DELETE CASCADE,
  birth_day INTEGER NOT NULL,
  death_day INTEGER,
  alive BOOLEAN DEFAULT true,
  sex VARCHAR(10) NOT NULL,
  x DOUBLE PRECISION NOT NULL,
  y DOUBLE PRECISION NOT NULL,
  genome JSONB NOT NULL,
  phenotype JSONB NOT NULL,
  epigenome JSONB DEFAULT '{}',
  health JSONB DEFAULT '{}',
  mind JSONB DEFAULT '{}',
  social JSONB DEFAULT '{}',
  skills JSONB DEFAULT '[]',
  beliefs JSONB DEFAULT '{}',
  language JSONB DEFAULT '{}',
  memory JSONB DEFAULT '{}',
  parent_1_id UUID REFERENCES individuals(id),
  parent_2_id UUID REFERENCES individuals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES simulations(id) ON DELETE CASCADE,
  sim_day INTEGER NOT NULL,
  sim_year INTEGER NOT NULL,
  population_count INTEGER NOT NULL,
  population_snapshot JSONB NOT NULL,
  world_state JSONB NOT NULL,
  cultural_state JSONB NOT NULL,
  tech_state JSONB NOT NULL,
  stats JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS god_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES simulations(id) ON DELETE CASCADE,
  sim_day INTEGER NOT NULL,
  sim_year INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL,
  params JSONB NOT NULL,
  affected_individuals INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0,
  user_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS individual_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES simulations(id) ON DELETE CASCADE,
  individual_id UUID REFERENCES individuals(id) ON DELETE CASCADE,
  sim_day INTEGER NOT NULL,
  user_message TEXT NOT NULL,
  individual_response TEXT NOT NULL,
  language_stage VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS technologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES simulations(id) ON DELETE CASCADE,
  tech_id VARCHAR(100) NOT NULL,
  discoverer_id UUID REFERENCES individuals(id),
  discovery_day INTEGER NOT NULL,
  discovery_year INTEGER NOT NULL,
  discovery_x DOUBLE PRECISION,
  discovery_y DOUBLE PRECISION,
  spread_data JSONB DEFAULT '[]',
  lost BOOLEAN DEFAULT false,
  lost_day INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS belief_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES simulations(id) ON DELETE CASCADE,
  name VARCHAR(255),
  origin_individual_id UUID REFERENCES individuals(id),
  origin_day INTEGER NOT NULL,
  origin_year INTEGER NOT NULL,
  type VARCHAR(50),
  core_beliefs JSONB DEFAULT '[]',
  rituals JSONB DEFAULT '[]',
  follower_count INTEGER DEFAULT 1,
  extinct BOOLEAN DEFAULT false,
  extinct_day INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS language_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES simulations(id) ON DELETE CASCADE,
  group_id VARCHAR(100),
  stage INTEGER NOT NULL,
  stage_name VARCHAR(50) NOT NULL,
  vocabulary_size INTEGER DEFAULT 0,
  has_grammar BOOLEAN DEFAULT false,
  has_writing BOOLEAN DEFAULT false,
  sample_words JSONB DEFAULT '{}',
  speaker_count INTEGER DEFAULT 0,
  recorded_day INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS simulation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES simulations(id) ON DELETE CASCADE,
  sim_day INTEGER NOT NULL,
  sim_year INTEGER NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  description TEXT,
  data JSONB DEFAULT '{}',
  importance INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES simulations(id) ON DELETE CASCADE,
  name VARCHAR(255),
  type VARCHAR(50),
  leader_id UUID REFERENCES individuals(id),
  member_ids JSONB DEFAULT '[]',
  territory JSONB DEFAULT '{}',
  resources JSONB DEFAULT '{}',
  belief_system_id UUID REFERENCES belief_systems(id),
  language_group VARCHAR(100),
  founded_day INTEGER,
  disbanded_day INTEGER,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES simulations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  title VARCHAR(500) NOT NULL,
  abstract TEXT,
  content TEXT,
  charts JSONB DEFAULT '[]',
  format VARCHAR(20) DEFAULT 'pdf',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual name column for founder-assigned names
ALTER TABLE individuals ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE individuals ADD COLUMN IF NOT EXISTS death_cause VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_individuals_simulation ON individuals(simulation_id);
CREATE INDEX IF NOT EXISTS idx_individuals_alive ON individuals(simulation_id, alive);
CREATE INDEX IF NOT EXISTS idx_checkpoints_simulation ON checkpoints(simulation_id, sim_day);
CREATE INDEX IF NOT EXISTS idx_events_simulation ON simulation_events(simulation_id, sim_day);
CREATE INDEX IF NOT EXISTS idx_god_simulation ON god_interventions(simulation_id);
CREATE INDEX IF NOT EXISTS idx_technologies_simulation ON technologies(simulation_id);
CREATE INDEX IF NOT EXISTS idx_groups_simulation ON social_groups(simulation_id, active);
