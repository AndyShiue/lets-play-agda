```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProgrammingBasics.Lists where
```

# 串列

在 Agda 社群中，串列通常寫成 `a ∷ b ∷ c ∷ []`，或更精確地說是 `a ∷ (b ∷ (c ∷ []))`。符號 `[]` 表示空串列。
運算子 `_∷_` 用來把單一元素加到既有的尾端元素串列之前（稱為「consing」）。實作這套語法的程式碼如下。

```
infixr 5 _∷_
data List (A : Set) : Set where  -- 輸入 `∷` 請打 `\::`
  []  : List A
  _∷_ : A → List A → List A
```

這個資料型別定義中出現的變數 `A` 是一個*參數*（parameter）。實際上，對每個型別 `A`，都會引進一個新的型別 `List A`。
如果 Agda 不支援參數，我們就必須自我重複，例如寫出像下面這樣冗長乏味的程式碼。

```code
data ListOfBools : Set where
  []  : ListOfBools
  _∷_ : Bool → ListOfBools → ListOfBools

data ListOfNats : Set where
  []  : ListOfNats
  _∷_ : ℕ → ListOfNats → ListOfNats
```


## 習題：串列求和

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
```

定義一個函數，對給定的自然數串列的元素求和。

```
sum : List ℕ → ℕ
-- Holify
sum []       = zero
sum (x ∷ xs) = x + sum xs

-- Tests
-- EX: sum [] ≡ zero
-- EX: sum (one ∷ []) ≡ one
-- EX: sum (one ∷ zero ∷ []) ≡ one
-- EX: sum (one ∷ two ∷ []) ≡ three
-- EX: sum (one ∷ two ∷ three ∷ []) ≡ succ (succ (succ (succ (succ (succ zero)))))
```


## 習題：串列的長度

定義一個函數，計算給定串列的長度。

```
length : {A : Set} → List A → ℕ
-- Holify
length []       = zero
length (x ∷ xs) = succ (length xs)

-- Tests
-- EX: length (four ∷ []) ≡ one
-- EX: length (one ∷ two ∷ three ∷ []) ≡ three
```

這裡參數 `A` 放在大括號裡，因此呼叫 `length` 時不需要明確寫出它：從明確的引數（某個特定的串列），
Agda 就能推斷出其元素的型別。


## 習題：複製

定義一個函數 `replicate`，讀入一個數字 `n` 與一個元素 `x` 作為輸入，輸出一個包含 `n` 個 `x` 的串列。

```
replicate : {A : Set} → ℕ → A → List A
-- Holify
replicate zero     x = []
replicate (succ n) x = x ∷ replicate n x

-- Tests
-- EX: replicate two zero ≡ zero ∷ zero ∷ []
```


## 習題：串接

定義一個二元運算子，把兩個串列串接起來。例如，`(a ∷ b ∷ []) ++ (c ∷ d ∷ [])` 應該化約為 `a ∷ b ∷ c ∷ d ∷ []`。

```
infixr 5 _++_
_++_ : {A : Set} → List A → List A → List A
-- Holify
_++_ []       ys = ys
_++_ (x ∷ xs) ys = x ∷ (xs ++ ys)

-- Tests
-- EX: (zero ∷ one ∷ []) ++ (two ∷ three ∷ []) ≡ (zero ∷ one ∷ two ∷ three ∷ [])
```


## 習題：攤平

定義一個函數，把由串列組成的串列攤平成單一串列：

```
concat : {A : Set} → List (List A) → List A
-- Holify
concat []         = []
concat (xs ∷ xss) = xs ++ concat xss

