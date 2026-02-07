-- CreateEnum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TagType') THEN
        -- TagType enum should already exist, this is a safety check
    END IF;
END $$;

-- Insert FINALIST system tag
INSERT INTO "Tag" (id, name, description, type, color, "isSystem", "showOnRegistration", "createdAt")
VALUES (
    gen_random_uuid(),
    'FINALIST',
    'Final year students automatically identified by course duration',
    'SYSTEM',
    '#f59e0b',
    true,
    false,
    NOW()
)
ON CONFLICT (name) DO NOTHING;