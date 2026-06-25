
DO $$
DECLARE
  t_brazil uuid := gen_random_uuid();
  t_argentina uuid := gen_random_uuid();
  t_france uuid := gen_random_uuid();
  t_england uuid := gen_random_uuid();
  t_spain uuid := gen_random_uuid();
  t_germany uuid := gen_random_uuid();
  t_portugal uuid := gen_random_uuid();
  t_netherlands uuid := gen_random_uuid();
  t_usa uuid := gen_random_uuid();
  t_mexico uuid := gen_random_uuid();
  t_japan uuid := gen_random_uuid();
  t_morocco uuid := gen_random_uuid();
  t_senegal uuid := gen_random_uuid();
  t_australia uuid := gen_random_uuid();
  t_croatia uuid := gen_random_uuid();
  t_uruguay uuid := gen_random_uuid();
BEGIN

INSERT INTO teams (id, name, short_name, city, stadium, founded, primary_color, competition) VALUES
  (t_brazil,      'Brazil',      'BRA', 'Rio de Janeiro', 'Maracanã',            1914, '#009C3B', 'worldcup'),
  (t_argentina,   'Argentina',   'ARG', 'Buenos Aires',   'El Monumental',       1893, '#74ACDF', 'worldcup'),
  (t_france,      'France',      'FRA', 'Paris',          'Stade de France',     1904, '#002395', 'worldcup'),
  (t_england,     'England',     'ENG', 'London',         'Wembley Stadium',     1863, '#CF081F', 'worldcup'),
  (t_spain,       'Spain',       'ESP', 'Madrid',         'Santiago Bernabéu',   1920, '#AA151B', 'worldcup'),
  (t_germany,     'Germany',     'GER', 'Berlin',         'Olympiastadion',      1900, '#2D2D2D', 'worldcup'),
  (t_portugal,    'Portugal',    'POR', 'Lisbon',         'Estádio da Luz',      1914, '#006600', 'worldcup'),
  (t_netherlands, 'Netherlands', 'NED', 'Amsterdam',      'Johan Cruyff ArenA',  1889, '#FF6600', 'worldcup'),
  (t_usa,         'USA',         'USA', 'New York',       'MetLife Stadium',     1913, '#002868', 'worldcup'),
  (t_mexico,      'Mexico',      'MEX', 'Mexico City',    'Estadio Azteca',      1927, '#006847', 'worldcup'),
  (t_japan,       'Japan',       'JPN', 'Tokyo',          'Japan National Stadium', 1921, '#BC002D', 'worldcup'),
  (t_morocco,     'Morocco',     'MAR', 'Casablanca',     'Stade Mohammed V',    1955, '#C1272D', 'worldcup'),
  (t_senegal,     'Senegal',     'SEN', 'Dakar',          'Stade Léopold Sédar Senghor', 1960, '#00853F', 'worldcup'),
  (t_australia,   'Australia',   'AUS', 'Sydney',         'Stadium Australia',   1961, '#FFD700', 'worldcup'),
  (t_croatia,     'Croatia',     'CRO', 'Zagreb',         'Stadion Maksimir',    1912, '#FF0000', 'worldcup'),
  (t_uruguay,     'Uruguay',     'URU', 'Montevideo',     'Estadio Centenario',  1900, '#5AAAE7', 'worldcup');

