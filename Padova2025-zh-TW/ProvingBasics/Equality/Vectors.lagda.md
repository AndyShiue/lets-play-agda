```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProvingBasics.Equality.Vectors where
```

# 關於向量的結果

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
open import Padova2025-zh-TW.ProgrammingBasics.Vectors
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.General
```

## Take 與 drop

```
take-drop
  : {A : Set} {n : ℕ} (k : ℕ) (xs : Vector A (k + n))
  → takeV k xs ++V dropV k xs ≡ xs
-- Holify
take-drop zero     xs       = refl
take-drop (succ k) (x ∷ xs) = cong (x ∷_) (take-drop k xs)
```


## 結合律

找出陳述 `_++V_` 是結合的時候，困難在哪裡。

::: More :::
設 `xs : Vector A n`、`ys : Vector A m`、`zs : Vector A o`。

那麼 `(xs ++V ys) ++V zs` 的型別是 `Vector A ((n + m) + o`，而 `xs ++V (ys ++V zs)`
的型別是 `Vector A (n + (m + o))`。

這兩個型別是相等的，但不是依定義相等。因此運算式「`(xs ++V ys) ++V zs ≡ xs ++V (ys ++V zs)`」是型別錯誤的。
要陳述我們想要的相等，有三種選擇。

1. 把等式的其中一邊傳送（transport）到另一邊的型別。
2. 引進所謂的*異質相等*（heterogeneous equality）。
3. 改用 Cubical Agda：在那裡我們仍然需要做傳送（而異質相等不再好用），但處理這種傳送會變得簡單。

```
open import Padova2025-zh-TW.ProvingBasics.Equality.NaturalNumbers
```


### 方法 1：傳送等式的其中一邊

```
cons-subst
  : {A : Set} {n m : ℕ}
  → (p : n ≡ m) (x : A) (xs : Vector A n)
  → subst (Vector A) (cong succ p) (x ∷ xs) ≡ x ∷ subst (Vector A) p xs
-- Holify
cons-subst refl x xs = refl
```

```
++V-assoc
  : {A : Set} {n m o : ℕ} (xs : Vector A n) (ys : Vector A m) (zs : Vector A o)
  → subst (Vector A) (+-assoc n m o) ((xs ++V ys) ++V zs) ≡ xs ++V (ys ++V zs)
-- Holify
++V-assoc [] ys zs = refl
++V-assoc {n = succ n} (x ∷ xs) ys zs =
  trans (cons-subst (+-assoc n _ _) _ _) (cong (x ∷_) (++V-assoc xs ys zs))
```


### 方法 1'：傳送其中一邊，但加一點變化

引進一個 `cast` 運算，可以讓方法 1 變得更討人喜歡；與 `subst` 不同，它不會去看給定的相等見證，如
[標準函式庫](https://agda.github.io/agda-stdlib/experimental/Data.Vec.Properties.html#++-assoc-eqFree)所做的那樣。
[使用 Cubical Agda](https://agda.github.io/cubical/Cubical.Data.Vec.Properties.html#587) 時，
方法 1 也會變得更討人喜歡。在這兩種變體中，我們都不再需要 `cons-subst`。

訣竅是不要對相等見證做 pattern matching，而只對維度與向量本身做。

在下面的型別簽名中，`(n ≡ m)` 前面的點表示我們不會去看這個引數的值（Agda 也會因此禁止我們偷看）。

```
cast
  : {A : Set} {n m : ℕ}
  → .(n ≡ m) → Vector A n → Vector A m
-- Holify
cast {m = zero}   p []       = []
cast {m = succ m} p (x ∷ xs) = x ∷ cast (succ-injective p) xs
```

```
cast-is-id
  : {A : Set} {n : ℕ}
  → (p : n ≡ n) (xs : Vector A n)
  → cast p xs ≡ xs
-- Holify
cast-is-id p []       = refl
cast-is-id p (x ∷ xs) = cong (x ∷_) (cast-is-id (succ-injective p) xs)
```

```
++V-assoc'
  : {A : Set} {n m o : ℕ} (xs : Vector A n) (ys : Vector A m) (zs : Vector A o)
  → cast (+-assoc n m o) ((xs ++V ys) ++V zs) ≡ xs ++V (ys ++V zs)
-- Holify
++V-assoc' []       ys zs = cast-is-id refl (ys ++V zs)
++V-assoc' (x ∷ xs) ys zs = cong (x ∷_) (++V-assoc' xs ys zs)
```


### 方法 2：異質相等

或者，我們可以引進所謂的*異質相等*。然而，下面提出的 `icong` 函數需要
[K 公理](https://agda.readthedocs.io/en/latest/language/without-k.html)，它與 Cubical Agda 不相容。
因此我們只在這裡以註解的形式收錄這個替代方案。

```
infix 4 _≅_
data _≅_ {A : Set} (x : A) : {B : Set} → B → Set₁ where
   refl : x ≅ x
```

```
{-
icong
  : {I : Set} (F : I → Set) {G : {k : I} → F k → Set}
  → {i j : I} {x : F i} {y : F j}
  → i ≡ j → (f : {k : I} (z : F k) → G z)
  → x ≅ y
  → f x ≅ f y
icong F refl _ refl = refl

++V-assoc''
  : {A : Set} {n m o : ℕ} (xs : Vector A n) (ys : Vector A m) (zs : Vector A o)
  → (xs ++V ys) ++V zs ≅ xs ++V (ys ++V zs)
++V-assoc''              []       ys zs = refl
++V-assoc'' {n = succ n} (x ∷ xs) ys zs = icong (Vector _) (+-assoc n _ _) (x ∷_) (++V-assoc'' xs ys zs)
-}
```
:::
