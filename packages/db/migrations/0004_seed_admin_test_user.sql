INSERT INTO `users` (
  `id`,
  `email`,
  `email_verified`,
  `password_hash`,
  `password_salt`,
  `password_updated_at`,
  `current_game_character_id`,
  `is_admin`,
  `created_at`,
  `updated_at`
)
VALUES (
  'user_test_admin',
  'admin@albionbox.local',
  1,
  '6aa2414673cf5749a4db9e25eba096150fed37b4ed19b28f1cbe012b64c874a4',
  'test-admin-salt-v1',
  CAST(unixepoch() AS integer),
  NULL,
  1,
  CAST(unixepoch() AS integer),
  CAST(unixepoch() AS integer)
)
ON CONFLICT(`email`) DO UPDATE SET
  `id` = 'user_test_admin',
  `email_verified` = 1,
  `password_hash` = '6aa2414673cf5749a4db9e25eba096150fed37b4ed19b28f1cbe012b64c874a4',
  `password_salt` = 'test-admin-salt-v1',
  `password_updated_at` = CAST(unixepoch() AS integer),
  `current_game_character_id` = NULL,
  `is_admin` = 1,
  `updated_at` = CAST(unixepoch() AS integer);
