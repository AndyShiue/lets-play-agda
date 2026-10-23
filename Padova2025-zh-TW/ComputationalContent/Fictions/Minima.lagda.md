```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ComputationalContent.Fictions.Minima (⊥ : Set) where
```

# 最小值

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProvingBasics.Termination.Ordering
open import Padova2025-zh-TW.ProvingBasics.Termination.WellFounded.Base
open import Padova2025-zh-TW.ProvingBasics.Connectives.Disjunction
open import Padova2025-zh-TW.ProvingBasics.Connectives.Existential
open import Padova2025-zh-TW.ProvingBasics.Connectives.Conjunction
open import Padova2025-zh-TW.ComputationalContent.DoubleNegation (⊥)
```


## 函數在雙重否定意義下的最小值

```
go : (α : ℕ → ℕ) → (i : ℕ) → Acc _<'_ (α i) → ¬ ¬ (Σ[ i ∈ ℕ ] ((j : ℕ) → ¬ ¬ α i ≤ α j))
go α i (acc f) = oracle {Σ[ j ∈ ℕ ] α j < α i} ⟫= λ
  { (left  (j , p)) → {--}go α j (f (<⇒<' p)){--}
  ; (right q)       → {--}return (i , h q){--}
  }
  where
  h : ¬ (Σ[ j ∈ ℕ ] α j < α i) → (j : ℕ) → ¬ ¬ (α i ≤ α j)
  h q j with ≤-<-connex (α i) (α j)
  ... | left  αi≤αj = {--}return αi≤αj{--}
  ... | right αj<αi = {--}⊥-elim (q (j , αj<αi)){--}
```

```
minimum : (α : ℕ → ℕ) → ¬ ¬ (Σ[ i ∈ ℕ ] ((j : ℕ) → ¬ ¬ α i ≤ α j))
-- Holify
minimum α = go α zero (ℕ-wf (α zero))
```


## 有居民的自然數集合的變體

```
go' : (P : ℕ → Set) (n : ℕ) → P n → Acc _<'_ n → ¬ ¬ (∃[ a ] P a × ((b : ℕ) → b < a → P b → ⊥))
-- Holify
go' P n Pn (acc f) k = k (n , Pn , λ b b<n Pb → go' P b Pb (f (<⇒<' b<n)) k)
```

```
minimum' : (P : ℕ → Set) → (∃[ n ] P n) → ¬ ¬ (∃[ a ] P a × ((b : ℕ) → b < a → P b → ⊥))
-- Holify
minimum' P (n , Pn) = go' P n Pn (ℕ-wf n)
```


<!--
## Variant for decidable inhabited sets of natural numbers
open import Padova2025-zh-TW.ProvingBasics.Connectives.More
go'' : (P : ℕ → Set) (P? : (n : ℕ) → Dec (P n)) → (n : ℕ) → P n → ∃[ a ] P a × ((b : ℕ) → P b → a ≤ b)
go'' P P? zero     Pn = zero , Pn , λ b Pb → z≤n
go'' P P? (succ n) Pn with P? zero
... | yes  Pzero = zero , Pzero , λ b Pb → z≤n
... | no  ¬Pzero with go'' (λ x → P (succ x)) (λ x → P? (succ x)) n Pn
... | a , Psucca , f = succ a , Psucca , λ { zero Pb → {!!} ; (succ b) Pb → {!!} }
-->

<!--
go'' : (P : ℕ → Set) (n : ℕ) → P n → ¬ ¬ (∃[ a ] P a × ((b : ℕ) → P b → a ≤ b))
go'' P zero     Pn     = return (zero , Pn , (λ b z → z≤n))
go'' P (succ n) Psuccn = oracle ⟫= h
  where
  h : P zero ⊎ ¬ P zero → ¬ ¬ (∃[ a ] P a × ((b : ℕ) → P b → a ≤ b))
  h (left  Pzero)  = return (zero , Pzero , (λ b z₁ → z≤n))
  h (right ¬Pzero) = do
    (a~ , P~a~ , f~) ← go'' P~ n Psuccn
    return (succ a~ , P~a~ , λ { zero Pb → {!!} ; (succ b) Pb → succ-monotone (f~ b Pb) })
    where
    P~ : ℕ → Set
    P~ x = P (succ x)
-->


## 最大的自然數？

請仔細思考下面這段程式碼，它宣稱在雙重否定的意義下證明了存在最大的自然數。它是如何嘗試運作的？Agda 為什麼會拒絕它？

```code
largest-number : ¬ ¬ (Σ[ a ∈ ℕ ] ((b : ℕ) → ¬ ¬ a ≥ b))
largest-number = f zero
  where
  f : ℕ → ¬ ¬ (Σ[ a ∈ ℕ ] ((b : ℕ) → ¬ ¬ a ≥ b))
  f a k = k (a , h)
    where
    h : (b : ℕ) → ¬ ¬ a ≥ b
    h b with ≤-<-connex b a
    ... | left  b≤a = return m≤n
    ... | right a<b = λ k' → f b k
```

```
lemma : {x : ℕ} → succ x ≤ x → ⊥
-- Holify
lemma (s≤s p) = lemma p
```

```
no-largest-number : ¬ (¬ ¬ (∃[ a ] ((b : ℕ) → ¬ ¬ b ≤ a)))
-- Holify
no-largest-number m = escape do
  (a , f) ← m
  absurd  ← f (succ a)
  return (lemma absurd)
```
