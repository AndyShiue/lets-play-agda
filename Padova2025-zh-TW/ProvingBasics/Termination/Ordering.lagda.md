```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProvingBasics.Termination.Ordering where
```

# 自然數上的標準序

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
open import Padova2025-zh-TW.ProgrammingBasics.Lists
open import Padova2025-zh-TW.ProvingBasics.Negation
open import Padova2025-zh-TW.ProvingBasics.Connectives.Disjunction
open import Padova2025-zh-TW.ProvingBasics.Connectives.More
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.General
open import Padova2025-zh-TW.ProvingBasics.Equality.NaturalNumbers
```

在這個模組中，我們引進自然數上的標準序 `_≤_`，以及它的變體 `_<_`、`_≥_` 與 `_>_`，並驗證它們的基本性質。

```
infix 4 _≤_ _<_ _≥_ _>_
data _≤_ : ℕ → ℕ → Set where
  z≤n : {n : ℕ}   → zero ≤ n
  s≤s : {n m : ℕ} → (n≤m : n ≤ m) → succ n ≤ succ m

_<_ : ℕ → ℕ → Set
n < m = succ n ≤ m

_>_ : ℕ → ℕ → Set
n > m = m < n

_≥_ : ℕ → ℕ → Set
n ≥ m = m ≤ n
```


## 習題：自反性、遞移性與反對稱性

```
≤-refl : {a : ℕ} → a ≤ a
-- Holify
≤-refl {zero}   = z≤n
≤-refl {succ a} = s≤s ≤-refl
```

```
≤-trans : {a b c : ℕ} → a ≤ b → b ≤ c → a ≤ c
-- Holify
≤-trans z≤n     q       = z≤n
≤-trans (s≤s p) (s≤s q) = s≤s (≤-trans p q)
```

```
≤-antisymm : {a b : ℕ} → a ≤ b → b ≤ a → a ≡ b
-- Holify
≤-antisymm z≤n     z≤n     = refl
≤-antisymm (s≤s p) (s≤s q) = cong succ (≤-antisymm p q)
```

```
<-irreflexive : {a : ℕ} → a < a → ⊥
-- Holify
<-irreflexive (s≤s p) = <-irreflexive p
```

```
<-irreflexive' : {a b : ℕ} → a ≤ b → b < a → ⊥
-- Holify
<-irreflexive' (s≤s p) (s≤s q) = <-irreflexive' p q
```

```
<-irreflexive'' : {a b : ℕ} → a < b → b < a → ⊥
-- Holify
<-irreflexive'' (s≤s p) (s≤s q) = <-irreflexive'' p q
```

```
≡⇒≤ : {a b : ℕ} → a ≡ b → a ≤ b
-- Holify
≡⇒≤ refl = ≤-refl
```


## 習題：決策程序

```
≤-<-connex : (a b : ℕ) → a ≤ b ⊎ b < a
-- Holify
≤-<-connex zero     b        = left z≤n
≤-<-connex (succ a) zero     = right (s≤s z≤n)
≤-<-connex (succ a) (succ b) with ≤-<-connex a b
... | left  a≤b = left  (s≤s a≤b)
... | right b<a = right (s≤s b<a)
```

::: Hint :::
也許令人驚訝的是，這個習題與下一個習題都可以靠自動駕駛解決。適當地使用 `C-c C-c`、`C-c C-a` 與 `with` 關鍵字，
對適當的遞迴呼叫的結果做 pattern matching。
:::

```
<-cmp : (a b : ℕ) → a ≡ b ⊎ (a < b ⊎ a > b)
-- Holify
<-cmp zero     zero     = left refl
<-cmp zero     (succ b) = right (left (s≤s z≤n))
<-cmp (succ a) zero     = right (right (s≤s z≤n))
<-cmp (succ a) (succ b) with <-cmp a b
... | left  a≡b         = left (cong succ a≡b)
... | right (left a<b)  = right (left (s≤s a<b))
... | right (right a>b) = right (right (s≤s a>b))
```

```
dec-≤ : (a b : ℕ) → Dec (a ≤ b)
-- Holify
dec-≤ zero     b = yes z≤n
dec-≤ (succ a) zero = no λ ()
dec-≤ (succ a) (succ b) with dec-≤ a b
... | yes a≤b  = yes (s≤s a≤b)
... | no  ¬a≤b = no λ { (s≤s a≤b) → ¬a≤b a≤b }
```

```
dec-< : (a b : ℕ) → Dec (a < b)
-- Holify
dec-< a b = dec-≤ (succ a) b
```


## 習題：幾個函數的序性質

```
succ-monotone : {a b : ℕ} → a ≤ b → succ a ≤ succ b
succ-monotone = s≤s
```

```
pred-monotone : {a b : ℕ} → a ≤ b → pred a ≤ pred b
-- Holify
pred-monotone z≤n     = z≤n
pred-monotone (s≤s p) = p
```

```
succ-inflationary : (a : ℕ) → a ≤ succ a
-- Holify
succ-inflationary zero     = z≤n
succ-inflationary (succ a) = s≤s (succ-inflationary a)
```

```
twice-inflationary : (a : ℕ) → a ≤ twice a
-- Holify
twice-inflationary zero     = z≤n
twice-inflationary (succ a) = ≤-trans (succ-inflationary (succ a)) (succ-monotone (succ-monotone (twice-inflationary a)))
```

```
max-inflationaryₗ : (a b : ℕ) → a ≤ max a b
-- Holify
max-inflationaryₗ zero     b        = z≤n
max-inflationaryₗ (succ a) zero     = ≤-refl
max-inflationaryₗ (succ a) (succ b) = s≤s (max-inflationaryₗ a b)
```

```
max-inflationaryᵣ : (a b : ℕ) → b ≤ max a b
-- Holify
max-inflationaryᵣ zero     b        = ≤-refl
max-inflationaryᵣ (succ a) zero     = z≤n
max-inflationaryᵣ (succ a) (succ b) = s≤s (max-inflationaryᵣ a b)
```

```
+-monotone : {a a' b b' : ℕ} → a ≤ b → a' ≤ b' → a + a' ≤ b + b'
-- Holify
+-monotone z≤n     z≤n     = z≤n
+-monotone z≤n     (s≤s q) = ≤-trans (succ-monotone (+-monotone z≤n q)) (≡⇒≤ (sym (+-succ _ _)))
+-monotone (s≤s p) q       = succ-monotone (+-monotone p q)
```

```
+-inflationaryₗ : (a b : ℕ) → a ≤ a + b
-- Holify
+-inflationaryₗ zero     b = z≤n
+-inflationaryₗ (succ a) b = s≤s (+-inflationaryₗ a b)
```

```
+-inflationaryᵣ : (a b : ℕ) → b ≤ a + b
-- Holify
+-inflationaryᵣ a b = +-monotone {zero} {b} {a} {b} z≤n ≤-refl
```


## 習題：串列的最大值

```
maximum : List ℕ → ℕ
maximum []       = zero
maximum (x ∷ xs) = max x (maximum xs)

