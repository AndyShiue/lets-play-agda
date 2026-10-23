```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ComputationalContent.Blueprints.Drinkers where
```

# 酒客（Drinkers）

```
open import Padova2025-zh-TW.ProgrammingBasics.Booleans
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProvingBasics.Negation
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.General
open import Padova2025-zh-TW.ProvingBasics.Connectives.Disjunction
open import Padova2025-zh-TW.ProvingBasics.Connectives.Existential
```

```
postulate
  oracle : (A : Set) → A ⊎ ¬ A
```

```
drinker : (f : ℕ → Bool) → Σ[ n ∈ ℕ ] (f n ≡ true → ((m : ℕ) → f m ≡ true))
-- Holify
drinker f with oracle (Σ[ m ∈ ℕ ] f m ≢ true)
... | left  (m , fm≢true) = (m    , λ fm≡true → ⊥-elim (fm≢true fm≡true))
... | right p             = (zero , λ _ → λ m → LEM⇒DNE oracle (f m ≡ true) λ fm≢true → p (m , fm≢true))
```
