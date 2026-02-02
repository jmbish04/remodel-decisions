-- Disable foreign key checks temporarily to ensure bulk inserts work smoothly
PRAGMA defer_foreign_keys = ON;

-- Clear existing data if re-seeding
DELETE FROM items;
DELETE FROM categories;
DELETE FROM areas;

-- 1. Insert Areas
INSERT INTO areas (id, title, icon, sort_order) VALUES 
('floor1_general', '1st Floor General', 'LayoutDashboard', 1),
('kitchen_living', 'Kitchen & Living', 'ChefHat', 2),
('exterior', 'Exterior & Patio', 'Flower', 3),
('floor2_general', '2nd Floor & Stairs', 'ArrowUpCircle', 4),
('family_library', 'Family & Library', 'BookOpen', 5),
('laundry_new', 'New Laundry Room', 'RotateCcw', 6),
('guest_suite', 'Guest Bed & Bath', 'Sofa', 7),
('primary_suite', 'Primary Suite', 'Bath', 8);

-- 2. Insert Categories (Using explicit IDs to map items later)
-- floor1_general categories (IDs 1-3)
INSERT INTO categories (id, area_id, name, sort_order) VALUES 
(1, 'floor1_general', 'Flooring Decisions', 1),
(2, 'floor1_general', 'Entryway', 2),
(3, 'floor1_general', '1st Floor Bath', 3);

-- kitchen_living categories (IDs 4-6)
INSERT INTO categories (id, area_id, name, sort_order) VALUES 
(4, 'kitchen_living', 'Structural (Wall Removal)', 1),
(5, 'kitchen_living', 'Kitchen Config', 2),
(6, 'kitchen_living', 'Living Room', 3);

-- exterior categories (IDs 7-8)
INSERT INTO categories (id, area_id, name, sort_order) VALUES 
(7, 'exterior', 'Backyard Drainage', 1),
(8, 'exterior', 'Patio & Deck', 2);

-- floor2_general categories (IDs 9-10)
INSERT INTO categories (id, area_id, name, sort_order) VALUES 
(9, 'floor2_general', 'Stairs', 1),
(10, 'floor2_general', 'Flooring', 2);

-- family_library categories (IDs 11-12)
INSERT INTO categories (id, area_id, name, sort_order) VALUES 
(11, 'family_library', 'Family Room', 1),
(12, 'family_library', 'Library', 2);

-- laundry_new categories (IDs 13-14)
INSERT INTO categories (id, area_id, name, sort_order) VALUES 
(13, 'laundry_new', 'Conversion (Old Hall Bath)', 1),
(14, 'laundry_new', 'Lightwell Expansion', 2);

-- guest_suite categories (IDs 15-16)
INSERT INTO categories (id, area_id, name, sort_order) VALUES 
(15, 'guest_suite', 'Guest Bath (Relocated)', 1),
(16, 'guest_suite', 'Guest Bedroom / Office', 2);

-- primary_suite categories (IDs 17-18)
INSERT INTO categories (id, area_id, name, sort_order) VALUES 
(17, 'primary_suite', 'Primary Closet (Converted Room)', 1),
(18, 'primary_suite', 'Primary Bath', 2);


-- 3. Insert Items
-- Cat 1: Flooring Decisions
INSERT INTO items (id, category_id, label, note, is_checked, sort_order) VALUES
('f1_1', 1, 'DECISION: Polished Concrete vs Engineered Hardwood?', 'Consider durability vs warmth', 0, 1),
('f1_2', 1, 'Subfloor prep required?', 'Especially if choosing concrete', 0, 2),
('f1_3', 1, 'Baseboard style selection', '', 0, 3);

-- Cat 2: Entryway
INSERT INTO items (id, category_id, label, note, is_checked, sort_order) VALUES
('f1_4', 2, 'Front Door Refinish/Replace', '', 0, 1),
('f1_5', 2, 'Entry Lighting (Chandelier/Sconces)', '', 0, 2),
('f1_6', 2, 'Coat Closet Organization', '', 0, 3);

-- Cat 3: 1st Floor Bath
INSERT INTO items (id, category_id, label, note, is_checked, sort_order) VALUES
('f1_7', 3, 'Vanity Selection', '', 0, 1),
('f1_8', 3, 'Shower/Tub Config', '', 0, 2),
('f1_9', 3, 'Ventilation Fan', '', 0, 3);

-- Cat 4: Structural (Wall Removal)
INSERT INTO items (id, category_id, label, note, is_checked, sort_order) VALUES
('kl1', 4, 'Structural Beam Installation', 'Where wall is being removed', 0, 1),
('kl2', 4, 'Electrical Rerouting', 'Outlets/switches in removed wall', 0, 2),
('kl3', 4, 'HVAC Vent Relocation', 'If vents were in the wall', 0, 3),
('kl4', 4, 'Drywall Patching/Texture Match', 'Ceiling & Walls', 0, 4);

-- Cat 5: Kitchen Config
INSERT INTO items (id, category_id, label, note, is_checked, sort_order) VALUES
('kl5', 5, 'Island Design (Seating flow to living)', '', 0, 1),
('kl6', 5, 'Appliance Layout', '', 0, 2),
('kl7', 5, 'Cabinetry Finish', '', 0, 3);

