# Local AI model for OptionScope “learning brain” — BACKBURNER research

**Status:** PARKED until OptionScope is ~**95% complete**  
**Owner:** Michael Chapman (local-only personal build)  
**Date:** 2026-07-12  
**Decision gate:** Pull this doc at 95% and decide **need vs nice-to-have**. Wire only if needed.

---

## 1. Intent (what you asked for)

For a **personal, local-machine-only** OptionScope:

- Give the **learning / explain brain** its own **AI model already loaded on this PC**
- **Not Ollama** as the target runtime (even if Ollama is installed for other work)
- Keep cloud keys optional; prefer offline after models are on disk
- Example path you flagged: `C:\Windows.old\Users\NerdC\wan2gp`

This is **not** implementation work now. Engineering already has a **catalog-grounded explainer** (`src/brain/explain.ts`) that does not need a neural model. Local LLM would be **Phase 5.1 polish / deeper synthesis** only.

---

## 2. Inventory of what’s already on this machine

| Asset | Path / evidence | Fit for OptionScope explain brain? |
|-------|-----------------|-------------------------------------|
| **Wan2GP (WanGP)** | `C:\Windows.old\Users\NerdC\wan2gp` — full install (`wgp.py`, `venv`, `ckpts`, `models\wan|flux|ltx_video|qwen|TTS|…`) | **Weak fit for text reasoning.** WanGP is a **media generative super-app** (video/image/audio/TTS: Wan 2.1/2.2, Flux, LTX, Qwen Image, etc.). Useful later for NerdCommand **cinema**, not primary trade explainer. |
| **Wan2GP config** | `wgp_config.json` — DeepY tools for image/video/speech; `deepy_context_tokens: 16386` | Shows local agent-style tooling inside WanGP, still **gen-media oriented**. |
| **HF cache** | `~\.cache\huggingface\hub` — includes `models--Wan-AI--Wa*` and others | Weights already downloaded; mostly **vision/video** family so far. |
| **LM Studio** | `~\.lmstudio`, `AppData\Roaming\LM Studio`, lm-studio-updater | **Best non-Ollama candidate** for chat/completions via OpenAI-compatible local server. |
| **Ollama** | Installed under Local Programs | Present but **explicitly deprioritized** by product preference. |
| **ComfyUI** | `D:\ComfyUI` | Image/video graphs — not trade text brain. |
| **GGUF scan (shallow)** | No `.gguf` found in limited depth search | Text LLMs may live deeper under LM Studio hub; re-scan at wire time. |

### Critical distinction

```
Wan2GP  →  generate video / image / speech  (NerdCommand studio track)
OptionScope learning brain  →  reason over structured trade facts + book citations  (fintech text track)
```

**Do not force Wan2GP as the options explainer** unless you later add multimodal features (e.g. chart screenshot narrative). For Phase 5.1 text polish, prefer a **local chat LLM server**.

---

## 3. Recommended non-Ollama local stacks (priority order)

### A. LM Studio local server ⭐ primary recommendation

| | |
|--|--|
| **Why** | Already on this PC; OpenAI-compatible `/v1/chat/completions`; easy model switch; no Ollama dependency |
| **Typical URL** | `http://127.0.0.1:1234/v1` (enable “Local Server” in LM Studio) |
| **Models** | Any GGUF / MLX you download in LM Studio (e.g. Qwen2.5-7B/14B, Llama-3.1-8B, Phi-4, DeepSeek-R1-distill) |
| **VRAM** | 7B Q4 ≈ 5–8 GB; 14B Q4 ≈ 10–14 GB — match to your GPU |
| **OptionScope env (future)** | See §5 |

### B. llama.cpp `server` (or `llama-server`)

| | |
|--|--|
| **Why** | Direct GGUF, zero Electron overhead, rock-solid OpenAI-ish or native HTTP |
| **When** | You want max performance / headless auto-start with OptionScope |
| **Path later** | Point at same GGUF files LM Studio uses |

### C. Hugging Face `transformers` + small OpenAI shim

| | |
|--|--|
| **Why** | Reuse `~\.cache\huggingface` if you add **text** models (not just Wan) |
| **When** | You already run a Python env and want one process with catalog embeddings too |

### D. Explicitly **not** the default for this product choice

| Runtime | Note |
|---------|------|
| **Ollama** | Installed; fine for other apps; **do not make it required** for personal OptionScope |
| **Wan2GP** | Wrong modality for ranking/explain; keep for **media / NerdCommand** |
| **Cloud only** | Optional later; personal local build prefers offline |

---

## 4. Do we even need a local neural model? (95% decision frame)

| Job | Who does it today | Neural model needed? |
|-----|-------------------|----------------------|
| Rank strategies | Deterministic brain (`selector.ts` + rules + NCI) | **No** |
| Size positions | Portfolio policy + live Alpaca equity | **No** |
| PoP / EV | Monte Carlo engine | **No** |
| Explain with book citations | `explainStrategy()` + `searchCatalog()` | **No** (already works) |
| Friendlier prose / multi-turn Q&A / “teach me this spread” | — | **Yes, optional** |
| Chart screenshot → narrative | — | **Maybe** (vision LLM or separate) |
| Auto-trade | Never | **Never** |

### Decision rule at 95%

1. Use OptionScope for 1–2 weeks on paper with **catalog-grounded Explain only**.  
2. If you still want richer dialogue / tutoring → wire **LM Studio** (or llama.cpp).  
3. If Explain already feels like a “second brain” → **skip** neural model; less risk of freelanced advice.  
4. Wan2GP: only revisit for **studio media**, not core trading brain.

---

## 5. Wire-up design (ready when you green-light)

### Architecture (facts stay locked)