INSERT INTO players (team_id, name, position, jersey_number, nationality, age, height_cm, weight_kg, goals, assists, appearances, rating, competition) VALUES
  (t_brazil, 'Vinicius Jr', 'LW', 7, 'Brazilian', 23, 176, 73, 8, 5, 7, 8.8, 'worldcup'),
  (t_brazil, 'Rodrygo', 'RW', 11, 'Brazilian', 23, 174, 68, 4, 6, 7, 8.1, 'worldcup'),
  (t_brazil, 'Endrick', 'ST', 9, 'Brazilian', 18, 173, 76, 5, 2, 7, 7.9, 'worldcup'),
  (t_brazil, 'Casemiro', 'CDM', 5, 'Brazilian', 32, 185, 84, 1, 3, 7, 7.6, 'worldcup'),
  (t_brazil, 'Marquinhos', 'CB', 4, 'Brazilian', 30, 183, 75, 0, 1, 7, 7.8, 'worldcup'),
  (t_brazil, 'Alisson', 'GK', 1, 'Brazilian', 31, 193, 91, 0, 0, 7, 8.0, 'worldcup'),
  (t_argentina, 'Lionel Messi', 'CAM', 10, 'Argentine', 36, 170, 72, 7, 9, 7, 9.4, 'worldcup'),
  (t_argentina, 'Julián Álvarez', 'ST', 9, 'Argentine', 24, 170, 67, 6, 4, 7, 8.5, 'worldcup'),
  (t_argentina, 'Rodrigo De Paul', 'CM', 7, 'Argentine', 30, 183, 81, 2, 5, 7, 8.0, 'worldcup'),
  (t_argentina, 'Cristian Romero', 'CB', 13, 'Argentine', 26, 185, 81, 0, 0, 7, 8.1, 'worldcup'),
  (t_argentina, 'Emiliano Martínez', 'GK', 23, 'Argentine', 31, 195, 90, 0, 0, 7, 8.6, 'worldcup'),
  (t_argentina, 'Enzo Fernández', 'CM', 24, 'Argentine', 23, 178, 76, 1, 4, 7, 7.9, 'worldcup'),
  (t_france, 'Kylian Mbappé', 'ST', 10, 'French', 25, 178, 73, 10, 4, 7, 9.2, 'worldcup'),
  (t_france, 'Antoine Griezmann', 'CAM', 7, 'French', 33, 176, 73, 4, 7, 7, 8.3, 'worldcup'),
  (t_france, 'Ousmane Dembélé', 'RW', 11, 'French', 27, 178, 69, 3, 5, 7, 8.0, 'worldcup'),
  (t_france, 'Aurélien Tchouaméni', 'CDM', 8, 'French', 24, 187, 80, 1, 2, 7, 7.8, 'worldcup'),
  (t_france, 'Raphaël Varane', 'CB', 4, 'French', 31, 191, 86, 0, 0, 7, 7.7, 'worldcup'),
  (t_france, 'Mike Maignan', 'GK', 16, 'French', 28, 191, 83, 0, 0, 7, 8.2, 'worldcup'),
  (t_england, 'Harry Kane', 'ST', 9, 'English', 30, 188, 86, 7, 3, 7, 8.7, 'worldcup'),
  (t_england, 'Jude Bellingham', 'CM', 10, 'English', 20, 186, 83, 5, 6, 7, 9.0, 'worldcup'),
  (t_england, 'Bukayo Saka', 'RW', 7, 'English', 22, 178, 72, 4, 7, 7, 8.6, 'worldcup'),
  (t_england, 'Phil Foden', 'LW', 11, 'English', 23, 171, 70, 3, 5, 7, 8.4, 'worldcup'),
  (t_england, 'John Stones', 'CB', 5, 'English', 29, 188, 78, 0, 1, 7, 7.9, 'worldcup'),
  (t_england, 'Jordan Pickford', 'GK', 1, 'English', 30, 185, 80, 0, 0, 7, 7.8, 'worldcup'),
  (t_spain, 'Lamine Yamal', 'RW', 17, 'Spanish', 16, 180, 65, 5, 8, 7, 8.9, 'worldcup'),
  (t_spain, 'Álvaro Morata', 'ST', 7, 'Spanish', 31, 189, 82, 4, 3, 7, 7.8, 'worldcup'),
  (t_spain, 'Pedri', 'CM', 8, 'Spanish', 21, 174, 60, 2, 6, 7, 8.5, 'worldcup'),
  (t_spain, 'Rodri', 'CDM', 16, 'Spanish', 27, 191, 82, 1, 3, 7, 8.7, 'worldcup'),
  (t_spain, 'Aymeric Laporte', 'CB', 14, 'Spanish', 30, 189, 81, 0, 0, 7, 7.9, 'worldcup'),
  (t_spain, 'Unai Simón', 'GK', 23, 'Spanish', 27, 190, 80, 0, 0, 7, 8.0, 'worldcup'),
  (t_germany, 'Jamal Musiala', 'CAM', 10, 'German', 21, 183, 73, 5, 5, 7, 8.8, 'worldcup'),
  (t_germany, 'Florian Wirtz', 'AM', 17, 'German', 21, 180, 72, 4, 6, 7, 8.7, 'worldcup'),
  (t_germany, 'Kai Havertz', 'ST', 7, 'German', 25, 189, 83, 3, 4, 7, 8.1, 'worldcup'),
  (t_germany, 'Joshua Kimmich', 'CM', 6, 'German', 29, 177, 75, 1, 5, 7, 8.4, 'worldcup'),
  (t_germany, 'Antonio Rüdiger', 'CB', 2, 'German', 31, 190, 85, 0, 0, 7, 7.9, 'worldcup'),
  (t_germany, 'Manuel Neuer', 'GK', 1, 'German', 38, 193, 92, 0, 0, 7, 8.0, 'worldcup'),
  (t_portugal, 'Cristiano Ronaldo', 'ST', 7, 'Portuguese', 39, 187, 83, 5, 2, 7, 8.5, 'worldcup'),
  (t_portugal, 'Bruno Fernandes', 'CAM', 8, 'Portuguese', 29, 181, 69, 3, 7, 7, 8.6, 'worldcup'),
  (t_portugal, 'Bernardo Silva', 'CM', 10, 'Portuguese', 29, 173, 64, 2, 5, 7, 8.4, 'worldcup'),
  (t_portugal, 'Rúben Dias', 'CB', 4, 'Portuguese', 27, 187, 76, 0, 0, 7, 8.3, 'worldcup'),
  (t_portugal, 'Nuno Mendes', 'LB', 5, 'Portuguese', 22, 179, 72, 0, 2, 7, 7.8, 'worldcup'),
  (t_portugal, 'Diogo Costa', 'GK', 1, 'Portuguese', 24, 190, 81, 0, 0, 7, 8.1, 'worldcup'),
  (t_netherlands, 'Cody Gakpo', 'LW', 11, 'Dutch', 25, 189, 80, 5, 4, 7, 8.3, 'worldcup'),
  (t_netherlands, 'Memphis Depay', 'ST', 10, 'Dutch', 30, 176, 78, 4, 3, 7, 7.9, 'worldcup'),
  (t_netherlands, 'Virgil van Dijk', 'CB', 4, 'Dutch', 32, 193, 92, 0, 1, 7, 8.5, 'worldcup'),
  (t_netherlands, 'Frenkie de Jong', 'CM', 21, 'Dutch', 26, 181, 76, 1, 3, 7, 8.2, 'worldcup'),
  (t_netherlands, 'Denzel Dumfries', 'RB', 22, 'Dutch', 28, 188, 83, 1, 4, 7, 7.8, 'worldcup'),
  (t_netherlands, 'Mark Flekken', 'GK', 1, 'Dutch', 30, 193, 86, 0, 0, 7, 7.7, 'worldcup'),
  (t_usa, 'Christian Pulisic', 'CAM', 10, 'American', 25, 177, 68, 5, 4, 7, 8.4, 'worldcup'),
  (t_usa, 'Gio Reyna', 'AM', 7, 'American', 21, 181, 72, 3, 5, 7, 8.0, 'worldcup'),
  (t_usa, 'Folarin Balogun', 'ST', 9, 'American', 23, 179, 74, 4, 2, 7, 7.8, 'worldcup'),
  (t_usa, 'Tyler Adams', 'CDM', 4, 'American', 25, 175, 72, 0, 2, 7, 7.9, 'worldcup'),
  (t_usa, 'Tim Ream', 'CB', 13, 'American', 36, 187, 79, 0, 0, 7, 7.5, 'worldcup'),
  (t_usa, 'Matt Turner', 'GK', 1, 'American', 29, 194, 90, 0, 0, 7, 7.6, 'worldcup'),
  (t_mexico, 'Hirving Lozano', 'RW', 22, 'Mexican', 28, 173, 69, 4, 3, 7, 8.0, 'worldcup'),
  (t_mexico, 'Raúl Jiménez', 'ST', 9, 'Mexican', 33, 188, 83, 3, 2, 7, 7.7, 'worldcup'),
  (t_mexico, 'Alexis Vega', 'LW', 23, 'Mexican', 26, 172, 67, 2, 3, 7, 7.6, 'worldcup'),
  (t_mexico, 'Edson Álvarez', 'CDM', 18, 'Mexican', 26, 185, 82, 0, 1, 7, 7.9, 'worldcup'),
  (t_mexico, 'César Montes', 'CB', 3, 'Mexican', 27, 191, 85, 0, 0, 7, 7.7, 'worldcup'),
  (t_mexico, 'Guillermo Ochoa', 'GK', 13, 'Mexican', 38, 183, 82, 0, 0, 7, 7.8, 'worldcup'),
  (t_japan, 'Kaoru Mitoma', 'LW', 10, 'Japanese', 27, 178, 72, 5, 5, 7, 8.4, 'worldcup'),
  (t_japan, 'Takumi Minamino', 'AM', 9, 'Japanese', 29, 174, 68, 4, 4, 7, 8.1, 'worldcup'),
  (t_japan, 'Daichi Kamada', 'CAM', 14, 'Japanese', 27, 182, 75, 3, 4, 7, 7.9, 'worldcup'),
  (t_japan, 'Wataru Endō', 'CDM', 3, 'Japanese', 30, 178, 74, 0, 2, 7, 7.8, 'worldcup'),
  (t_japan, 'Ko Itakura', 'CB', 4, 'Japanese', 27, 188, 80, 0, 0, 7, 7.7, 'worldcup'),
  (t_japan, 'Shuichi Gonda', 'GK', 1, 'Japanese', 30, 187, 80, 0, 0, 7, 7.6, 'worldcup'),
  (t_morocco, 'Achraf Hakimi', 'RB', 2, 'Moroccan', 25, 181, 73, 2, 5, 7, 8.6, 'worldcup'),
  (t_morocco, 'Hakim Ziyech', 'CAM', 7, 'Moroccan', 31, 181, 69, 4, 5, 7, 8.1, 'worldcup'),
  (t_morocco, 'Youssef En-Nesyri', 'ST', 19, 'Moroccan', 27, 189, 80, 5, 2, 7, 8.0, 'worldcup'),
  (t_morocco, 'Sofyan Amrabat', 'CDM', 4, 'Moroccan', 27, 182, 77, 0, 1, 7, 7.9, 'worldcup'),
  (t_morocco, 'Nayef Aguerd', 'CB', 5, 'Moroccan', 28, 189, 85, 0, 0, 7, 7.8, 'worldcup'),
  (t_morocco, 'Yassine Bounou', 'GK', 1, 'Moroccan', 33, 192, 86, 0, 0, 7, 8.3, 'worldcup'),
  (t_senegal, 'Sadio Mané', 'LW', 10, 'Senegalese', 32, 175, 69, 5, 4, 7, 8.5, 'worldcup'),
  (t_senegal, 'Ismaila Sarr', 'RW', 23, 'Senegalese', 26, 186, 78, 3, 3, 7, 7.9, 'worldcup'),
  (t_senegal, 'Idrissa Gueye', 'CDM', 5, 'Senegalese', 34, 174, 66, 0, 2, 7, 7.7, 'worldcup'),
  (t_senegal, 'Kalidou Koulibaly', 'CB', 3, 'Senegalese', 32, 187, 89, 0, 0, 7, 8.1, 'worldcup'),
  (t_senegal, 'Édouard Mendy', 'GK', 16, 'Senegalese', 32, 197, 86, 0, 0, 7, 8.0, 'worldcup'),
  (t_senegal, 'Pape Gueye', 'CM', 15, 'Senegalese', 25, 186, 76, 1, 2, 7, 7.6, 'worldcup'),
  (t_australia, 'Mathew Leckie', 'RW', 7, 'Australian', 33, 175, 72, 3, 2, 7, 7.7, 'worldcup'),
  (t_australia, 'Mitchell Duke', 'ST', 19, 'Australian', 33, 188, 83, 2, 1, 7, 7.5, 'worldcup'),
  (t_australia, 'Martin Boyle', 'LW', 11, 'Australian', 30, 173, 67, 2, 3, 7, 7.6, 'worldcup'),
  (t_australia, 'Jackson Irvine', 'CM', 16, 'Australian', 30, 190, 80, 1, 2, 7, 7.6, 'worldcup'),
  (t_australia, 'Harry Souttar', 'CB', 15, 'Australian', 25, 200, 93, 0, 0, 7, 7.7, 'worldcup'),
  (t_australia, 'Mat Ryan', 'GK', 1, 'Australian', 32, 183, 81, 0, 0, 7, 7.8, 'worldcup'),
  (t_croatia, 'Luka Modric', 'CM', 10, 'Croatian', 38, 172, 66, 2, 6, 7, 8.6, 'worldcup'),
  (t_croatia, 'Ivan Perisic', 'LW', 4, 'Croatian', 35, 187, 83, 3, 4, 7, 7.9, 'worldcup'),
  (t_croatia, 'Andrej Kramaric', 'ST', 9, 'Croatian', 33, 177, 72, 4, 3, 7, 8.0, 'worldcup'),
  (t_croatia, 'Marcelo Brozovic', 'CDM', 11, 'Croatian', 31, 181, 72, 0, 3, 7, 8.0, 'worldcup'),
  (t_croatia, 'Joško Gvardiol', 'CB', 24, 'Croatian', 22, 186, 82, 1, 1, 7, 8.3, 'worldcup'),
  (t_croatia, 'Dominik Livaković', 'GK', 1, 'Croatian', 28, 188, 86, 0, 0, 7, 8.2, 'worldcup'),
  (t_uruguay, 'Darwin Núñez', 'ST', 11, 'Uruguayan', 24, 187, 79, 6, 3, 7, 8.4, 'worldcup'),
  (t_uruguay, 'Federico Valverde', 'CM', 8, 'Uruguayan', 25, 182, 77, 3, 4, 7, 8.7, 'worldcup'),
  (t_uruguay, 'Facundo Torres', 'LW', 22, 'Uruguayan', 23, 178, 71, 2, 3, 7, 7.9, 'worldcup'),
  (t_uruguay, 'Rodrigo Bentancur', 'CDM', 5, 'Uruguayan', 26, 187, 77, 1, 2, 7, 8.1, 'worldcup'),
  (t_uruguay, 'José María Giménez', 'CB', 2, 'Uruguayan', 29, 190, 84, 0, 0, 7, 8.0, 'worldcup'),
  (t_uruguay, 'Sergio Rochet', 'GK', 1, 'Uruguayan', 28, 190, 83, 0, 0, 7, 7.7, 'worldcup');

