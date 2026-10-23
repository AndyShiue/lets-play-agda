```
{-# OPTIONS --cubical-compatible #-}
open import Padova2025-zh-TW.ProgrammingBasics.Lists
open import Padova2025-zh-TW.ProvingBasics.Connectives.Disjunction

module Padova2025-zh-TW.VerifiedAlgorithms.InsertionSort.PostHoc
  (A : Set) (_≤_ : A → A → Set) (cmp? : (x y : A) → x ≤ y ⊎ y ≤ x) where
```

# 事後驗證

```
open import Padova2025-zh-TW.VerifiedAlgorithms.InsertionSort.Implementation A _≤_ cmp?
```


## 輸出串列是有序的

第一步，讓我們證明 `sort` 函數產生的串列永遠是遞增有序的。為了表達這樣的斷言，我們需要引進型別 `IsOrdered xs`，
其見證表示給定的串列 `xs` 是有序的。

```
data IsOrdered : List A → Set where
  empty     : IsOrdered []
  singleton : {x : A} → IsOrdered (x ∷ [])
  cons      : {x y : A} {ys : List A} → x ≤ y → IsOrdered (y ∷ ys) → IsOrdered (x ∷ (y ∷ ys))
```

```
lemma₀ : (x y : A) (ys : List A) → y ≤ x → IsOrdered (y ∷ ys) → IsOrdered (y ∷ insert x ys)
-- Holify
lemma₀ x y []       y≤x p = cons y≤x singleton
lemma₀ x y (z ∷ ys) y≤x (cons y≤z q) with cmp? x z
... | left  x≤z = cons y≤x (cons x≤z q)
... | right z≤x = cons y≤z (lemma₀ x z ys z≤x q)
```

```
lemma : (x : A) (ys : List A) → IsOrdered ys → IsOrdered (insert x ys)
-- Holify
lemma x []       p = singleton
lemma x (y ∷ ys) p with cmp? x y
... | left  x≤y = cons x≤y p
... | right y≤x = lemma₀ x y ys y≤x p
```

```
theorem : (xs : List A) → IsOrdered (sort xs)
-- Holify
theorem []       = empty
theorem (x ∷ xs) = lemma x (sort xs) (theorem xs)
```


## 輸出串列是輸入串列的排列

很棒的是，上面發展出的 `theorem : (xs : List A) → IsOrdered (sort xs)` 的完整證明，只有一個螢幕那麼長的程式碼。然而，
這個定理還沒有表達排序函數正確運作的所有面向：

```
cheatsort : List A → List A
cheatsort xs = []
```

```
cheattheorem : (xs : List A) → IsOrdered (cheatsort xs)
cheattheorem xs = empty
```

我們需要驗證 `sort xs` 是輸入串列 `xs` 的排列。為了表達這樣的斷言，我們先設立型別 `x ◂ ys ↝ xys`，
其見證表示把 `x` 插入 `ys` 的某個位置會得到串列 `xys`。

```
data _◂_↝_ : A → List A → List A → Set where
  here  : {x : A} {xs : List A} → x ◂ xs ↝ (x ∷ xs)
  there : {x y : A} {ys xys : List A} → x ◂ ys ↝ xys → x ◂ (y ∷ ys) ↝ (y ∷ xys)
```

接著我們設立型別 `xs ≈ ys`，其見證表示兩個串列 `xs` 與 `ys` 彼此互為排列，也就是說，包含完全相同的元素，只是順序可能不同。

```
infix 4 _≈_
data _≈_ : List A → List A → Set where
  empty : [] ≈ []
  cons  : {x : A} {xs ys xys : List A} → (x ◂ ys ↝ xys) → xs ≈ ys → (x ∷ xs) ≈ xys
```

下面是這種排列見證的一個例子：

```
example : (x y z : A) → (x ∷ y ∷ z ∷ []) ≈ (z ∷ x ∷ y ∷ [])
-- Holify
example x y z = cons (there here) (cons (there here) (cons here empty))
```

接著我們就可以陳述並證明關於 `insert` 插入行為的基本引理。

```
lemma' : (x : A) (ys : List A) → x ◂ ys ↝ insert x ys
-- Holify
lemma' x []       = here
lemma' x (y ∷ ys) with cmp? x y
... | left  x≤y = here
... | right y≤x = there (lemma' x ys)
```

關於 `sort` 函數所要的結果，就是一個快速的推論。

```
theorem' : (xs : List A) → xs ≈ sort xs
-- Holify
theorem' []       = empty
theorem' (x ∷ xs) = cons (lemma' x (sort xs)) (theorem' xs)
```
