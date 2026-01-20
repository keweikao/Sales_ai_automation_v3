-- 查詢目前的 owner
SELECT 
  c.case_number,
  o.company_name,
  u.name as owner_name,
  u.email as owner_email,
  u.id as owner_id
FROM conversations c
JOIN opportunities o ON c.opportunity_id = o.id
JOIN "user" u ON o.user_id = u.id
WHERE c.id = 'cf75684f-4f5b-4667-8e09-0cd50262d9bc';

-- 更新 opportunity 的 owner 為新的 Google OAuth user
UPDATE opportunities
SET 
  user_id = 'EcVY4mP1Jqaqr0IzO4H3No4wEUhq5q05',
  updated_at = NOW()
WHERE id = (
  SELECT opportunity_id 
  FROM conversations 
  WHERE id = 'cf75684f-4f5b-4667-8e09-0cd50262d9bc'
);

-- 驗證更新結果
SELECT 
  c.case_number,
  o.company_name,
  u.name as owner_name,
  u.email as owner_email,
  u.id as owner_id
FROM conversations c
JOIN opportunities o ON c.opportunity_id = o.id
JOIN "user" u ON o.user_id = u.id
WHERE c.id = 'cf75684f-4f5b-4667-8e09-0cd50262d9bc';