-- Matches: Group A (Brazil, Germany, Japan, Australia)
INSERT INTO matches (home_team_id, away_team_id, match_date, venue, home_score, away_score, status, round, competition, stage, group_name) VALUES
  (t_brazil,      t_germany,      '2026-06-15 18:00:00+00', 'MetLife Stadium, New York',           2, 1, 'completed', 1, 'worldcup', 'group', 'A'),
  (t_japan,       t_australia,    '2026-06-15 21:00:00+00', 'SoFi Stadium, Los Angeles',           1, 0, 'completed', 1, 'worldcup', 'group', 'A'),
  (t_brazil,      t_australia,    '2026-06-19 18:00:00+00', 'AT&T Stadium, Dallas',                3, 0, 'completed', 2, 'worldcup', 'group', 'A'),
  (t_germany,     t_japan,        '2026-06-19 21:00:00+00', 'Arrowhead Stadium, Kansas City',      2, 2, 'completed', 2, 'worldcup', 'group', 'A'),
  (t_australia,   t_germany,      '2026-06-23 18:00:00+00', 'Levi''s Stadium, San Francisco',      0, 3, 'completed', 3, 'worldcup', 'group', 'A'),
  (t_japan,       t_brazil,       '2026-06-23 18:00:00+00', 'Rose Bowl, Los Angeles',              1, 3, 'completed', 3, 'worldcup', 'group', 'A'),