-- Cat 6: Living Room
INSERT INTO items (id, category_id, label, note, is_checked, sort_order) VALUES
('kl8', 6, 'Window Replacement?', '', 0, 1),
('kl9', 6, 'Lighting Plan (Open Concept)', 'Dimmers for different zones', 0, 2);

-- Cat 7: Backyard Drainage
INSERT INTO items (id, category_id, label, note, is_checked, sort_order) VALUES
('ex1', 7, 'French Drain Installation', 'Map out path', 0, 1),
('ex2', 7, 'Bioswale Design & Plants', 'Native plants for absorption', 0, 2),
('ex3', 7, 'Grading Check', 'Slope away from foundation', 0, 3);

-- Cat 8: Patio & Deck
INSERT INTO items (id, category_id, label, note, is_checked, sort_order) VALUES
('ex4', 8, 'Sliding Glass Door (Living to Patio)', 'Size specs & header needs', 0, 1),
('ex5', 8, 'Patio Floor Covering', 'Tile, Pavers, or Concrete?', 0, 2),
('ex6', 8, 'Juliet Deck Engineering (5x25)', 'Load bearing for new deck', 0, 3),
('ex7', 8, 'Juliet Deck Railing Style', '', 0, 4),
('ex8', 8, 'Waterproofing Deck (Roof for Patio)', 'Crucial for patio below', 0, 5);

-- Cat 9: Stairs
INSERT INTO items (id, category_id, label, note, is_checked, sort_order) VALUES
('f2_1', 9, 'Stair Flooring (Match 2nd floor)', '', 0, 1),
('f2_2', 9, 'Under-nose Lighting Wiring', 'Requires routing before tread install', 0, 2),
('f2_3', 9, 'Handrail Update?', '', 0, 3);

-- Cat 10: Flooring (2nd Floor)
INSERT INTO items (id, category_id, label, note, is_checked, sort_order) VALUES
('f2_4', 10, 'Engineered Hardwood Selection', '', 0, 1),
('f2_5', 10, 'Subfloor Squeak Check', 'Fix before laying new floor', 0, 2);

-- Cat 11: Family Room
INSERT INTO items (id, category_id, label, note, is_checked, sort_order) VALUES
('fl1', 11, 'DECISION: Resize Fireplace?', 'Change framing/opening size', 0, 1),
('fl2', 11, 'DECISION: Convert to Gas Logs?', 'Run gas line if needed', 0, 2),
('fl3', 11, 'TV Area / AV Wiring', '', 0, 3);

-- Cat 12: Library
INSERT INTO items (id, category_id, label, note, is_checked, sort_order) VALUES
('fl4', 12, 'Built-in Shelving Design', '', 0, 1),
('fl5', 12, 'Reading Light Wiring', '', 0, 2);

-- Cat 13: New Laundry - Conversion
INSERT INTO items (id, category_id, label, note, is_checked, sort_order) VALUES
('ln1', 13, 'Cap old toilet/vanity plumbing', '', 0, 1),
('ln2', 13, 'Run 220V for Dryer', '', 0, 2),
('ln3', 13, 'Washer Drain Box Installation', '', 0, 3);

-- Cat 14: New Laundry - Lightwell Expansion
INSERT INTO items (id, category_id, label, note, is_checked, sort_order) VALUES
('ln4', 14, 'Structural Framing for Expansion', 'Into lightwell area', 0, 1),
('ln5', 14, 'Exterior Waterproofing/Siding', 'Critical for former lightwell', 0, 2),
('ln6', 14, 'Roofing tie-in for expansion', '', 0, 3),
('ln7', 14, 'Ventilation Route', 'Dryer vent path', 0, 4);

-- Cat 15: Guest Bath (Relocated)
INSERT INTO items (id, category_id, label, note, is_checked, sort_order) VALUES
('gs1', 15, 'Plumbing Rough-in (New Location)', 'From back of house', 0, 1),
('gs2', 15, 'Vent Stack Routing', '', 0, 2),
('gs3', 15, 'Fixture Selection', '', 0, 3);

-- Cat 16: Guest Bedroom / Office
INSERT INTO items (id, category_id, label, note, is_checked, sort_order) VALUES
('gs4', 16, 'Data/Ethernet drops', 'For office use', 0, 1),
('gs5', 16, 'Closet config', '', 0, 2);

-- Cat 17: Primary Closet
INSERT INTO items (id, category_id, label, note, is_checked, sort_order) VALUES
('ps1', 17, 'Close up old room entry?', 'If combining with primary', 0, 1),
('ps2', 17, 'Create opening to Primary Bed', '', 0, 2),
('ps3', 17, 'Custom System Design', 'Island, Hanging, Shelves', 0, 3),
('ps4', 17, 'Lighting Plan', 'Crucial for windowless closet', 0, 4);

-- Cat 18: Primary Bath
INSERT INTO items (id, category_id, label, note, is_checked, sort_order) VALUES
('ps5', 18, 'Layout Changes?', '', 0, 1),
('ps6', 18, 'Steam Shower?', 'Requires specific glass/vapor barrier', 0, 2),
('ps7', 18, 'Heated Floors', '', 0, 3);
