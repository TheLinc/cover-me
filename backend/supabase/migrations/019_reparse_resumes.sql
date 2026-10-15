-- The resume parse used to read only the first 6,000 characters, so a longer
-- resume's cached structure is missing its later sections (often education).
-- The text is encrypted, so the long ones can't be picked out here: drop every
-- cached parse. The next tailor parses the whole resume again and re-caches it.
UPDATE public.resumes SET structured_encrypted = NULL WHERE structured_encrypted IS NOT NULL;
