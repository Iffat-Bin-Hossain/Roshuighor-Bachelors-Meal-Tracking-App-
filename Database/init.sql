-- রসুইঘর (Rosuighor) Database Schema
-- UTF-8 Support enabled for Bangla text

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(30),
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    language_pref VARCHAR(10) DEFAULT 'bn',
    theme_pref VARCHAR(10) DEFAULT 'light',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS homes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    address TEXT,
    description TEXT,
    invite_code VARCHAR(32) UNIQUE NOT NULL,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS home_members (
    id SERIAL PRIMARY KEY,
    home_id INTEGER REFERENCES homes(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member', -- 'manager', 'member'
    status VARCHAR(20) DEFAULT 'active',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(home_id, user_id)
);

CREATE TABLE IF NOT EXISTS mess_cycles (
    id SERIAL PRIMARY KEY,
    home_id INTEGER REFERENCES homes(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_days INTEGER DEFAULT 10,
    manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'closed'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meal_records (
    id SERIAL PRIMARY KEY,
    mess_cycle_id INTEGER REFERENCES mess_cycles(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    breakfast NUMERIC(3,1) DEFAULT 0.0,
    lunch NUMERIC(3,1) DEFAULT 1.0,
    dinner NUMERIC(3,1) DEFAULT 1.0,
    guest_meals NUMERIC(3,1) DEFAULT 0.0,
    total_meals NUMERIC(4,1) GENERATED ALWAYS AS (breakfast + lunch + dinner + guest_meals) STORED,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mess_cycle_id, user_id, date)
);

CREATE TABLE IF NOT EXISTS bazaar_expenses (
    id SERIAL PRIMARY KEY,
    mess_cycle_id INTEGER REFERENCES mess_cycles(id) ON DELETE CASCADE,
    buyer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    items_description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deposits (
    id SERIAL PRIMARY KEY,
    mess_cycle_id INTEGER REFERENCES mess_cycles(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_menus (
    id SERIAL PRIMARY KEY,
    mess_cycle_id INTEGER REFERENCES mess_cycles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    meal_type VARCHAR(20) NOT NULL, -- 'breakfast', 'lunch', 'dinner'
    staple TEXT DEFAULT '',         -- ভাত, রুটি, খিচুড়ি ইত্যাদি
    main_dish TEXT DEFAULT '',      -- মুরগি, মাছ, ডিম ইত্যাদি
    side_dish TEXT DEFAULT '',      -- ডাল, ভাজি, ভর্তা ইত্যাদি
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mess_cycle_id, date, meal_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_home_invite_code ON homes(invite_code);
CREATE INDEX IF NOT EXISTS idx_home_members_user ON home_members(user_id);
CREATE INDEX IF NOT EXISTS idx_mess_cycles_home ON mess_cycles(home_id);
CREATE INDEX IF NOT EXISTS idx_meal_records_cycle_date ON meal_records(mess_cycle_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_menus_cycle_date ON daily_menus(mess_cycle_id, date);
CREATE INDEX IF NOT EXISTS idx_bazaar_cycle ON bazaar_expenses(mess_cycle_id);
CREATE INDEX IF NOT EXISTS idx_deposits_cycle ON deposits(mess_cycle_id);