-- Group B (France, Portugal, Senegal, Croatia)
  (t_france,      t_senegal,      '2026-06-16 18:00:00+00', 'Mercedes-Benz Stadium, Atlanta',      3, 1, 'completed', 1, 'worldcup', 'group', 'B'),
  (t_portugal,    t_croatia,      '2026-06-16 21:00:00+00', 'Lincoln Financial Field, Philadelphia',2, 0, 'completed', 1, 'worldcup', 'group', 'B'),
  (t_france,      t_croatia,      '2026-06-20 18:00:00+00', 'Gillette Stadium, Boston',            2, 1, 'completed', 2, 'worldcup', 'group', 'B'),
  (t_portugal,    t_senegal,      '2026-06-20 21:00:00+00', 'Hard Rock Stadium, Miami',            3, 2, 'completed', 2, 'worldcup', 'group', 'B'),
  (t_croatia,     t_senegal,      '2026-06-24 18:00:00+00', 'NRG Stadium, Houston',                1, 1, 'completed', 3, 'worldcup', 'group', 'B'),
  (t_france,      t_portugal,     '2026-06-24 18:00:00+00', 'Caesars Superdome, New Orleans',      1, 2, 'completed', 3, 'worldcup', 'group', 'B'),
-- Group C (Argentina, Spain, Uruguay, Mexico)
  (t_argentina,   t_mexico,       '2026-06-17 18:00:00+00', 'Estadio Azteca, Mexico City',         2, 0, 'completed', 1, 'worldcup', 'group', 'C'),
  (t_spain,       t_uruguay,      '2026-06-17 21:00:00+00', 'BC Place, Vancouver',                 3, 1, 'completed', 1, 'worldcup', 'group', 'C'),
  (t_argentina,   t_uruguay,      '2026-06-21 18:00:00+00', 'Commonwealth Stadium, Edmonton',      1, 1, 'completed', 2, 'worldcup', 'group', 'C'),
  (t_spain,       t_mexico,       '2026-06-21 21:00:00+00', 'BMO Field, Toronto',                  2, 0, 'completed', 2, 'worldcup', 'group', 'C'),
  (t_mexico,      t_uruguay,      '2026-06-25 18:00:00+00', 'Estadio Akron, Guadalajara',          1, 2, 'completed', 3, 'worldcup', 'group', 'C'),
  (t_argentina,   t_spain,        '2026-06-25 18:00:00+00', 'Estadio BBVA, Monterrey',             0, 1, 'completed', 3, 'worldcup', 'group', 'C'),
