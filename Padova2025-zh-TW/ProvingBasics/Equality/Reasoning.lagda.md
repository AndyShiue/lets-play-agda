```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProvingBasics.Equality.Reasoning where
```

# 等式推理

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.General
open import Padova2025-zh-TW.ProvingBasics.Equality.NaturalNumbers
```

我們先前討論的相等證明，採用的是所謂的*組合子風格*（combinatorial style），使用了*組合子*（combinators）
[`trans`](Padova2025-zh-TW.ProvingBasics.Equality.General.html#trans)、
[`sym`](Padova2025-zh-TW.ProvingBasics.Equality.General.html#sym) 與
[`cong`](Padova2025-zh-TW.ProvingBasics.Equality.General.html#cong)。如果充分利用 Agda 的輔助功能，這種風格的證明要建構出來
並非不可能，但得到的證明往往很難閱讀。這種「寫完就看不懂」（write-only）的證明，與我們玩 Agda 時所追求的優雅理想背道而馳。
它們也跟一般黑板上證明恆等式的方式完全不像。

相對地，在黑板上，我們通常用一連串的等式來驗證恆等式，隱含地而非明確地使用 `trans`。這種風格稱為*等式推理*
（equational reasoning），在 Agda 中也能使用。例如，
[加法交換律的證明](Padova2025-zh-TW.ProvingBasics.Equality.NaturalNumbers.html#+-comm)在這種風格下看起來是這樣：

```
open import Padova2025-zh-TW.ProvingBasics.Equality.Reasoning.Core
-- 並非魔法，但仍建議初次閱讀時跳過

