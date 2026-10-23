```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProvingBasics.EvenOdd where
```

# 自然數上的謂詞

在[本章簡介](Padova2025-zh-TW.ProvingBasics.html)中討論的五個斷言裡，我們要把前兩個提升為定義。

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base

data Even : ℕ → Set where
  base-even : Even zero
  step-even : {n : ℕ} → Even n → Even (succ (succ n))
```


## 習題：健全性檢查

作為基本的健全性檢查，讓我們證明 `zero` 與 `two` 都是偶數。

```
zero-even : Even zero
zero-even = {--}base-even{--}

two-even : Even two
two-even = {--}step-even base-even{--}
```


## 習題：偶數的和

驗證偶數的和是偶數。

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
```

```
sum-even : {a b : ℕ} → Even a → Even b → Even (a + b)
-- Holify
sum-even base-even     q = q
sum-even (step-even p) q = step-even (sum-even p q)
```


## 習題：偶數的後繼

驗證偶數的後繼是奇數。為此，我們這樣定義奇數的概念。

```
data Odd : ℕ → Set where
  base-odd : Odd one
  step-odd : {n : ℕ} → Odd n → Odd (succ (succ n))
```

```
succ-even : {a : ℕ} → Even a → Odd (succ a)
-- Holify
succ-even base-even     = base-odd
succ-even (step-even p) = step-odd (succ-even p)
```

下面的習題涵蓋了這個主題的幾個變體。

```
succ-odd : {a : ℕ} → Odd a → Even (succ a)
-- Holify
succ-odd base-odd     = step-even base-even
succ-odd (step-odd p) = step-even (succ-odd p)
```

```
succ-even' : {a : ℕ} → Odd (succ a) → Even a
-- Holify
succ-even' base-odd     = base-even
succ-even' (step-odd p) = succ-odd p
```

```
succ-odd' : {a : ℕ} → Even (succ a) → Odd a
-- Holify
succ-odd' (step-even p) = succ-even p
```


## 習題：為零

不久我們就會一般地討論相等；作為熱身，我們想設立依值型別的一個族 `IsZero n`，使得它的元素可以視為「`n` 為零」的見證。
換句話說：

1. 型別 `IsZero zero` 應該有居民。
2. 對所有非零的數字 `n`，型別 `IsZero n` 應該是空的。

想想我們如何能在 Agda 中形式化這件事，然後與參考解答比較：

::: More :::
```
data IsZero : ℕ → Set where
  case-zero : IsZero zero
```
:::

有了這個定義，我們就能陳述並證明：兩個都為零的數字，其和仍為零。先想想我們如何形式化這個命題，然後看一看並填上這個 hole。

::: More :::
```
sum-zero : (x y : ℕ) → IsZero x → IsZero y → IsZero (x + y)
-- Holify
sum-zero zero zero case-zero case-zero = case-zero
```

::: Hint :::
先在 `=` 符號左邊引進四個變數：`x`、`y`、`p`（`x` 為零的見證）以及 `q`（`y` 為零的見證）。然後做 case split。
你會發現 Agda 認出後繼的情況不可能發生。
:::
:::


## 習題：為正

與前一個習題的型別 `IsZero n` 類似，現在我們引進型別 `IsPositive n`。型別 `IsPositive zero` 應該是空的——
不應該有「`zero` 是正的」這個假命題的見證——而所有其他的型別 `IsPositive n` 都應該有居民。

想想這如何能在 Agda 中形式化，然後與參考解答比較：

::: More :::
```
data IsPositive : ℕ → Set where
  case-succ : (n : ℕ) → IsPositive (succ n)
```
:::

現在想想，「兩個數字的和，若第一個是正的，則和為正」這個觀察，如何能在 Agda 中形式化；然後與參考解答比較；
然後填上這個 hole。

::: More :::
```
sum-positive : (x y : ℕ) → IsPositive x → IsPositive (x + y)
-- Holify
sum-positive x y (case-succ n) = case-succ (n + y)

-- 或者：
-- sum-positive (succ x) y p = case-succ (x + y)
```
:::
