```
{-# OPTIONS --cubical-compatible #-}
open import Padova2025-zh-TW.ProgrammingBasics.Lists
open import Padova2025-zh-TW.ProvingBasics.Connectives.Disjunction

module Padova2025-zh-TW.VerifiedAlgorithms.InsertionSort.Implementation
  (A : Set) (_≤_ : A → A → Set) (cmp? : (x y : A) → x ≤ y ⊎ y ≤ x) where
```

# 實作

::: Todo :::
待補：說明
:::

契約（Contract）：若「ys」是遞增有序的，則「insert x ys」也是遞增有序的。

```
insert : A → List A → List A
-- Holify
insert x []       = x ∷ []
insert x (y ∷ ys) with cmp? x y
... | left  x≤y = x ∷ (y ∷ ys)
... | right y≤x = y ∷ insert x ys
```

```
sort : List A → List A
-- Holify
sort []       = []
sort (x ∷ xs) = insert x (sort xs)
```
