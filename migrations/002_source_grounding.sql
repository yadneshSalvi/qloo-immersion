-- Correct the first sample item's wording to ask only what its assigned passage states.
-- The answer and objective are unchanged; no learner score is altered.
UPDATE assessment_items
SET public_item = jsonb_set(public_item, '{prompt}', '"What is the woman preparing at the stall?"'),
    answer_key = jsonb_set(answer_key, '{explanation}', '"The woman is preparing squash soup in the first passage. “Sopa de calabaza” is squash soup."')
WHERE id = 'una-mesa-en-el-mercado-q1'
  AND public_item->>'prompt' = 'What does Clara order at the market?';
INSERT INTO schema_migrations(version) VALUES(2) ON CONFLICT DO NOTHING;
