```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProgrammingBasics.Vectors where
```

# 向量

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
```

```
infixr 5 _∷_
data Vector (A : Set) : ℕ → Set where
  []  : Vector A zero
  _∷_ : {n : ℕ} → A → Vector A n → Vector A (succ n)
```


## 習題：長度

定義一個函數，計算給定向量的長度。有兩種可能的實作，一種在常數時間內執行，另一種在線性時間內執行。

```
lengthV : {n : ℕ} {A : Set} → Vector A n → ℕ
-- Holify
lengthV {n} xs = n

-- 這是 O(1) 的實作。較慢的 O(n) 實作
-- 會從向量本身重建大小，不理會
-- 型別資訊：
-- lengthV' []       = zero
-- lengthV' (x ∷ xs) = succ (lengthV xs)

-- Tests
-- EX: lengthV (zero ∷ zero ∷ []) ≡ two
```


## 習題：複製

定義一個函數 `replicateV`，讀入一個數字 `n` 與一個元素 `x` 作為輸入，輸出一個包含 `n` 個 `x` 的向量。

```
replicateV : {A : Set} → (n : ℕ) → A → Vector A n
-- Holify
replicateV zero     x = []
replicateV (succ n) x = x ∷ replicateV n x

-- Tests
-- EX: replicateV two zero ≡ zero ∷ zero ∷ []
```


## 習題：Map

定義向量的 `map` 函數。例如，`map f (x ∷ y ∷ z ∷ [])` 應該化約為 `f x ∷ f y ∷ f z ∷ []`。

```
mapV : {n : ℕ} {A B : Set} → (A → B) → Vector A n → Vector B n
-- Holify
mapV f []       = []
mapV f (x ∷ xs) = f x ∷ mapV f xs
```


## 習題：zipWith

例如，`zipWithV f (x ∷ y ∷ []) (a ∷ b ∷ [])` 應該求值為 `f x a ∷ f y b ∷ []`。

```
zipWithV : {A B C : Set} {n : ℕ} → (A → B → C) → Vector A n → Vector B n → Vector C n
-- Holify
zipWithV f []       []       = []
zipWithV f (x ∷ xs) (y ∷ ys) = f x y ∷ zipWithV f xs ys
```


## 習題：drop

例如，`dropV one (a ∷ b ∷ c ∷ [])` 應該求值為 `b ∷ c ∷ []`。

```
dropV : {A : Set} {n : ℕ} (k : ℕ) → Vector A (k + n) → Vector A n
-- Holify
dropV zero     xs       = xs
dropV (succ n) (x ∷ xs) = dropV n xs

-- Tests
-- EX: dropV one (zero ∷ one ∷ two ∷ []) ≡ (one ∷ two ∷ [])
```


## 習題：take

例如，`takeV one (a ∷ b ∷ c ∷ [])` 應該求值為 `a ∷ []`。

```
takeV : {A : Set} {n : ℕ} (k : ℕ) → Vector A (k + n) → Vector A k
-- Holify
takeV zero     xs       = []
takeV (succ n) (x ∷ xs) = x ∷ takeV n xs

-- Tests
-- EX: takeV one (zero ∷ one ∷ two ∷ []) ≡ (zero ∷ [])
```


## 習題：串接

例如，`(a ∷ b ∷ []) ++V (c ∷ d ∷ [])` 應該求值為 `a ∷ b ∷ c ∷ d ∷ []`。

```
_++V_ : {A : Set} {n m : ℕ} → Vector A n → Vector A m → Vector A (n + m)
-- Holify
_++V_ []       ys = ys
_++V_ (x ∷ xs) ys = x ∷ (xs ++V ys)

-- Tests
-- EX: (zero ∷ one ∷ []) ++V (two ∷ three ∷ []) ≡ (zero ∷ one ∷ two ∷ three ∷ [])
```


## 習題：Snoc

寫一個函數，在尾端加上一個新元素。例如，`snocV (a ∷ b ∷ []) c` 應該求值為 `a ∷ b ∷ c ∷ []`。

```
snocV : {A : Set} {n : ℕ} → Vector A n → A → Vector A (succ n)
-- Holify
snocV []       y = y ∷ []
snocV (x ∷ xs) y = x ∷ snocV xs y

-- Tests
-- EX: snocV (zero ∷ one ∷ []) two ≡ (zero ∷ one ∷ two ∷ [])
```


## 習題：反轉

例如，`reverseV (a ∷ b ∷ c ∷ [])` 應該求值為 `c ∷ b ∷ a ∷ []`。

```
reverseV : {A : Set} {n : ℕ} → Vector A n → Vector A n
-- Holify
reverseV []       = []
reverseV (x ∷ xs) = snocV (reverseV xs) x

-- Tests
-- EX: reverseV (zero ∷ one ∷ two ∷ []) ≡ (two ∷ one ∷ zero ∷ [])
```


## 習題：攤平向量的向量

例如，`concatV ((a ∷ b ∷ []) ∷ (c ∷ d ∷ []) ∷ [])` 應該求值為 `a ∷ b ∷ c ∷ d ∷ []`。

```
concatV : {--}{A : Set} {n m : ℕ} → Vector (Vector A n) m → Vector A (m · n){--}
-- Holify
concatV []         = []
concatV (xs ∷ xss) = xs ++V concatV xss

-- Tests
-- EX: concatV ((zero ∷ one ∷ []) ∷ (two ∷ four ∷ []) ∷ []) ≡ (zero ∷ one ∷ two ∷ four ∷ [])
```

::: Aside :::
請注意，這個習題不平凡地依賴於實作自然數加法與乘法時那些有點任意的選擇：case split 應該對第一個引數還是第二個引數做？
`succ a · b` 應該定義成 `b + a · b` 還是 `a · b + b`？等等。這種情況並不令人滿意，也有幾個提案試圖解決這個問題。
其中之一是 Benno van den Bergh 與 Martijn den Besten 的 [objective type theory](https://arxiv.org/abs/2102.00905)。
:::
