
UPDATE auth.users SET
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  reauthentication_token = COALESCE(reauthentication_token, ''),
  email_change = COALESCE(email_change, '')
WHERE email IN ('dos@gmail.com', 'dod@gmail.com', 'principal@gmail.com', 'teacher@gmail.com', 'discipline_staff@gmail.com');