-- Tests
-- EX: concat ((zero ∷ []) ∷ []) ≡ zero ∷ []
-- EX: concat ((zero ∷ one ∷ []) ∷ (two ∷ three ∷ []) ∷ []) ≡ zero ∷ one ∷ two ∷ three ∷ []
```


## 習題：丟掉開頭的元素

例如，`drop one (a ∷ b ∷ c ∷ [])` 應該求值為 `b ∷ c ∷ []`。

```
drop : {A : Set} (k : ℕ) → List A → List A
-- Holify
drop zero     xs       = xs
drop (succ k) []       = []
drop (succ k) (x ∷ xs) = drop k xs

-- Tests
-- EX: drop one (zero ∷ one ∷ two ∷ []) ≡ one ∷ two ∷ []
```


## 習題：對串列做 map

定義 `map` 函數，它應該把提供的函數 `f` 套用到輸入串列的每個元素上。

例如，`map f (x ∷ y ∷ z ∷ [])` 應該化約為 `f x ∷ f y ∷ f z ∷ []`。

```
map : {A B : Set} → (A → B) → List A → List B
-- Holify
map f []       = []
map f (x ∷ xs) = f x ∷ map f xs

-- Tests
-- EX: map succ [] ≡ []
-- EX: map succ (one ∷ two ∷ []) ≡ two ∷ three ∷ []
```


## 習題：Snoc（在尾端加元素）

例如，`(a ∷ b ∷ c ∷ []) ∷ʳ z` 應該化約為 `a ∷ b ∷ c ∷ z ∷ []`。

```
_∷ʳ_ : {A : Set} → List A → A → List A
-- Holify
_∷ʳ_ []       y = y ∷ []
_∷ʳ_ (x ∷ xs) y = x ∷ (xs ∷ʳ y)

-- Tests
-- EX: (zero ∷ one ∷ []) ∷ʳ two ≡ (zero ∷ one ∷ two ∷ [])
```


## 習題：反轉

寫一個函數，反轉串列的元素。例如，`reverse (a ∷ b ∷ c ∷ [])` 應該化約為 `c ∷ b ∷ a ∷ []`。

```
reverse : {A : Set} → List A → List A
-- Holify
reverse []       = []
reverse (x ∷ xs) = reverse xs ∷ʳ x

-- 或者，用累加器寫成尾遞迴的形式：
-- reverse = reverseAcc []
--   where
--   reverseAcc : {A : Set} → List A → List A → List A
--   reverseAcc acc []       = acc
--   reverseAcc acc (x ∷ xs) = reverseAcc (x ∷ acc) xs

-- Tests
-- EX: reverse (zero ∷ one ∷ two ∷ []) ≡ (two ∷ one ∷ zero ∷ [])
```


## 習題：倒數

實作一個函數 `downFrom`，讀入數字 `n` 作為輸入，輸出一個長度為 `n` 的串列，內容是從 `n`（不含）到 `0`（含）的數字。
例如，`downFrom three` 應該化約為 `two ∷ one ∷ zero ∷ []`。

```
downFrom : ℕ → List ℕ
-- Holify
downFrom zero     = []
downFrom (succ n) = n ∷ downFrom n

-- Tests
-- EX: downFrom three ≡ two ∷ one ∷ zero ∷ []
```

同樣地，實作一個函數 `upTo : ℕ → List ℕ`，使得例如 `upTo three` 化約為 `zero ∷ one ∷ two ∷ []`。

```
upTo : ℕ → List ℕ
-- Holify
upTo zero     = []
upTo (succ n) = zero ∷ map succ (upTo n)

-- Tests
-- EX: upTo three ≡ zero ∷ one ∷ two ∷ []
```


## 習題：higher-kinded 的函數

Agda 運算式 `List ℕ`、`List Bool` 等等，表示某些型別，也就是 `Set` 的元素。那麼不帶任何引數的單獨運算式 `List`
是否也有意義？它的型別是什麼？

```
List' : {--}Set → Set{--}
List' = List
```

::: Aside :::
在 Haskell 的兩層型別系統中（型別管轄值，「kind」管轄型別），`List` 會被稱為 kind `* → *` 的「型別建構子（type constructor）」。
:::
