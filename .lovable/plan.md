
## Problem

The `generate-quiz` edge function fails because:
1. `google/gemini-2.5-flash` (paid) returns **402** — only 2625 tokens affordable, but we request 4000.
2. All `:free` fallback models return **404** — they've been deprecated/renamed on OpenRouter.

The user-supplied model `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` is currently available and free.

## Fix

### 1. Update model list in `supabase/functions/generate-quiz/index.ts`

Replace `FREE_MODELS` with currently-working free models (verified on OpenRouter):

```ts
const FREE_MODELS = [
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "deepseek/deepseek-chat-v3.1:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-2-9b-it:free",
  "google/gemini-2.5-flash", // paid fallback last
];
```

### 2. Lower `max_tokens` to stay within credit budget

Change `max_tokens: 4000` → `max_tokens: 2000` so paid Gemini doesn't 402. Free models aren't credit-limited.

### 3. Auto-retry on 402 with reduced max_tokens

When a model returns **402** with the "can only afford X" message, parse the affordable token count from the error and retry that same model once with `max_tokens = affordable - 100`. This is the "loop again when limit reached" behavior the user asked for, applied to the credit case.

### 4. Apply same fix to `extract-curriculum-content`

Mirror the same model list + 402-retry logic to the extraction function (same root cause — the user reported this on the extract flow too).

### 5. Keep all error responses as JSON with `success: false`

Already done — preserves the precise error toast in the UI.

## Files to change

- `supabase/functions/generate-quiz/index.ts` — new `FREE_MODELS`, lower `max_tokens`, add 402-retry helper
- `supabase/functions/extract-curriculum-content/index.ts` — same model list + 402-retry

## Out of scope

- No DB/schema changes
- No frontend changes (the modal already surfaces precise errors)
- No new secrets needed
