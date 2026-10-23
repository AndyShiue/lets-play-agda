```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProvingBasics.Termination.WellFounded.Base where
```

# 良基關係

```
module _ {X : Set} (_<_ : X → X → Set) where
  data Acc : X → Set where
    acc : {x : X} → ({y : X} → y < x → Acc y) → Acc x

  acc-inverse : {x : X} → Acc x → {y : X} → y < x → Acc y
  acc-inverse (acc f) = f
```

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
open import Padova2025-zh-TW.ProvingBasics.Termination.Ordering
  hiding (_<_) renaming (_<'_ to _<_; base' to base; step' to step)
```


## 自然數是良基的

```
lemma-zero-is-accessible : Acc _<_ zero
lemma-zero-is-accessible = acc λ ()
```

```
lemma-one-is-accessible : Acc _<_ one
lemma-one-is-accessible = acc λ
  { base → lemma-zero-is-accessible
  }
```

```
lemma-two-is-accessible : Acc _<_ two
lemma-two-is-accessible = acc λ
  { base        → lemma-one-is-accessible
  ; (step base) → lemma-zero-is-accessible 
  }
```

```
lemma-three-is-accessible : Acc _<_ three
lemma-three-is-accessible = acc λ
  { base               → lemma-two-is-accessible
  ; (step base)        → lemma-one-is-accessible 
  ; (step (step base)) → lemma-zero-is-accessible 
  }
```

```
ℕ-wf : (n : ℕ) → Acc _<_ n
-- Holify
ℕ-wf zero = lemma-zero-is-accessible
ℕ-wf (succ n) = acc λ
  { base     → ℕ-wf n
  ; (step p) → acc-inverse _<_ (ℕ-wf n) p
  }
```


## 習題：良基關係是非自反的

```
open import Padova2025-zh-TW.ProvingBasics.Negation
```

```
wf⇒irr : {X : Set} → (R : X → X → Set) → (a : X) → Acc R a → ¬ (R a a)
-- Holify
wf⇒irr R a (acc f) p = wf⇒irr R a (f p) p
```


## 習題：沒有無窮遞降序列

```
no-descending-sequences : {X : Set} {_<_ : X → X → Set} → (α : ℕ → X) → ((n : ℕ) → α (succ n) < α n) → Acc _<_ (α zero) → ⊥
-- Holify
no-descending-sequences {X} {_<_} α desc (acc f) = no-descending-sequences α' desc' (f (desc zero))
  where
  α' : ℕ → X
  α' n = α (succ n)
  desc' : (n : ℕ) → α' (succ n) < α' n
  desc' n = desc (succ n)
```

::: Todo :::
待補：加入關於逆命題的說明。
:::


## 習題：良基關係的原像

給定函數 `f : X → Y`，`Y` 上的二元關係 `_<Y_` 會在 `X` 上誘導出關係 `_<X_`，只要宣告 `a <X b` 的意思是 `f x <Y f b`。
如果 `_<Y_` 是良基的，那麼 `_<X_` 也是。下面的習題給出這個觀察的更精確的局部版本。

```
preimage-wf : {X Y : Set} (f : X → Y) {_<Y_ : Y → Y → Set} (let _<X_ a b = f a <Y f b) → {x : X} → Acc _<Y_ (f x) → Acc _<X_ x
-- Holify
preimage-wf f (acc g) = acc (λ p → preimage-wf f (g p))
```

這個習題的陳述會受益於 Agda 的子模組語法，但目前維繫 Let's play Agda 的 Perl 腳本並不支援它。它看起來會像這樣：

```code
module _ {X Y : Set} {f : X → Y} {_<Y_ : Y → Y → Set} where
  _<X_ : X → X → Set
  a <X b = f a <Y f b

  preimage-wf : {x : X} → Acc _<Y_ (f x) → Acc _<X_ x
  preimage-wf = ?
```


## 習題：二進位位數

```
digits₄ : ℕ → ℕ
digits₄ x = go x (ℕ-wf x)
  where
  go : (x : ℕ) → (gas : Acc _<_ x) → ℕ
  go zero       p       = {--}zero{--}
  go x@(succ _) (acc f) = {--}succ (go (half x) (f (<⇒<' (half-< _)))){--}
```

與使用自然數作為燃料的 [`digits₃`](Padova2025-zh-TW.ProvingBasics.Termination.Gas.html#digits₃) 不同，這裡不需要 bailout 的情況。
這個遞迴一定會抵達它的基底情形——而且不需要為這個事實另外給出證明。

對正的 `x` 驗證基本恆等式 `digits₄ x ≡ succ (digits₄ (half x))`，最好在
[下一個模組](Padova2025-zh-TW.ProvingBasics.Termination.WellFounded.Scheme.html)提供的更一般的情境下進行。
