```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProvingBasics.Equality.Lists where
```

# 關於串列的結果

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
open import Padova2025-zh-TW.ProgrammingBasics.Lists
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.General
```


## 習題：兩次反轉

做下面的習題時，請注意 `reverse (x ∷ xs)` 被定義為 `reverse xs ∷ʳ x`。

```
reverse-∷ʳ : {A : Set} (ys : List A) (x : A) → reverse (ys ∷ʳ x) ≡ (x ∷ reverse ys)
-- Holify
reverse-∷ʳ []       x = refl
reverse-∷ʳ (y ∷ ys) x = cong (λ zs → zs ∷ʳ y) (reverse-∷ʳ ys x)
```

```
reverse-reverse : {A : Set} (xs : List A) → reverse (reverse xs) ≡ xs
-- Holify
reverse-reverse [] = refl
reverse-reverse (x ∷ xs) =
  trans (reverse-∷ʳ (reverse xs) x) (cong (x ∷_) (reverse-reverse xs))
```


## 習題：串接的結合律

```
++-assoc : {A : Set} (xs ys zs : List A) → (xs ++ ys) ++ zs ≡ xs ++ (ys ++ zs)
-- Holify
++-assoc []       ys zs = refl
++-assoc (x ∷ xs) ys zs = cong (x ∷_) (++-assoc xs ys zs)
```


## 習題：長度是一個同態

```
length-homo : {A : Set} (xs ys : List A) → length (xs ++ ys) ≡ length xs + length ys
-- Holify
length-homo []       ys = refl
length-homo (x ∷ xs) ys = cong succ (length-homo xs ys)
```


## 習題：複製是一個自然變換

```
replicate-natural
  : {A B : Set} (f : A → B) (n : ℕ) (x : A)
  → map f (replicate n x) ≡ replicate n (f x)
-- Holify
replicate-natural f zero     x = refl
replicate-natural f (succ n) x = cong (f x ∷_) (replicate-natural f n x)
```


## 習題：複製與 snoc

下面這個引理，在驗證
[Markov 原理在某些數學宇宙中不成立](Padova2025-zh-TW.Explorations.Forcing.Cohen.html#markovs-principle)時會派上用場。

```
replicate-snoc : {A : Set} (n : ℕ) (x : A) → x ∷ replicate n x ≡ replicate n x ∷ʳ x
-- Holify
replicate-snoc zero     x = refl
replicate-snoc (succ n) x = cong (x ∷_) (replicate-snoc n x)
```


## 習題：snoc 與串接

```
snoc-++ : {A : Set} (a : A) (xs ys : List A) → (xs ∷ʳ a) ++ ys ≡ xs ++ (a ∷ ys)
-- Holify
snoc-++ a []       ys = refl
snoc-++ a (x ∷ xs) ys = cong (x ∷_) (snoc-++ a xs ys)
```

```
++-snoc : {A : Set} (a : A) (xs ys : List A) → xs ++ (ys ∷ʳ a) ≡ (xs ++ ys) ∷ʳ a
-- Holify
++-snoc a []       ys = refl
++-snoc a (x ∷ xs) ys = cong (x ∷_) (++-snoc a xs ys)
```

## 習題：snoc 之後的長度

```
length-snoc : {A : Set} (xs : List A) (y : A) → length (xs ∷ʳ y) ≡ succ (length xs)
-- Holify
length-snoc []       y = refl
length-snoc (x ∷ xs) y = cong succ (length-snoc xs y)
```


## 習題：空串列是串接的單位元

```
++-[] : {A : Set} (xs : List A) → xs ++ [] ≡ xs
-- Holify
++-[] []       = refl
++-[] (x ∷ xs) = cong (x ∷_) (++-[] xs)
```
