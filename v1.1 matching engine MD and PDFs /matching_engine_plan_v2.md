
# Clarity Matching Engine Plan (V2 – Full Spec)

## 1. Product Philosophy
Clarity is not a dating app. It is a system that matches how people interact.

Traditional apps optimize:
- Attractiveness
- Swipes
- Engagement loops

Clarity optimizes:
- Communication compatibility
- Predictability
- Reduced ambiguity
- Friction awareness

---

## 2. Core Matching Equation

FinalScore =
(BaseCompatibility)
- (FrictionPenalty)
+ (IntentBoost)
+ (MutualPreferenceBoost)
+ (ConfidenceAdjustment)

---

## 3. Core Dimensions (Weighted)

1. Intent Alignment – 25%
2. Communication Compatibility – 25%
3. Social Rhythm – 15%
4. Reliability / Predictability – 15%
5. Interest Depth – 10%
6. Values Alignment – 10%

---

## 4. Friction Engine (Differentiator)

Instead of hiding mismatch, expose it.

### Types:
- Communication friction
- Response pace mismatch
- Planning mismatch
- Emotional processing mismatch
- Reliability mismatch

### Output Example:
- “Strong match with one key friction: response pace difference”

---

## 5. NLP Architecture

### Layer 1: Profile Parsing
Extract:
- Directness
- Depth preference
- Structure vs spontaneity
- Reassurance needs
- Communication clarity

### Layer 2: Conversation Analysis
Detect:
- Reciprocity
- Depth
- Tone alignment
- Low signal
- Misunderstanding risk

### Layer 3: Adaptive Matching
Update traits based on:
- Observed behavior
- Message patterns
- Engagement outcomes

---

## 6. Database Schema

### users
Basic identity and filters

### user_traits
trait_name, value, source, confidence

### user_interests
interest, intensity, frequency

### match_scores
all sub scores + friction + explanation

### conversation_signals
reciprocity, tone, depth, drift

---

## 7. API Contract

POST /match/compute  
→ returns compatibility + friction + explanation

GET /match/{id}  
→ returns full breakdown

POST /conversation/analyze  
→ returns interaction signals

---

## 8. Product Features

- Guided onboarding (anti-bullshit profiles)
- Structured chat prompts
- Expectation alignment before chat
- Low signal detection
- Friction transparency
- Match explanation layer

---

## 9. Positioning

“We match how people interact, not just who they are.”

---

## 10. MVP Build Order

1. Trait-based onboarding
2. Rule-based matching engine
3. NLP profile parser
4. Conversation analyzer
5. Match explanation system

---

## 11. Strategic Advantage

No competitor currently:
- Models interaction style directly
- Predicts friction explicitly
- Adapts based on real conversations

This is the wedge.

---

## 12. Final Note

Do not overclaim.

This is not:
- psychology diagnosis
- perfect compatibility engine

This is:
- structured compatibility system
- communication-aware matching layer
- clarity-first interaction model
