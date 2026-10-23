```
{-# OPTIONS --cubical-compatible #-}
open import Padova2025-zh-TW.ProgrammingBasics.Lists
open import Padova2025-zh-TW.ProvingBasics.Connectives.Disjunction

module Padova2025-zh-TW.VerifiedAlgorithms.InsertionSort.CorrectByConstruction
  (A : Set) (_≤_ : A → A → Set) (-∞ : A) (min! : {x : A} → -∞ ≤ x) (cmp? : (x y : A) → x ≤ y ⊎ y ≤ x) where
```

# 依構造而正確

## 有序的輸出串列

讓我們引進型別 `OList l`：所有元素都 `≥ l` 的遞增有序串列。換句話說，`OList l` 是下界為 `l` 的有序串列的型別。

```
data OList (l : A) : Set where
  nil  : OList l
  cons : (x : A) → l ≤ x → OList x → OList l
```

```
insert : {l : A} → (x : A) → l ≤ x → OList l → OList l
-- Holify
insert x l≤x nil             = cons x l≤x nil
insert x l≤x (cons y l≤y ys) with cmp? x y
... | left  x≤y = cons x l≤x (cons y x≤y ys)
... | right y≤x = cons y l≤y (insert x y≤x ys)
```

```
sort : List A → OList -∞
-- Holify
sort []       = nil
sort (x ∷ xs) = insert x min! (sort xs)
```

::: Aside :::
有序串列的另一種定義如下。

```
open import Padova2025-zh-TW.ProvingBasics.Termination.Gas using (𝟙; tt)

data OList₁ : Set
_≤head_ : A → OList₁ → Set

data OList₁ where
  nil  : OList₁
  cons : (x : A) (xs : OList₁) → x ≤head xs → OList₁

x ≤head nil         = 𝟙
x ≤head cons y ys _ = x ≤ y
```

然而，使用這個替代定義，比使用 `OList` 稍微麻煩一些。

::: Todo :::
待補：擴充。
:::

<!--
insert₁ : A → OList₁ → OList₁
insert₁ x nil = cons x nil tt
insert₁ x ys@(cons y ys' y≤head-ys) with cmp? x y
... | left  x≤y = cons x ys x≤y
... | right y≤x = cons y (insert₁ x ys') {!!}
-->
:::


## 有序且為排列的輸出串列

和事後驗證那個模組一樣，現在讓我們也以依構造而正確的方式，確保插入排序所產生的輸出串列是輸入串列的排列。

下面的型別宣告[與事後驗證那個模組中的相同](Padova2025-zh-TW.VerifiedAlgorithms.InsertionSort.PostHoc.html)。

```
data _◂_↝_ : A → List A → List A → Set where
  here  : {x : A} {xs : List A} → x ◂ xs ↝ (x ∷ xs)
  there : {x y : A} {ys xys : List A} → x ◂ ys ↝ xys → x ◂ (y ∷ ys) ↝ (y ∷ xys)
```

型別 `OPList l xs` 是這樣的有序串列的型別：它的元素以 `l` 為下界，並且是 `xs` 的排列。
  
```
data OPList (l : A) : List A → Set where
  nil  : OPList l []
  cons : {ys xys : List A} → (x : A) → OPList x ys → l ≤ x → (x ◂ ys ↝ xys) → OPList l xys
```

由於輸出現在已經被型別充分約束，Agda 的自動證明搜尋 `C-c C-a` 就能正確地填入下面兩個定義中的幾個關鍵 term。

```
insert' : {l : A} {ys : List A} → (x : A) → OPList l ys → l ≤ x → OPList l (x ∷ ys)
-- Holify
insert' x nil               l≤x = cons x nil l≤x here
insert' x (cons y ys l≤y p) l≤x with cmp? x y
... | left  x≤y = cons x (cons y ys x≤y p)  l≤x here
... | right y≤x = cons y (insert' x ys y≤x) l≤y (there p)
```

```
sort' : (xs : List A) → OPList -∞ xs
-- Holify
sort' []       = nil
sort' (x ∷ xs) = insert' x (sort' xs) min!
```

::: Todo :::
待補：說明為何需要 `-∞`。
:::
