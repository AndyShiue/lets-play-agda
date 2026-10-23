```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.Explorations.Forcing.Levy (X : Set) (x₀ : X) where
```

# Lévy 塌縮

```
open import Padova2025-zh-TW.ProgrammingBasics.Lists
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProvingBasics.Termination.Gas using (Maybe; nothing; just; lookupMaybe)
open import Padova2025-zh-TW.ProvingBasics.Connectives.Existential
open import Padova2025-zh-TW.ProvingBasics.Connectives.More
```

在談 [Cohen 強迫法](Padova2025-zh-TW.Explorations.Forcing.Cohen.html)的模組中，我們引進了泛型序列 `ℕ → X`。只要在該模組中的
[最終模態（eventually modality）](Padova2025-zh-TW.Explorations.Forcing.Cohen.html#∇)定義裡再加一個子句，
就能得到*泛型滿射*（generic surjection）`ℕ ↠ X`。這個構造即使在 `X` 不可數的情況下也行得通，而且確實，
這種情況就是我們可能想應用 Lévy 塌縮的主要場合：在強迫擴張中，型別 `X` 會變得可數。

```
L : Set
L = List X
```

```
data ∇ (P : L → Set) : L → Set where
  now    : {xs : L} → P xs → ∇ P xs
  later₀ : {xs : L} → ((x : X) → ∇ P (xs ∷ʳ x)) → ∇ P xs
  later₁ : {xs : L} → (x : X) → ((ys : L) → x ∈ xs ++ ys → ∇ P (xs ++ ys)) → ∇ P xs
```

與 [Cohen 強迫法的定義](Padova2025-zh-TW.Explorations.Forcing.Cohen.html#∇)相比，現在有兩種方式可以讓有限近似演變成更好的近似。
使用 `later₀`，有限串列 `xs` 可以在右邊增加一個元素，變得定義得更完整。使用 `later₁ x`，有限串列可以在右邊增加一個或多個元素，
變得更接近滿射，更具體地說，是讓 `x` 出現在它的項之中。

::: Todo :::
待補：擴充。
:::
