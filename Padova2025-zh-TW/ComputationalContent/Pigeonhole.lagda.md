```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ComputationalContent.Pigeonhole where
```

# 案例研究：鴿籠原理

```
open import Padova2025-zh-TW.ProgrammingBasics.Booleans
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.General
open import Padova2025-zh-TW.ProvingBasics.Connectives.Disjunction
open import Padova2025-zh-TW.ProvingBasics.Connectives.Existential
open import Padova2025-zh-TW.ProvingBasics.Connectives.Conjunction
open import Padova2025-zh-TW.ProvingBasics.Termination.Ordering
import Padova2025-zh-TW.ComputationalContent.DoubleNegation
import Padova2025-zh-TW.ComputationalContent.Fictions.InfinitelyMany
```

這個案例研究的目的，是從（建構性上荒謬的）無窮鴿籠原理推出（建構性上可用的）有限鴿籠原理，並將這個證明與直接證明比較。

```
FinitaryPigeonholePrinciple : (ℕ → Bool) → Set
FinitaryPigeonholePrinciple α = ∃[ i ] ∃[ j ] i < j × α i ≡ α j
```

```
direct : (α : ℕ → Bool) → FinitaryPigeonholePrinciple α
direct α with α zero in eq₀ | α one in eq₁ | α two in eq₂
... | false | false | _     = {--}zero , one , s≤s z≤n       , trans eq₀ (sym eq₁){--}
... | false | true  | false = {--}zero , two , s≤s z≤n       , trans eq₀ (sym eq₂){--}
... | false | true  | true  = {--}one  , two , s≤s (s≤s z≤n) , trans eq₁ (sym eq₂){--}
... | true  | false | false = {--}one  , two , s≤s (s≤s z≤n) , trans eq₁ (sym eq₂){--}
... | true  | false | true  = {--}zero , two , s≤s z≤n       , trans eq₀ (sym eq₂){--}
... | true  | true  | _     = {--}zero , one , s≤s z≤n       , trans eq₀ (sym eq₁){--}
```

```
theorem : (α : ℕ → Bool) → FinitaryPigeonholePrinciple α
theorem α = escape (infinitary-pigeonhole-principle α ⟫= λ { (left p) → go p; (right p) → go p })
  where
  open Padova2025-zh-TW.ComputationalContent.DoubleNegation          (FinitaryPigeonholePrinciple α)
  open Padova2025-zh-TW.ComputationalContent.Fictions.InfinitelyMany (FinitaryPigeonholePrinciple α)

  go : {x : Bool} → Infinitely α (x ≡_) → ¬ ¬ FinitaryPigeonholePrinciple α
  go p = 
    {--}p zero     ⟫= λ (i , 0≤i , i-good) →
    p (succ i) ⟫= λ (j , i<j , j-good) →
    return (i , j , i<j , trans (sym i-good) j-good){--}
```

執行 `C-c C-v theorem ?` 來檢視展開後的證明 term。它引用了 `? three`，因此絕對*不*等同於直截了當的直接證明——
直接證明只會檢查 `? zero`、`? one` 與 `? two`，並在這三個值之中尋找兩個相等的值。

因此，以無窮鴿籠原理作為輔助工具的有限鴿籠原理之古典證明，確實包含一個不平凡的演算法。
