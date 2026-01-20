#!/bin/bash

echo "測試 listConversations API..."
echo ""

# 測試不帶參數
echo "1. 測試空參數:"
curl -s 'https://sales-ai-server.salesaiautomationv3.workers.dev/rpc/conversations/list' \
  -H 'Content-Type: application/json' \
  -d '{}' | jq '.error // {success: true}' 2>/dev/null || echo "請求失敗"

echo ""
echo "2. 測試帶 limit 和 offset:"
curl -s 'https://sales-ai-server.salesaiautomationv3.workers.dev/rpc/conversations/list' \
  -H 'Content-Type: application/json' \
  -d '{"limit": 10, "offset": 0}' | jq '.error // {success: true}' 2>/dev/null || echo "請求失敗"

