INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('signalements-captures', 'signalements-captures', false, 2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];
