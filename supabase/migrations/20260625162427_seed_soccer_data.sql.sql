-- Seed data for QuantPitch soccer analytics
-- Uses deterministic UUIDs via gen_random_uuid() and CTEs to wire FKs.

-- TEAMS (6)
WITH team_insert AS (
  INSERT INTO teams (name, short_name, city, stadium, founded, primary_color)
  VALUES
    ('Northgate United',  'NGU', 'Northgate', 'The Citadel',     1898, '#3b82f6'),
    ('Harbor City FC',     'HBR', 'Harbor City','Dockside Arena', 1921, '#10b981'),
    ('Crestwood Athletic','CRA', 'Crestwood','Forest Park',      1905, '#f59e0b'),
    ('Ironvale Rovers',    'IRV', 'Ironvale', 'The Foundry',      1933, '#ef4444'),
    ('Silverlake SC',      'SLV', 'Silverlake','Lakeside Bowl',   1972, '#06b6d4'),
    ('Marston Town',       'MST', 'Marston',  'Victoria Ground',  1889, '#8b5cf6')
  RETURNING id, short_name
),
team_map AS (
  SELECT id, short_name FROM team_insert
)
-- PLAYERS (10 per team = 60)
INSERT INTO players (team_id, name, position, jersey_number, nationality, age, height_cm, weight_kg, goals, assists, appearances, rating)
SELECT tm.id, p.name, p.position, p.jersey_number, p.nationality, p.age, p.height_cm, p.weight_kg, p.goals, p.assists, p.appearances, p.rating
FROM team_map tm
JOIN (VALUES
  -- Northgate United
  ('NGU','Marcus Bellamy','GK',1,'England',28,191,84,0,0,5,7.2),
  ('NGU','Liam Foster','RB',2,'England',26,178,76,1,2,5,7.4),
  ('NGU','Diego Santos','CB',4,'Brazil',30,188,82,2,0,5,7.6),
  ('NGU','Kasper Lind','CB',5,'Denmark',27,190,85,0,1,5,7.1),
  ('NGU','Theo Marchand','LB',3,'France',24,176,72,0,3,5,7.3),
  ('NGU','Noah Okonkwo','CDM',6,'Nigeria',25,180,78,1,2,5,7.5),
  ('NGU','Isaac Berg','CM',8,'Sweden',23,179,74,3,4,5,8.1),
  ('NGU','Rafael Costa','CAM',10,'Brazil',28,174,70,4,5,5,8.4),
  ('NGU','Jaylen Wright','RW',7,'England',22,175,71,5,3,5,7.9),
  ('NGU','Omar Diallo','ST',9,'Senegal',26,185,80,7,2,5,8.6),
  -- Harbor City FC
  ('HBR','Erik Halvorsen','GK',1,'Norway',29,194,88,0,0,5,7.3),
  ('HBR','Sam Whitfield','RB',2,'England',24,177,73,0,2,5,7.0),
  ('HBR','Paolo Mancini','CB',4,'Italy',31,187,83,1,0,5,7.5),
  ('HBR','Yuki Tanaka','CB',5,'Japan',26,182,79,1,1,5,7.2),
  ('HBR','Carlos Mendez','LB',3,'Spain',25,173,69,0,3,5,7.4),
  ('HBR','Andre Silva','CDM',6,'Brazil',28,181,77,1,3,5,7.6),
  ('HBR','Lucas Romano','CM',8,'Italy',24,178,74,2,4,5,7.7),
  ('HBR','Felix Wagner','CAM',10,'Germany',27,176,72,5,6,5,8.5),
  ('HBR','Tyrone Brooks','RW',11,'England',23,174,70,4,2,5,7.6),
  ('HBR','Hugo Lloris','ST',9,'France',29,186,81,6,3,5,8.2),
  -- Crestwood Athletic
  ('CRA','David Ochoa','GK',1,'USA',27,193,87,0,0,5,7.1),
  ('CRA','Ravi Patel','RB',2,'India',23,175,71,0,1,5,6.9),
  ('CRA','Sven Larsson','CB',4,'Sweden',30,189,84,2,0,5,7.4),
  ('CRA','Marco Bianchi','CB',5,'Italy',28,186,80,1,1,5,7.3),
  ('CRA','Jamal Reid','LB',3,'Jamaica',25,178,74,0,2,5,7.2),
  ('CRA','Pavel Novak','CDM',6,'Czechia',26,183,78,1,2,5,7.5),
  ('CRA','Enzo Ferrari','CM',8,'Italy',24,177,73,3,3,5,7.8),
  ('CRA','Mason Cole','CAM',10,'England',22,172,68,4,5,5,8.0),
  ('CRA','Kai Mueller','RW',7,'Germany',21,173,69,3,4,5,7.5),
  ('CRA','Bilal Ahmed','ST',9,'Egypt',27,184,79,5,2,5,7.7),
  -- Ironvale Rovers
  ('IRV','Connor Walsh','GK',1,'Ireland',30,190,86,0,0,5,7.0),
  ('IRV','Tomas Kowalski','RB',2,'Poland',25,176,72,1,1,5,7.1),
  ('IRV','Hassan Ali','CB',4,'Pakistan',29,188,83,2,0,5,7.3),
  ('IRV','Bjorn Eriksen','CB',5,'Denmark',26,191,85,0,1,5,7.0),
  ('IRV','Leo Martin','LB',3,'France',24,174,70,0,2,5,7.2),
  ('IRV','Victor Adeyemi','CDM',6,'Nigeria',28,180,76,1,3,5,7.4),
  ('IRV','Pierre Dubois','CM',8,'France',25,178,74,2,4,5,7.6),
  ('IRV','Anton Petrov','CAM',10,'Russia',27,175,71,3,5,5,7.8),
  ('IRV','Reza Karimi','RW',11,'Iran',23,173,69,4,3,5,7.5),
  ('IRV','Gabriel Torres','ST',9,'Colombia',28,183,78,6,2,5,8.1),
  -- Silverlake SC
  ('SLV','Henry Carter','GK',1,'USA',26,192,85,0,0,5,7.2),
  ('SLV','Niko Pavlidis','RB',2,'Greece',24,177,73,0,2,5,7.1),
  ('SLV','Emre Yildiz','CB',4,'Turkey',30,187,82,1,0,5,7.3),
  ('SLV','Joon-ho Kim','CB',5,'South Korea',27,185,80,1,1,5,7.2),
  ('SLV','Alejandro Ruiz','LB',3,'Mexico',25,174,70,0,3,5,7.4),
  ('SLV','Sadio Ba','CDM',6,'Senegal',26,181,77,1,2,5,7.5),
  ('SLV','Florian Klein','CM',8,'Austria',24,179,75,2,4,5,7.7),
  ('SLV','Dani Cruz','CAM',10,'Spain',28,173,69,5,6,5,8.3),
  ('SLV','Mason Park','RW',7,'South Korea',22,172,68,4,3,5,7.6),
  ('SLV','Luka Savic','ST',9,'Serbia',29,186,81,6,3,5,8.2),
  -- Marston Town
  ('MST','Oliver Bennett','GK',1,'England',28,193,87,0,0,5,7.1),
  ('MST','Ricardo Lopez','RB',2,'Spain',25,176,72,0,2,5,7.0),
  ('MST','Jan Kowalski','CB',4,'Poland',31,189,84,2,0,5,7.4),
  ('MST','Samuel Nkosi','CB',5,'South Africa',26,188,83,1,1,5,7.2),
  ('MST','Finn Murphy','LB',3,'Ireland',24,175,71,0,2,5,7.1),
  ('MST','Yannick Vogel','CDM',6,'Belgium',27,180,76,1,3,5,7.5),
  ('MST','Mateo Rossi','CM',8,'Italy',23,177,73,3,4,5,7.8),
  ('MST','Caleb Stone','CAM',10,'England',22,172,68,4,5,5,7.9),
  ('MST','Dimitri Sokolov','RW',11,'Russia',24,174,70,3,3,5,7.4),
  ('MST','Andre Mensah','ST',9,'Ghana',28,184,79,5,2,5,7.8)
) AS p(team_short, name, position, jersey_number, nationality, age, height_cm, weight_kg, goals, assists, appearances, rating)
ON p.team_short = tm.short_name;
