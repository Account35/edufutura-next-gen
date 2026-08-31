# Fix: "AI returned unexpected format" when creating a quiz with AI

## What is happening

The quiz generator calls OpenRouter models in a fixed order. The first model in that list is a
*reasoning* model (`nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`). The backend logs for the
failed run show that model being selected, and the error you see ends with an empty preview — the
model returned no usable message content, so there was nothing to parse into questions.

Two causes combine:
- Reasoning models put most of their output in a separate `reasoning` field, and the code only reads
  `message.content`. With a low token cap the visible content ends up empty or cut off mid-JSON.
- The generation cap is 2000 tokens, which is not enough for 10 questions with options and
  explanations, so even non-reasoning models can be truncated into invalid JSON.

## The fix

Changes limited to the quiz generation backend function:

1. Reorder the model list to put reliable instruction-following models first and drop the
   reasoning-only model from the default path.
2. Read the response more defensively: fall back to `reasoning` / `reasoning_content` when
   `content` is empty, so reasoning models still work if they are reached.
3. Ask OpenRouter for JSON output explicitly (`response_format: json_object`) with a schema-shaped
   prompt, and repair truncated JSON arrays before giving up.
4. Raise the token cap so a full 10-question set fits, keeping the existing credit-aware retry that
   reduces the cap on a 402.
5. Treat an empty or unparseable response as a retryable failure so the loop moves to the next
   model instead of failing the whole request, and surface the last model's real reason (rate limit,
   credit, truncation) in the message shown in the modal.

## Technical notes

- File: `supabase/functions/generate-quiz/index.ts`
- `getMessageContent` gains reasoning-field fallbacks.
- `parseQuestions` gains a truncation repair pass: trim to the last complete `}` and close the array
  before parsing.
- `DEFAULT_MAX_TOKENS` raised from 2000 to a value sized to the requested question count.
- No frontend, database, or schema changes; the modal already renders whatever error the function
  returns.

## Verification

Redeploy the function and generate a quiz from a real chapter through the admin modal, then confirm
the questions save and appear in the quiz editor.
