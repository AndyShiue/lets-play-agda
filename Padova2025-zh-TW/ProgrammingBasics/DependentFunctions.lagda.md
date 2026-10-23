```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProgrammingBasics.DependentFunctions where
```

# 依值函數

對於黑板數學與一般程式設計中的大多數函數，結果的型別與輸入值無關。例如，無論 `n` 的值為何，
[`half n`](Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic.html#half) 的型別永遠是 `ℕ`。同樣地，無論 `x` 的值為何，
[`not x`](Padova2025-zh-TW.ProgrammingBasics.Booleans.html#not) 的型別永遠是 `Bool`。

但也有些函數，其結果的型別確實依賴於輸入值。一個基本的例子是所謂的*多型恆等函數*（polymorphic identity function）。
與 [`idBool : Bool → Bool`](Padova2025-zh-TW.ProgrammingBasics.Booleans.html#idBool) 或 `idℕ : Nat → Nat` 不同，
多型恆等函數適用於所有型別。

更精確地說，多型恆等函數接受的輸入是……

1. 一個值 `X : Set`，以及
2. 一個值 `a : X`，

然後回傳同一個值 `a`。所以結果的型別取決於輸入 `X` 的值。在 Agda 中，我們這樣寫：

```
id : (X : Set) → X → X
id X a = a
```

接著我們可以這樣使用這個函數。

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base

example-usage : ℕ
example-usage = id ℕ four
```

我們很快就會定義型別 [`Vector A n`](Padova2025-zh-TW.ProgrammingBasics.Vectors.html)，也就是由 `A` 的元素組成、
長度為 `n` 的串列。接著我們可以想像下面這個依值函數的例子：

```code
replicate : (A : Set) → (n : ℕ) → A → Vector A n
-- 讀入型別 `A`、數字 `n` 與元素 `x : A` 作為輸入，
-- 輸出長度為 `n`、內容全是 `x` 的串列。

five-dimensional-zero-vector      = replicate ℕ 5 zero
three-dimensional-all-ones-vector = replicate ℕ 3 one
```

::: Aside :::
有些人偏好在非依值的情況下，也使用依值函數的記法。例如，除了……

```code
twice : ℕ → ℕ
twice zero     = zero
twice (succ x) = succ (succ (twice x))
```

……我們也可以寫成：

```code
twice : (x : ℕ) → ℕ
twice zero     = zero
twice (succ x) = succ (succ (twice x))
```
:::


## 範例：多型常數函數

實作一個函數 `K`，它讀入……

1. 一個型別 `X`（也就是一個值 `X : Set`），
2. 一個型別 `Y`，
3. 一個值 `x : X`，以及
4. 一個值 `y : Y`，

……並回傳 `x`。

```
K : {--}(X : Set) → (Y : Set) → X → Y → X{--}
-- Holify
K X Y x y = x

-- Tests
-- EX: K ℕ ℕ zero one ≡ zero
```
