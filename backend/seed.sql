BEGIN;

INSERT INTO event_types (name, icon_url, color_code, description)
VALUES
  ('accident', NULL, '#E53935', 'ДТП'),
  ('police', NULL, '#1E88E5', 'Пост ДПС'),
  ('chat', NULL, '#43A047', 'Чат/обсуждение'),
  ('official', NULL, '#8E24AA', 'Официальное событие'),
  ('other', NULL, '#757575', 'Другое')
ON CONFLICT (name) DO NOTHING;

INSERT INTO report_reasons (name, description, priority)
VALUES
  ('spam', 'Спам / реклама', 5),
  ('abuse', 'Оскорбления / токсичность', 7),
  ('fake', 'Недостоверная информация', 8),
  ('other', 'Другое', 1)
ON CONFLICT (name) DO NOTHING;

COMMIT;