-- Group D (England, Netherlands, Morocco, USA)
  (t_england,     t_usa,          '2026-06-18 18:00:00+00', 'Allegiant Stadium, Las Vegas',        3, 1, 'completed', 1, 'worldcup', 'group', 'D'),
  (t_netherlands, t_morocco,      '2026-06-18 21:00:00+00', 'Lumen Field, Seattle',                1, 2, 'completed', 1, 'worldcup', 'group', 'D'),
  (t_england,     t_morocco,      '2026-06-22 18:00:00+00', 'State Farm Stadium, Phoenix',         2, 0, 'completed', 2, 'worldcup', 'group', 'D'),
  (t_netherlands, t_usa,          '2026-06-22 21:00:00+00', 'Q2 Stadium, Austin',                  3, 1, 'completed', 2, 'worldcup', 'group', 'D'),
  (t_usa,         t_morocco,      '2026-06-26 18:00:00+00', 'MetLife Stadium, New York',           1, 2, 'completed', 3, 'worldcup', 'group', 'D'),
  (t_england,     t_netherlands,  '2026-06-26 18:00:00+00', 'Rose Bowl, Los Angeles',              1, 1, 'completed', 3, 'worldcup', 'group', 'D'),
-- Round of 16
  (t_brazil,      t_morocco,      '2026-06-30 18:00:00+00', 'MetLife Stadium, New York',           2, 1, 'completed', 4, 'worldcup', 'round_of_16', NULL),
  (t_germany,     t_england,      '2026-06-30 21:00:00+00', 'Rose Bowl, Los Angeles',              1, 2, 'completed', 4, 'worldcup', 'round_of_16', NULL),
  (t_portugal,    t_uruguay,      '2026-07-01 18:00:00+00', 'Hard Rock Stadium, Miami',            3, 1, 'completed', 4, 'worldcup', 'round_of_16', NULL),
  (t_france,      t_spain,        '2026-07-01 21:00:00+00', 'AT&T Stadium, Dallas',                2, 3, 'completed', 4, 'worldcup', 'round_of_16', NULL),