maximum-≥ : (k : ℕ) (xs : List ℕ) → k ∈ xs → k ≤ maximum xs
maximum-≥ k (x ∷ xs) (here  refl) = max-inflationaryₗ x (maximum xs)
maximum-≥ k (x ∷ xs) (there p)    = ≤-trans (maximum-≥ k xs p) (max-inflationaryᵣ x (maximum xs))
```


## 習題：減半

```
half-≤ : (x : ℕ) → half x ≤ x
-- Holify
half-≤ zero            = z≤n
half-≤ (succ zero)     = z≤n
half-≤ (succ (succ x)) = succ-monotone (≤-trans (half-≤ x) (succ-inflationary x))
```

```
half-< : (x : ℕ) → half (succ x) < succ x
-- Holify
half-< zero     = s≤s z≤n
half-< (succ x) = succ-monotone (succ-monotone (half-≤ x))
```


## 習題：減法會變小

```
open import Padova2025-zh-TW.ProvingBasics.EvenOdd
```

```
monus-≤ : (a b : ℕ) → a ≥ b → a ∸ b ≤ a
-- Holify
monus-≤ a        zero     z≤n       = ≤-refl
monus-≤ (succ a) (succ b) (s≤s a≥b) = ≤-trans (monus-≤ a b a≥b) (succ-inflationary a)
```

```
monus-< : (a b : ℕ) → IsPositive b → a ≥ b → a ∸ b < a
-- Holify
monus-< (succ a) (succ zero)     b≥0  (s≤s a≥b) = ≤-refl
monus-< (succ a) (succ (succ b)) b≥-1 (s≤s a>b) =
  ≤-trans (monus-< a (succ b) (case-succ b) a>b) (succ-inflationary a)