```
MarketContext + BrainDecision + ScoredRecommendation
        │
        ▼
 explainStrategy()  ──► facts + citations + risks  (deterministic, source of truth)
        │
        ▼  [optional AI_EXPLAIN_MODE=local]
 Local LLM (LM Studio / llama.cpp)
        │
        ▼
 prose rewrite ONLY — must not invent strikes, PoP, size, or “buy now”
        │
        ▼
 UI Explain panel
```

### Env contract (future `.env.local` — do not commit secrets)

```bash
# Phase 5.1 — optional local learning brain
AI_EXPLAIN_MODE=catalog          # catalog | local | off
LOCAL_LLM_BASE_URL=http://127.0.0.1:1234/v1
LOCAL_LLM_API_KEY=lm-studio      # many local servers ignore key; placeholder OK
LOCAL_LLM_MODEL=                   # e.g. qwen2.5-14b-instruct
LOCAL_LLM_TIMEOUT_MS=120000
# Hard rules enforced in code regardless of model:
# - Inject facts JSON; refuse to output new numbers for PoP/EV/strikes
# - Append disclaimer
# - No order placement tools
```

### Code touchpoints (already scaffolded in spirit)

| File | Role when wiring |
|------|------------------|
| `src/brain/explain.ts` | Keep as **fact + citation** generator |
| `src/app/api/brain/explain/route.ts` | Branch on `AI_EXPLAIN_MODE` |
| New `src/brain/localLlm.ts` | Thin OpenAI-compatible chat client |
| `docs/research/LOCAL_LLM_BACKBURNER.md` | This file — re-read before coding |

### System prompt skeleton (when implementing)

```
You are OptionScope’s educational explainer.
You MAY rephrase the provided thesis/whyNow/risks for clarity.
You MUST NOT invent strikes, premiums, PoP, EV, contract size, or account numbers.
You MUST treat all probabilities as model estimates under stated assumptions.
You MUST NOT encourage auto-trading or claim affiliation with Robinhood.
If unsure, say so and point the user back to the checklist.
FACTS_JSON: {...}
CITATIONS: [...]
```

### Health check endpoint (future)

`GET /api/brain/local-llm/health` → `{ ok, baseUrl, model, latencyMs }` so UI can badge **LOCAL MODEL ONLINE / OFFLINE**.

---

## 6. Wan2GP path notes (your example)

| Item | Detail |
|------|--------|
| **Path** | `C:\Windows.old\Users\NerdC\wan2gp` |
| **Risk** | `Windows.old` can be **removed by Disk Cleanup** after upgrades — fragile for long-term |
| **Action before relying on it** | Copy/move install to something durable, e.g. `D:\AI\Wan2GP` or `C:\Users\Michael Chapman\AI\Wan2GP` |
| **Role in NerdCommand** | Video/image/audio generation (cinematic studio track) |
| **Role in OptionScope** | **None by default.** Optional future: generate educational diagram clips or TTS of checklist — separate from ranking brain |

### Wan2GP model families observed under install

`models\`: flux, hyvideo, kandinsky5, longcat, ltx_video, ltx2, magi_human, qwen, TTS, wan, z_image  

`ckpts\`: umt5-xxl, wav2vec, xlm-roberta-large, depth/pose/flow tools, etc.

These are **encoder / diffusion / media** stacks, not a drop-in options analyst LLM.

---

## 7. Suggested local text models (when you buy the GPU time)

Pick **one** instruct model in LM Studio (non-Ollama):

| Tier | Model class | Use |
|------|-------------|-----|
| Light | 3–4B instruct Q4 | Fast explain polish |
| Sweet spot | **7–8B instruct Q4/Q5** | Daily driver for personal use |
| Heavy | 14B+ Q4 | Better book synthesis if VRAM allows |

Prefer models good at **following constraints** (Qwen2.5-Instruct, Llama-3.1-Instruct, Phi-4). Avoid unconstrained base models for financial UI.

---

## 8. Security & compliance (local personal build)

- Keys never leave machine; local server binds **127.0.0.1 only**
- Still show **educational / not advice** in UI
- Local model can still **hallucinate** — fact-lock pattern is mandatory
- Do not give the model tools that place Alpaca/RH orders
- Paper account only for sizing until you consciously go live

---

## 9. Checklist when we hit ~95% complete

- [ ] Product journeys feel solid (Command, Trade Lab, Compare, Journal)
- [ ] Catalog Explain used in real paper trades for 1–2 weeks  
- [ ] Decide: **keep catalog-only** vs **add local LLM polish**  
- [ ] If add: install/download instruct GGUF in **LM Studio** (not Ollama)  
- [ ] Start LM Studio server on `127.0.0.1:1234`  
- [ ] Set `AI_EXPLAIN_MODE=local` + env vars  
- [ ] Implement `localLlm.ts` + fact-lock system prompt  
- [ ] Badge LOCAL MODEL ONLINE in Trade Lab  
- [ ] Optional: migrate Wan2GP out of `Windows.old` for studio work only  

---

## 10. One-line summary for future Grok / Agency

> **Personal OptionScope: default learning brain is deterministic + book catalog; optional non-Ollama local chat via LM Studio OpenAI API for prose only; Wan2GP is local media gen (path currently under Windows.old) — not the options reasoner.**

---

## Related product docs

- Vision: `docs/design/00-VISION-HANDOFF.md`
- Phase 5 explain: `src/brain/explain.ts`, `ROADMAP.md` Phase 5 / 5.1  
- Live account: `src/data/alpacaTrading.ts`  
- **Options-obsessed LM Studio directives (embed later):** `docs/research/LM_STUDIO_OPTIONS_BRAIN_DIRECTIVES.md`

_End of backburner research. Do not implement until ~95% gate._