-- Quarterfinals
  (t_brazil,      t_england,      '2026-07-05 18:00:00+00', 'MetLife Stadium, New York',           2, 1, 'completed', 5, 'worldcup', 'quarterfinal', NULL),
  (t_portugal,    t_spain,        '2026-07-05 21:00:00+00', 'Rose Bowl, Los Angeles',              1, 2, 'completed', 5, 'worldcup', 'quarterfinal', NULL),
-- Semifinals
  (t_brazil,      t_spain,        '2026-07-09 21:00:00+00', 'MetLife Stadium, New York',           1, 2, 'completed', 6, 'worldcup', 'semifinal', NULL),
  (t_england,     t_portugal,     '2026-07-09 18:00:00+00', 'Rose Bowl, Los Angeles',              1, 2, 'completed', 6, 'worldcup', 'semifinal', NULL),
-- Third place
  (t_brazil,      t_england,      '2026-07-12 15:00:00+00', 'Rose Bowl, Los Angeles',              3, 2, 'completed', 7, 'worldcup', 'third_place', NULL),
-- Final: Spain vs Portugal
  (t_spain,       t_portugal,     '2026-07-13 18:00:00+00', 'MetLife Stadium, New York',           2, 1, 'completed', 8, 'worldcup', 'final', NULL);

END $$;
