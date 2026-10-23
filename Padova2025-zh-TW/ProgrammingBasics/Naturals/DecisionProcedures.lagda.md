```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProgrammingBasics.Naturals.DecisionProcedures where
```

# 決策程序

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Booleans
```

這個檔案包含幾個決策程序（decision procedure）——負責回答某些是非問題的函數，例如：
*給定的輸入數字是零嗎？它是偶數嗎？*

我們之後會改良這裡建議的定義。問題在於，這個檔案中的函數實際上並不會回傳*見證*（「是的，這個數是零，原因在此」
或「不，這個數不是零，原因在此」），而只是回傳一個不帶資訊的布林值（`true` 或 `false`）。


## 習題：檢查相等

定義一個函數 `eq?`，判斷它的兩個輸入數字是否相等。例如，`eq? three three` 應該化約為 `true`，
而 `eq? three four` 應該化約為 `false`。

```
eq? : ℕ → ℕ → Bool
-- Holify
eq? zero     zero     = true
eq? zero     (succ b) = false
eq? (succ a) zero     = false
eq? (succ a) (succ b) = eq? a b

-- Tests
-- EX: eq? zero  zero  ≡ true
-- EX: eq? three three ≡ true
-- EX: eq? three four  ≡ false
-- EX: eq? two   four  ≡ false
```


## 習題：檢查不等

定義一個函數 `≤?`，判斷它的第一個引數是否小於或等於第二個引數。例如，`≤? two four` 應該化約為 `true`，
而 `≤? four two` 應該化約為 `false`。

```
≤? : ℕ → ℕ → Bool
-- Holify
≤? zero     b        = true
≤? (succ a) zero     = false
≤? (succ a) (succ b) = ≤? a b

-- Tests
-- EX: ≤? two  four ≡ true
-- EX: ≤? four two  ≡ false
```

在 `≤?` 的基礎上，我們可以實作嚴格小於關係的決策程序：

```
<? : ℕ → ℕ → Bool
<? a b = ≤? (succ a) b
```


## 習題：偶數與奇數

定義一個函數 `even?`，判斷它的輸入是否為偶數。

例如，`even? zero` 與 `even? two` 都應該化約為 `true`，而 `even? three` 應該求值為 `false`。

```
even? : ℕ → Bool
-- Holify
even? zero            = true
even? (succ zero)     = false
even? (succ (succ a)) = even? a
-- 或者，下面這個定義也行得通：
-- even? zero     = true
-- even? (succ a) = not (even? a)

-- Tests
-- EX: even? zero  ≡ true
-- EX: even? two   ≡ true
-- EX: even? four  ≡ true
-- EX: even? one   ≡ false
-- EX: even? three ≡ false
```

定義一個函數 `odd?`，判斷它的輸入是否為奇數。你可以使用前面的 `even?` 函數。

```
odd? : ℕ → Bool
-- Holify
odd? n = not (even? n)

-- 或者：
-- odd? zero            = false
-- odd? (succ zero)     = true
-- odd? (succ (succ a)) = odd? a

-- 或者還有：
-- odd? zero            = false
-- odd? (succ a)        = not (odd? a)

-- Tests
-- EX: odd? zero  ≡ false
-- EX: odd? two   ≡ false
-- EX: odd? four  ≡ false
-- EX: odd? one   ≡ true
-- EX: odd? three ≡ true
```

