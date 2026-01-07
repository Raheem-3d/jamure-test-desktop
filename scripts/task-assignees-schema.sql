-- Task Assignments Table
CREATE TABLE IF NOT EXISTS task_assignments (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    assigned_by VARCHAR(255) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, user_id)
);

-- Task Reminders Table
CREATE TABLE IF NOT EXISTS task_reminders (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(255) NOT NULL,
    assignee_id VARCHAR(255) NOT NULL,
    reminder_date TIMESTAMP NOT NULL,
    message TEXT,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL
);

-- Task Mute Settings Table
CREATE TABLE IF NOT EXISTS task_mute_settings (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    is_muted BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, user_id)
);

-- User Notification Preferences Table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_task_id ON task_reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_assignee_id ON task_reminders(assignee_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_date ON task_reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_task_mute_settings_task_id ON task_mute_settings(task_id);
CREATE INDEX IF NOT EXISTS idx_task_mute_settings_user_id ON task_mute_settings(user_id);
