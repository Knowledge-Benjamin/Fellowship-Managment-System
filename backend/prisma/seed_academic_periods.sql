-- Seed academic periods for fellowship calendar
-- Period 1: August - December
-- Period 2: January - May

-- 2025/2026 Academic Year
INSERT INTO "AcademicPeriod" (id, "academicYear", "periodNumber", "periodName", "startDate", "endDate")
VALUES 
  (gen_random_uuid(), '2025/2026', 1, 'First Period', '2025-08-01', '2025-12-31'),
  (gen_random_uuid(), '2025/2026', 2, 'Second Period', '2026-01-16', '2026-05-31');go

-- 2026/2027 Academic Year
INSERT INTO "AcademicPeriod" (id, "academicYear", "periodNumber", "periodName", "startDate", "endDate")
VALUES 
  (gen_random_uuid(), '2026/2027', 1, 'First Period', '2026-08-01', '2026-12-31'),
  (gen_random_uuid(), '2026/2027', 2, 'Second Period', '2027-01-16', '2027-05-31');

-- 2027/2028 Academic Year
INSERT INTO "AcademicPeriod" (id, "academicYear", "periodNumber", "periodName", "startDate", "endDate")
VALUES 
  (gen_random_uuid(), '2027/2028', 1, 'First Period', '2027-08-01', '2027-12-31'),
  (gen_random_uuid(), '2027/2028', 2, 'Second Period', '2028-01-16', '2028-05-31');

-- Create ALUMNI system tag
INSERT INTO "Tag" (id, name, description, type, color, "isSystem", "showOnRegistration", "createdAt")
VALUES (
    gen_random_uuid(),
    'ALUMNI',
    'Members who completed their course and continue attending fellowship',
    'SYSTEM',
    '#8b5cf6',
    true,
    false,
    NOW()
)
ON CONFLICT (name) DO NOTHING;