+-comm' : (a b : ℕ) → a + b ≡ b + a
+-comm' zero     b = sym (+-zero b)
+-comm' (succ a) b = begin
  succ a + b   ≡⟨⟩
  succ (a + b) ≡⟨ cong succ (+-comm' a b) ⟩
  succ (b + a) ≡⟨ sym (+-succ b a) ⟩
  b + succ a   ∎

-- 與組合子風格的證明比較：
-- +-comm (succ a) b =
--   trans (cong succ (+-comm a b)) (sym (+-succ b a))
```

我們從左手邊出發，反覆進行操作，直到抵達右手邊。以 `≡⟨⟩` 標示的步驟依定義成立
（由 [`refl`](Padova2025-zh-TW.ProvingBasics.Equality.Base.html#_≡_.refl) 得到）。以 `≡⟨ p ⟩` 標示的步驟，
則依所指明的理由 `p`（對應相等型別的一個元素）成立。

::: Aside :::
除了 `≡⟨ sym p ⟩`，我們也可以寫成 `≡˘⟨ p ⟩`。
:::


## 習題：分配律，再訪

用等式推理的風格，重做[先前的](Padova2025-zh-TW.ProvingBasics.Equality.NaturalNumbers.html#·-distribʳ-+)分配律證明。

```
·-distribʳ-+' : (a b c : ℕ) → (a + b) · c ≡ a · c + b · c
-- Holify
·-distribʳ-+' zero     b c = refl
·-distribʳ-+' (succ a) b c = begin
  (succ a + b) · c    ≡⟨⟩
  succ (a + b) · c    ≡⟨⟩
  c + (a + b) · c     ≡⟨ cong (c +_) (·-distribʳ-+' a b c) ⟩
  c + (a · c + b · c) ≡˘⟨ +-assoc c (a · c) (b · c) ⟩
  (c + a · c) + b · c ≡⟨⟩
  succ a · c  + b · c ∎
```


## 習題：乘法的交換律

```
·-zero : (a : ℕ) → a · zero ≡ zero
-- Holify
·-zero zero     = refl
·-zero (succ a) = ·-zero a
```

```
+-swap : (a b c : ℕ) → a + (b + c) ≡ b + (a + c)
-- Holify
+-swap a b c = begin
  a + (b + c) ≡˘⟨ +-assoc a b c ⟩
  (a + b) + c ≡⟨ cong (_+ c) (+-comm a b) ⟩
  (b + a) + c ≡⟨ +-assoc b a c ⟩
  b + (a + c) ∎
```

```
·-succ : (a b : ℕ) → a · succ b ≡ a + a · b
-- Holify
·-succ zero     b = refl
·-succ (succ a) b = begin
  succ a · succ b        ≡⟨⟩
  succ b + a · succ b    ≡⟨ cong (succ b +_) (·-succ a b) ⟩
  succ b + (a + a · b)   ≡⟨ +-swap (succ b) a (a · b) ⟩
  a + (succ b + a · b)   ≡⟨⟩
  a + succ (b + a · b)   ≡⟨ +-succ a (b + a · b) ⟩
  succ (a + (b + a · b)) ≡⟨⟩
  succ a + succ a · b    ∎
```

```
·-comm : (a b : ℕ) → a · b ≡ b · a
-- Holify
·-comm zero     b = sym (·-zero b)
·-comm (succ a) b = begin
  succ a · b ≡⟨⟩
  b + a · b  ≡⟨ cong (b +_) (·-comm a b) ⟩
  b + b · a  ≡˘⟨ ·-succ b a ⟩
  b · succ a ∎
```

作為推論，由交換律以及[第一條分配律](Padova2025-zh-TW.ProvingBasics.Equality.NaturalNumbers.html#·-distribʳ-+)，
我們得到另一條分配律。

```
·-distribˡ-+ : (a b c : ℕ) → a · (b + c) ≡ a · b + a · c
-- Holify
·-distribˡ-+ a b c = begin
  a · (b + c)   ≡⟨ ·-comm a (b + c) ⟩
  (b + c) · a   ≡⟨ ·-distribʳ-+ b c a ⟩
  b · a + c · a ≡⟨ cong₂ _+_ (·-comm b a) (·-comm c a) ⟩
  a · b + a · c ∎
```


## 習題：二項式定理

```
binomial-theorem : (x y : ℕ) → (x + y) ² ≡ x ² + two · (x · y) + y ²
-- Holify
binomial-theorem x y = begin
  (x + y) ²                         ≡⟨⟩
  (x + y) · (x + y)                 ≡⟨ ·-distribʳ-+ x y (x + y) ⟩
  x · (x + y) + y · (x + y)         ≡⟨ cong₂ (_+_) (·-distribˡ-+ x x y) (·-distribˡ-+ y x y) ⟩
  (x · x + x · y) + (y · x + y · y) ≡⟨ +-assoc (x · x) (x · y) (y · x + y · y) ⟩
  x ² + (x · y + (y · x + y ²))     ≡˘⟨ cong (x ² +_) (+-assoc (x · y) (y · x) (y ²)) ⟩
  x ² + ((x · y + y · x) + y ²)     ≡⟨ cong (λ a → x ² + (a + y ²)) lemma ⟩
  x ² + (two · (x · y) + y ²)       ≡˘⟨ +-assoc (x ²) (two · (x · y)) (y ²) ⟩
  x ² + two · (x · y) + y ²         ∎
  where
  lemma : x · y + y · x ≡ two · (x · y)
  lemma = trans (cong ((x · y) +_) (·-comm y x)) (two-+-+ (x · y))
```

把這個證明親手做一次是很有啟發性的，這樣才能體會，當手邊只有公理與它們的基本推論時，二項式定理並不平凡。有一個
[環求解器（ring solver）](https://gist.github.com/andrejbauer/358722620c26c09d6be218bcd95ee654)
可以自動產生這個證明。


## 習題：有累加器與沒有累加器的求和

```
open import Padova2025-zh-TW.ProgrammingBasics.Lists
```

[回到我們引進串列的時候](Padova2025-zh-TW.ProgrammingBasics.Lists.html#sum)，我們實作了一個 `sum` 函數，
對給定的自然數串列的元素求和：

```
-- sum : List ℕ → ℕ
-- sum []       = zero
-- sum (x ∷ xs) = x + sum xs
```

另一種尾遞迴的實作則使用累加器（accumulator）：

```
sumAcc : ℕ → List ℕ → ℕ
sumAcc acc []       = acc
sumAcc acc (x ∷ xs) = sumAcc (acc + x) xs

sum' : List ℕ → ℕ
sum' = sumAcc zero
```

讓我們證明這兩種實作得到相同的結果。

```
lemma-sumAcc : (acc : ℕ) (xs : List ℕ) → sumAcc acc xs ≡ acc + sum xs
-- Holify
lemma-sumAcc acc []       = sym (+-zero acc)
lemma-sumAcc acc (x ∷ xs) = begin
  sumAcc acc (x ∷ xs) ≡⟨⟩
  sumAcc (acc + x) xs ≡⟨ lemma-sumAcc (acc + x) xs ⟩
  (acc + x) + sum xs  ≡⟨ +-assoc acc x (sum xs) ⟩
  acc + (x + sum xs)  ∎
```

```
sum-sum' : (xs : List ℕ) → sum xs ≡ sum' xs
-- Holify
sum-sum' xs = sym (lemma-sumAcc zero xs)
```


## 習題：有累加器與沒有累加器的反轉

與前一個習題類似——串列的 `reverse` 函數有兩種自然的實作，一種不使用累加器，另一種使用累加器：

```
-- 不使用累加器。
-- reverse : {A : Set} → List A → List A
-- reverse []       = []
-- reverse (x ∷ xs) = reverse xs ∷ʳ x

-- 使用累加器。
reverseAcc : {A : Set} → List A → List A → List A
reverseAcc acc []       = acc
reverseAcc acc (x ∷ xs) = reverseAcc (x ∷ acc) xs

reverse' : {A : Set} → List A → List A
reverse' = reverseAcc []
```

接下來的證明中，函數 [snoc-++](Padova2025-zh-TW.ProvingBasics.Equality.Lists.html#snoc-++) 會很有用。

```
open import Padova2025-zh-TW.ProvingBasics.Equality.Lists
```

```
lemma-reverseAcc : {A : Set} (acc : List A) (xs : List A) → reverseAcc acc xs ≡ reverse xs ++ acc
-- Holify
lemma-reverseAcc acc [] = refl
lemma-reverseAcc acc (x ∷ xs) = begin
  reverseAcc acc (x ∷ xs)  ≡⟨⟩
  reverseAcc (x ∷ acc) xs  ≡⟨ lemma-reverseAcc (x ∷ acc) xs ⟩
  reverse xs ++ (x ∷ acc)  ≡˘⟨ snoc-++ x (reverse xs) acc ⟩
  (reverse xs ∷ʳ x) ++ acc ≡⟨⟩
  reverse (x ∷ xs) ++ acc  ∎
```

```
reverse-reverse' : {A : Set} (xs : List A) → reverse xs ≡ reverse' xs
-- Holify
reverse-reverse' xs = sym (trans (lemma-reverseAcc [] xs) (++-[] (reverse xs)))
```


## 習題：有累加器與沒有累加器的費氏數

同樣的故事。以下是計算費氏數（Fibonacci numbers）的兩個演算法，一個是直截了當的，一個是尾遞迴的。
證明這兩個演算法給出相同的結果。

```
-- 不使用累加器。
fib : ℕ → ℕ
fib zero            = zero
fib (succ zero)     = succ zero
fib (succ (succ n)) = fib (succ n) + fib n

-- 使用累加器。
fibAcc : ℕ → ℕ → ℕ → ℕ
fibAcc a b zero     = a
fibAcc a b (succ n) = fibAcc b (b + a) n

fib' : ℕ → ℕ
fib' = fibAcc zero one
```

```
lemma-fibAcc : (n k : ℕ) → fibAcc (fib n) (fib (succ n)) k ≡ fib (k + n)
-- Holify
lemma-fibAcc n zero     = refl
lemma-fibAcc n (succ k) = begin
  fibAcc (fib n) (fib (succ n)) (succ k) ≡⟨ lemma-fibAcc (succ n) k ⟩
  fib (k + succ n)                       ≡⟨ cong fib (+-succ k n) ⟩
  fib (succ k + n)                       ∎
```

```
fib-fib' : (n : ℕ) → fib' n ≡ fib n
-- Holify
fib-fib' n = trans (lemma-fibAcc zero n) (cong fib (+-zero n))
```
