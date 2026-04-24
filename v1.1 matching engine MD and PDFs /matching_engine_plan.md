
# Clarity Matching Engine Plan

## Core Principle
Match on interaction compatibility, not just attraction.

## Final Score Formula
FinalScore = BaseCompatibility - FrictionPenalty + IntentBoost + MutualPreferenceBoost + ConfidenceAdjustment

## Core Dimensions
- Intent Alignment (25%)
- Communication Compatibility (25%)
- Social Rhythm (15%)
- Reliability (15%)
- Interests (10%)
- Values (10%)

## Friction Model
Predict mismatches:
- Communication pace
- Planning style
- Emotional processing
- Reliability expectations

## Profile Schema
- Identity & Preferences
- Neurotype (optional)
- Communication Style Vector
- Social Energy
- Reliability Pattern
- Interest Graph
- Values

## NLP Integration
1. Profile Parsing → extract traits
2. Message Analysis → detect reciprocity, tone, depth
3. Pair Refinement → update compatibility over time

## Key Features
- Guided profiles
- Structured chat prompts
- Expectation alignment
- Low-signal detection
- Match explanations

## Database Tables
- users
- user_traits
- user_interests
- match_scores
- conversation_signals

## API (example)
POST /match/compute
GET /match/{id}
POST /conversation/analyze

## Positioning
“We match how people interact, not just who they are.”
