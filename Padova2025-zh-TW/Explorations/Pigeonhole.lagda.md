```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.Explorations.Pigeonhole where
```

# 有限鴿籠原理

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Lists
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.General
open import Padova2025-zh-TW.ProvingBasics.Equality.NaturalNumbers
open import Padova2025-zh-TW.ProvingBasics.Connectives.More
open import Padova2025-zh-TW.ProvingBasics.Termination.Ordering hiding (lookup)
```

本模組的主要目標，是陳述有限鴿籠原理並給出它的直接證明，採用下面這個強形式：每個長度為 `succ n` 的向量，
若其元素取自一個有 `n` 個元素的型別，則必含重複。過程中，我們也會形式化一些在無限盒子問題那一節中有用的結果（TODO：連結）。

TODO：連結到其他形式化

對每個自然數 `n`，下面的定義設立大小為 `n` 的典型有限型別 `Fin n`。它的居民可以想像成嚴格小於 `n` 的自然數。

```
data Fin : ℕ → Set where
  fzero : {n : ℕ} → Fin (succ n)
  fsucc : {n : ℕ} → Fin n → Fin (succ n)
```

```
fsucc-inj : {n : ℕ} → {x y : Fin n} → fsucc x ≡ fsucc y → x ≡ y
fsucc-inj {x = x} {y = y} refl = refl
```

```
toℕ : {n : ℕ} → Fin n → ℕ
toℕ fzero     = zero
toℕ (fsucc x) = succ (toℕ x)
```

```
toℕ-injective : {n : ℕ} {x y : Fin n} → toℕ x ≡ toℕ y → x ≡ y
toℕ-injective {x = fzero}   {y = fzero}   _ = refl
toℕ-injective {x = fsucc x} {y = fsucc y} p = cong fsucc (toℕ-injective (succ-injective p))
```

```
toℕ-bounded : {n : ℕ} (x : Fin n) → toℕ x < n
toℕ-bounded fzero     = s≤s z≤n
toℕ-bounded (fsucc x) = s≤s (toℕ-bounded x)
```

```
_≡?_ : {n : ℕ} → (x y : Fin n) → Dec (x ≡ y)
fzero ≡? fzero = yes refl
fzero ≡? fsucc y = no λ ()
fsucc x ≡? fzero = no λ ()
fsucc x ≡? fsucc y with x ≡? y
... | yes p = yes (cong fsucc p)
... | no  q = no λ p → q (fsucc-inj p)
```

我們可以把函數 `Fin n → A` 的像收集成一個串列：

```
tabulate-Fin : {A : Set} {n : ℕ} → (Fin n → A) → List A
-- Holify
tabulate-Fin {n = zero}   f = []
tabulate-Fin {n = succ n} f = f fzero ∷ tabulate-Fin (λ x → f (fsucc x))
```

```
∈-tabulate-Fin : {A : Set} {n : ℕ} (f : Fin n → A) (x : Fin n) → f x ∈ tabulate-Fin f
-- Holify
∈-tabulate-Fin f fzero     = here refl
∈-tabulate-Fin f (fsucc x) = there (∈-tabulate-Fin (λ y → f (fsucc y)) x)
```

而且我們可以用 `Fin n` 的元素，去索引長度為 `n` 的串列中的元素：

```
lookup : {A : Set} → (xs : List A) → Fin (length xs) → A
-- Holify
lookup (x ∷ xs) fzero     = x
lookup (x ∷ xs) (fsucc i) = lookup xs i
```

TODO：完成，並納入 Jacopo Piccione 的工作