```


## 偶數有無限多個

```
open import Padova2025-zh-TW.ProvingBasics.Connectives.Existential
open import Padova2025-zh-TW.ProvingBasics.Connectives.Conjunction
open import Padova2025-zh-TW.ProvingBasics.EvenOdd
open import Padova2025-zh-TW.ProvingBasics.Equality.NaturalNumbers
```

要表達偶數有無限多個，一個特別正面的方式是：在每個自然數之後，都還有一個偶數。讓我們在 Agda 中陳述並證明這個事實。

```
Even-infinite : (x : ℕ) → ∃[ y ] (y ≥ x × Even y)
-- Holify
Even-infinite x = twice x , twice-inflationary x , twice-even x
-- 或者，更經濟地，改以 `x` 或 `succ x` 作為見證，
-- 而不是 `twice x`：
-- Even-infinite x with even-or-odd x
-- ... | left  xeven = x      , ≤-refl              , xeven
-- ... | right xodd  = succ x , succ-inflationary x , succ-odd xodd
```


## 自然數有無限多個

```
open import Padova2025-zh-TW.ProvingBasics.Connectives.Existential
```

要表達自然數有無限多個，有幾種方式，其中一種是：對每個有限的自然數串列，都有一個不在該串列中的自然數。
我們可以這樣形式化並證明這個斷言。

```
ℕ-infinite : (xs : List ℕ) → ∃[ x ] x ∉ xs
ℕ-infinite xs = succ (sum xs) , λ p → <-irreflexive (go p)
  where
  go : {xs : List ℕ} {y : ℕ} → y ∈ xs → y < succ (sum xs)
  go (here  refl) = {--}succ-monotone (≤-trans (≡⇒≤ (sym (+-zero _))) (+-monotone ≤-refl z≤n)){--}
  go (there p)    = {--}≤-trans (go p) (succ-monotone (+-monotone z≤n ≤-refl)){--}
```


## 習題：嚴格序關係的另一種定義

有時候，嚴格小於關係的下列另一種定義會很有用。

```
data _<'_ : ℕ → ℕ → Set where
  base' : {n : ℕ}     → n <' succ n
  step' : {a b : ℕ}   → a <' b → a <' succ b
```

```
z<'s : {x : ℕ} → zero <' succ x
-- Holify
z<'s {zero}   = base'
z<'s {succ x} = step' z<'s
```

```
s<'s : {x y : ℕ} → x <' y → succ x <' succ y
-- Holify
s<'s base'     = base'
s<'s (step' p) = step' (s<'s p)
```

```
<⇒<' : {x y : ℕ} → x < y → x <' y
-- Holify
<⇒<' (s≤s p) = lemma p
  where
  lemma : {x y : ℕ} → x ≤ y → x <' succ y
  lemma z≤n     = z<'s
  lemma (s≤s p) = s<'s (lemma p)
```

```
<'⇒< : {x y : ℕ} → x <' y → x < y
-- Holify
<'⇒< base'     = ≤-refl
<'⇒< (step' p) = ≤-trans (<'⇒< p) (succ-inflationary _)
```


## 習題：索引

```
lookup : {P : ℕ → Set} {n m : ℕ} → All P (downFrom n) → m < n → P m
-- Holify
lookup {P} {succ n} {m} (p ∷ ps) m<n with ≤-<-connex n m
... | left  n≤m = subst P (≤-antisymm n≤m (pred-monotone m<n)) p
... | right m<n = lookup ps m<n
```
