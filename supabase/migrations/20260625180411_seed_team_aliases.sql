
-- Seed team aliases: common provider name variations for domestic fictional teams
-- Each team gets 2-3 aliases representing how different data providers name them
DO $$
DECLARE
  t_northgate uuid := 'e3c4d5f6-a7b8-9012-cdef-234567890abc';
  t_harbor uuid := 'f4d5e6a7-b8c9-0123-def0-345678901bcd';
  t_crestwood uuid := 'a5e6f7b8-c9d0-1234-ef01-456789012cde';
  t_ironvale uuid := 'b6f7a8c9-d0e1-2345-f012-567890123def';
  t_silverlake uuid := 'c7a8b9d0-e1f2-3456-0123-678901234ef0';
  t_marston uuid := 'd8b9c0e1-f2a3-4567-1234-789012345f01';
  t_ashford uuid := 'e9c0d1f2-a3b4-5678-2345-890123456012';
  t_brookfield uuid := 'f0d1e2a3-b4c5-6789-3456-901234567123';
  t_dalton uuid := 'a1e2f3b4-c5d6-7890-4567-012345678234';
  t_eastmoor uuid := 'b2f3a4c5-d6e7-8901-5678-123456789345';
  t_fairhaven uuid := 'c3a4b5d6-e7f8-9012-6789-234567890456';
  t_glenwood uuid := 'd4b5c6e7-f8a9-0123-7890-345678901567';
  t_kingsbridge uuid := 'e5c6d7f8-a9b0-1234-8901-456789012678';
  t_lakeside uuid := 'f6d7e8a9-b0c1-2345-9012-567890123789';
BEGIN
  -- Use actual team IDs from the teams table
  INSERT INTO team_aliases (team_id, alias, source) VALUES
    -- Northgate United
    ('25cf293f-723c-4363-997a-248c02a8c82e', 'Northgate Utd', 'opta'),
    ('25cf293f-723c-4363-997a-248c02a8c82e', 'NG United', 'statsperform'),
    ('25cf293f-723c-4363-997a-248c02a8c82e', 'Northgate', 'betfair'),
    -- Harbor City FC
    ('762e6196-3750-41f0-b828-b517a92876e5', 'Harbor City', 'opta'),
    ('762e6196-3750-41f0-b828-b517a92876e5', 'HCFC', 'whoscored'),
    ('762e6196-3750-41f0-b828-b517a92876e5', 'HC FC', 'betfair'),
    -- Crestwood Athletic
    ('cf66e954-c6ad-4c04-a41f-78436307a548', 'Crestwood Ath', 'opta'),
    ('cf66e954-c6ad-4c04-a41f-78436307a548', 'Crestwood', 'statsperform'),
    -- Ironvale Rovers
    ('a0c99cdd-883e-4e54-8c54-c62bc155a548', 'Ironvale', 'opta'),
    ('a0c99cdd-883e-4e54-8c54-c62bc155a548', 'Iron Rovers', 'betfair'),
    -- Silverlake SC
    ('64d86185-760d-480b-8705-cdf080f8c062', 'Silverlake', 'opta'),
    ('64d86185-760d-480b-8705-cdf080f8c062', 'Silver Lake SC', 'whoscored'),
    -- Marston Town
    ('50adac8d-c696-4a20-a017-ee6ea5e8bc83', 'Marston', 'opta'),
    ('50adac8d-c696-4a20-a017-ee6ea5e8bc83', 'Marston T', 'betfair'),
    -- Ashford Rangers
    ('d453536e-4060-4a70-98bb-d32902850483', 'Ashford', 'opta'),
    ('d453536e-4060-4a70-98bb-d32902850483', 'Ashford Rgrs', 'statsperform'),
    -- Brookfield United
    ('6bd3512a-b573-4cbd-a3fb-3074cfe51451', 'Brookfield Utd', 'opta'),
    ('6bd3512a-b573-4cbd-a3fb-3074cfe51451', 'Brookfield', 'betfair'),
    -- Dalton City FC
    ('f4ecc840-dcd6-47f6-ae9c-d044f2d1a744', 'Dalton City', 'opta'),
    ('f4ecc840-dcd6-47f6-ae9c-d044f2d1a744', 'Dalton', 'whoscored'),
    -- Eastmoor Town
    ('bc390aa0-2da2-4676-8351-4635a79e9725', 'Eastmoor', 'opta'),
    ('bc390aa0-2da2-4676-8351-4635a79e9725', 'Eastmoor T', 'betfair'),
    -- Fairhaven SC
    ('96a80e50-25be-4fcd-9673-010a75b00d0b', 'Fairhaven', 'opta'),
    ('96a80e50-25be-4fcd-9673-010a75b00d0b', 'Fair Haven SC', 'statsperform'),
    -- Glenwood Rovers
    ('bbdca483-0a7b-40bd-9239-6c6e0ed3cdb3', 'Glenwood', 'opta'),
    ('bbdca483-0a7b-40bd-9239-6c6e0ed3cdb3', 'Glen Rovers', 'betfair'),
    -- Kingsbridge FC
    ('c65f076d-8292-490a-af82-2bce6651b0e4', 'Kingsbridge', 'opta'),
    ('c65f076d-8292-490a-af82-2bce6651b0e4', 'Kings Bridge FC', 'whoscored'),
    -- Lakeside Athletic
    ('ee322a38-1950-487f-a38c-766b50fd64e8', 'Lakeside Ath', 'opta'),
    ('ee322a38-1950-487f-a38c-766b50fd64e8', 'Lakeside', 'betfair');
END $$;
