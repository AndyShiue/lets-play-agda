```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ComputationalContent.Fictions.Drinkers (⊥ : Set) where
```

# 酒客（Drinkers）

```
open import Padova2025-zh-TW.ProgrammingBasics.Booleans
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Connectives.Existential
open import Padova2025-zh-TW.ComputationalContent.DoubleNegation (⊥)
```

```
drinker : (f : ℕ → Bool) → ¬ ¬ (Σ[ n ∈ ℕ ] (f n ≡ true → ((m : ℕ) → ¬ ¬ (f m ≡ true))))
-- Holify
drinker f = λ k → k (zero , (λ f0≡true m fm≢true → k (m , (λ fm≡true m' fm'≢true → fm≢true fm≡true))))
```
