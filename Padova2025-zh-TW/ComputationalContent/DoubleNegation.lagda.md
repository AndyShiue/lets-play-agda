```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ComputationalContent.DoubleNegation (⊥ : Set) where
```

# 古典邏輯的諷刺詮釋

::: Todo :::
待補：說明。
:::

```
open import Padova2025-zh-TW.ProvingBasics.Connectives.Disjunction
open import Padova2025-zh-TW.ProvingBasics.Connectives.More
open import Padova2025-zh-TW.ProgrammingBasics.Lists
```

```
infix 3 ¬_
¬_ : Set → Set  -- 輸入 `¬` 請打 `\neg`
¬ P = (P → ⊥)
```

```
return : {A : Set} → A → ¬ ¬ A
-- Holify
return x = λ k → k x
```

```
⊥-elim : {A : Set} → ⊥ → ¬ ¬ A
-- Holify
⊥-elim x = λ k → x
```

```
escape : ¬ ¬ ⊥ → ⊥
-- Holify
escape f = f (λ x → x)
```

```
oracle : {A : Set} → ¬ ¬ (A ⊎ ¬ A)
-- Holify
oracle f = f (right (λ x → f (left x)))
```

```
infixl 1 _>>=_ _⟫=_
```

```
_>>=_ : {A B : Set} → ¬ ¬ A → (A → ¬ ¬ B) → ¬ ¬ B
-- Holify
_>>=_ m f = λ k → m (λ x → f x k)
```

```
_⟫=_ : {A B : Set} → ¬ ¬ A → (A → ¬ ¬ B) → ¬ ¬ B
_⟫=_ = _>>=_
```

```
liftA2 : {A B C : Set} → (A → B → C) → ¬ ¬ A → ¬ ¬ B → ¬ ¬ C
-- Holify
liftA2 f x y = do
  x' ← x
  y' ← y
  return (f x' y')
```

```
sequence : {X : Set} {P : X → Set} {xs : List X} → All (λ x → ¬ ¬ P x) xs → ¬ ¬ All P xs
-- Holify
sequence []       = return []
sequence (p ∷ ps) = liftA2 _∷_ p (sequence ps)
-- 或者：
-- sequence (p ∷ ps) = do
--   p'  ← p
--   ps' ← sequence ps
--   return (p' ∷ ps')
```

`sequence` 函數的無窮類比稱為*雙重否定位移（double-negation shift）*。它在建構性數學中一般並不可用。光是可數版本就
一般而言不成立，也就是說，在 Agda 中我們無法寫出型別 `DNS` 的值：

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base

DNS : Set₁
DNS = {P : ℕ → Set} → ((n : ℕ) → ¬ ¬ P n) → ¬ ¬ ((n : ℕ) → P n)
```

假設 `(n : ℕ) → ¬ ¬ P n` 表示，對每個數字 `n`，在柏拉圖的天堂的某處有一個 `P n` 的見證，但沒有揭露它，
也沒有給出任何找到它的方法。結論 `¬ ¬ ((n : ℕ) → P n)` 則表示，在柏拉圖的天堂的某處，有一個函數把自然數 `n` 映射到
`P n` 的見證。雙重否定位移原理表達的信念是：有可能把所有這些匿名的見證收集成一個函數。這在例如有效拓撲斯（effective topos）
以及大多數層拓撲斯（sheaf toposes）中都不成立。
