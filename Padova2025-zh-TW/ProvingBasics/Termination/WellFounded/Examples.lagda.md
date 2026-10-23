```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProvingBasics.Termination.WellFounded.Examples where
```

# 範例

```
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.General
open import Padova2025-zh-TW.ProvingBasics.Termination.WellFounded.Base
import Padova2025-zh-TW.ProvingBasics.Termination.WellFounded.Scheme as Scheme
```

## 位數，再訪

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
open import Padova2025-zh-TW.ProvingBasics.Termination.Ordering
```

依照所勾勒的大綱，使用[一般遞迴方案](Padova2025-zh-TW.ProvingBasics.Termination.WellFounded.Scheme.html)重新實作
[`digits₄` 函數](Padova2025-zh-TW.ProvingBasics.Termination.WellFounded.Base.html#digits₄)。

```
digits-step : (x : ℕ) → ((y : ℕ) → y <' x → ℕ) → ℕ
digits-step zero       f = {--}zero{--}
digits-step x@(succ _) f = {--}succ (f (half x) (<⇒<' (half-< _))){--}
```

```
digits-step-extensional
  : (x : ℕ) (u v : (y : ℕ) → y <' x → ℕ)
  → ((y : ℕ) (p : y <' x) → u y p ≡ v y p)
  → digits-step x u ≡ digits-step x v
-- Holify
digits-step-extensional zero       u v p = refl
digits-step-extensional x@(succ _) u v p = cong succ (p (half x) (<⇒<' (half-< _)))
```

```
module D = Scheme {ℕ} _<'_ {λ _ → ℕ} digits-step digits-step-extensional ℕ-wf
```

```
digits₄' : ℕ → ℕ
digits₄' = D.rec
```

```
digits₄'-eq : (x : ℕ) → digits₄' (succ x) ≡ succ (digits₄' (half (succ x)))
digits₄'-eq x = D.rec-eq (succ x)
```


## 取餘數，再訪

```
open import Padova2025-zh-TW.ProvingBasics.EvenOdd
open import Padova2025-zh-TW.ProvingBasics.Negation
open import Padova2025-zh-TW.ProvingBasics.Connectives.Disjunction
open import Padova2025-zh-TW.ProvingBasics.Termination.Ordering
open import Padova2025-zh-TW.ProvingBasics.Equality.Reasoning.Core
```

依照所勾勒的大綱，使用[一般遞迴方案](Padova2025-zh-TW.ProvingBasics.Termination.WellFounded.Scheme.html)重新實作
[`_%_` 函數](Padova2025-zh-TW.ProvingBasics.Termination.Gas.html#_%_)。

```
%-step : (b : ℕ) → IsPositive b → (x : ℕ) → ((y : ℕ) → y <' x → ℕ) → ℕ
-- Holify
%-step b b>0 x f with ≤-<-connex b x
... | left  b≤x = f (x ∸ b) (<⇒<' (monus-< x b b>0 b≤x))
... | right x<b = x
```

```
%-step-extensional
  : (b : ℕ) → (b>0 : IsPositive b)
  → (x : ℕ) (u v : (y : ℕ) → y <' x → ℕ)
  → ((y : ℕ) (p : y <' x) → u y p ≡ v y p)
  → %-step b b>0 x u ≡ %-step b b>0 x v
%-step-extensional b b>0 x u v p with ≤-<-connex b x
... | left  b≤x = p (x ∸ b) (<⇒<' (monus-< x b b>0 b≤x))
... | right x<b = refl
```

```
module M (b : ℕ) (b>0 : IsPositive b) = Scheme {ℕ} _<'_ {λ _ → ℕ} (%-step b b>0) (%-step-extensional b b>0) ℕ-wf
```

```
_%'_ : ℕ → ℕ → ℕ
a %' zero   = a
a %' succ b = M.rec (succ b) (case-succ b) a
```


### 取餘數函數的性質

這一節仍在進行中。把 `b : ℕ` 與 `b>0 : IsPositive b` 當成匿名模組的參數會比較乾淨，因為它們在整節中都是固定的，
但目前支撐 Let's play Agda 的腳本還無法處理這一點。

```
%-step-eq₁
  : (a b : ℕ) (b>0 : IsPositive b) (a≥b : a ≥ b)
  → %-step b b>0 a (λ y y<a → M.rec b b>0 y) ≡ M.rec b b>0 (a ∸ b)
%-step-eq₁ a b b>0 a≥b with ≤-<-connex b a
... | left  b≤a = {--}refl{--}
... | right a<b = {--}⊥-elim (<-irreflexive' a≥b a<b){--}
```

```
%-step-eq₂
  : (a b : ℕ) (b>0 : IsPositive b) (a<b : a < b)
  → %-step b b>0 a (λ y y<a → M.rec b b>0 y) ≡ a
-- Holify
%-step-eq₂ a b b>0 a<b with ≤-<-connex b a
... | left  b≤a = ⊥-elim (<-irreflexive' b≤a a<b)
... | right a<b = refl
```

```
%'-< : (a b : ℕ) → (b>0 : IsPositive b) → a %' b < b
-- Holify
%'-< a b@(succ _) b>0@(case-succ _) = go a (ℕ-wf a)
  where
  go : (a : ℕ) → Acc _<'_ a → M.rec b b>0 a < b
  go a (acc h) with ≤-<-connex b a
  ... | right a<b = subst (_< b) (sym eq) a<b
    where
    eq : M.rec b b>0 a ≡ a
    eq = begin
      M.rec b b>0 a                            ≡⟨ M.rec-eq b b>0 a ⟩
      %-step b b>0 a (λ y y<a → M.rec b b>0 y) ≡⟨ %-step-eq₂ a b b>0 a<b ⟩
      a                                         ∎
  ... | left  a≥b = subst (_< b) (sym eq) (go (a ∸ b) (h (<⇒<' (monus-< a b b>0 a≥b))))
    where
    eq : M.rec b b>0 a ≡ M.rec b b>0 (a ∸ b)
    eq = begin
      M.rec b b>0 a                            ≡⟨ M.rec-eq b b>0 a ⟩
      %-step b b>0 a (λ y y<a → M.rec b b>0 y) ≡⟨ %-step-eq₁ a b b>0 a≥b ⟩
      M.rec b b>0 (a ∸ b)                      ∎
```
