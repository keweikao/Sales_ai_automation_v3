# MEDDIC Agent Prompts - V2 Migration

⚠️ **CRITICAL**: These prompts MUST be copied verbatim from V2 production system.

## Source Location

V2 GitHub Repository: https://github.com/keweikao/sales-ai-automation-V2
Path: `modules/03-sales-conversation/meddic/agents/prompts/`

## Required Files

1. **global-context.md** - iCHEF business framework (三層承諾事件)
2. **agent1-context.md** - Meeting background analysis
3. **agent2-buyer.md** - MEDDIC core analysis (most important)
4. **agent3-seller.md** - Sales strategy assessment
5. **agent4-summary.md** - Customer-oriented summary
6. **agent5-crm-extractor.md** - CRM field extraction (V2's agent6)
7. **agent6-coach.md** - Real-time coaching system

## Migration Instructions

```bash
# Clone V2 repo
git clone https://github.com/keweikao/sales-ai-automation-V2.git /tmp/v2

# Copy prompts (verbatim - DO NOT modify)
cp /tmp/v2/modules/03-sales-conversation/meddic/agents/prompts/global-context.md ./global-context.md
cp /tmp/v2/modules/03-sales-conversation/meddic/agents/prompts/agent1-context.md ./agent1-context.md
cp /tmp/v2/modules/03-sales-conversation/meddic/agents/prompts/agent2-buyer.md ./agent2-buyer.md
cp /tmp/v2/modules/03-sales-conversation/meddic/agents/prompts/agent3-seller.md ./agent3-seller.md
cp /tmp/v2/modules/03-sales-conversation/meddic/agents/prompts/agent4-summary.md ./agent4-summary.md
cp /tmp/v2/modules/03-sales-conversation/meddic/agents/prompts/agent6.md ./agent5-crm-extractor.md
cp /tmp/v2/modules/03-sales-conversation/meddic/agents/prompts/agent_coach.md ./agent6-coach.md
```

## Validation

After copying, verify:
- [ ] All 7 files exist
- [ ] File content matches V2 exactly (use diff)
- [ ] No modifications to prompt text
- [ ] All files use UTF-8 encoding
- [ ] Preserve all formatting, line breaks, and special characters

## Why Verbatim Copy?

These prompts have been:
- ✅ Production-validated (~300 cases/month)
- ✅ Optimized for iCHEF business model
- ✅ Tuned for Gemini 2.0 Flash
- ✅ Tested for Chinese language processing

**Any modifications may reduce accuracy and effectiveness.**
