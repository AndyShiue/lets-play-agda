```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProvingBasics.Termination.BoveCapretta.Digits where
```

# 位數，再訪

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
open import Padova2025-zh-TW.ProvingBasics.Termination.Ordering
open import Padova2025-zh-TW.ProvingBasics.Termination.WellFounded.Base
```

## 表示這個函數

```
data Def : ℕ → Set
f₀ : (n : ℕ) → Def n → ℕ

data Def where
  base : Def zero
  step : {x : ℕ} → Def (half (succ x)) → Def (succ x)

f₀ zero       base     = zero
f₀ x@(succ _) (step p) = succ (f₀ (half x) p)
```


## 用良基歸納驗證全函數性

```
total : (x : ℕ) → Def x
total x = go x (ℕ-wf x)
  where
  go : (x : ℕ) (gas : Acc _<'_ x) → Def x
  go zero       gas     = {--}base{--}
  go x@(succ _) (acc f) = {--}step (go (half x) (f (<⇒<' (half-< _)))){--}
```

```
digits₅ : ℕ → ℕ
digits₅ x = f₀ x (total x)
```


## 驗證定義等式

```
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.General
```

```
Def-prop : {x : ℕ} (p q : Def x) → p ≡ q
-- Holify
Def-prop base base = refl
Def-prop (step p) (step q) = cong step (Def-prop p q)
```

```
f₀-extensional : (x : ℕ) (p q : Def x) → f₀ x p ≡ f₀ x q
-- Holify
f₀-extensional x p q = cong (f₀ x) (Def-prop p q)
```

```
digits₅-eq : (x : ℕ) → digits₅ (succ x) ≡ succ (digits₅ (half (succ x)))
-- Holify
digits₅-eq x = cong succ (f₀-extensional (half (succ x)) _ _)
```
