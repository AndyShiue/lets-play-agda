```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProvingBasics.Termination.Intro where
```

# 簡介

讓我們實作一個函數，計算一個數字的二進位位數（不算前導的零）。利用
[`half`](Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic.html#half) 函數，我們可以想像下面這個定義。

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
```

```code
digits : ℕ → ℕ
digits zero       = zero
digits x@(succ _) = succ (digits (half x))
```

看起來夠合理了，例如我們有下面這串化約：

```code
digits five = succ (digits two) = succ (succ (digits one)) = succ (succ (succ zero))
```

然而，Agda 拒絕這個嘗試，並給出「Termination checking failed」的訊息：在 Agda 中，所有函數都必須是全函數，不允許無窮迴圈；
但對 Agda 的終止性檢查器來說，遞迴最終會抵達基底情形 `digits zero` 並不明顯。它確實會抵達，因為當 `x` 為正時，
`half x` 嚴格小於 `x`，我們也將[證明這個事實](Padova2025-zh-TW.ProvingBasics.Termination.Ordering.html#exercise-halving)，
但無論是這個事實本身，還是它與終止性問題的關聯，對終止性檢查器來說都不明顯。

::: Aside :::
大多數其他程式語言，包括在許多方面與 Agda 相當相似的 Haskell，對非全函數，或是全函數但看不出來是全函數的函數，都寬鬆得多。
Agda 要求所有函數都必須是全函數，這對[命題即型別](Padova2025-zh-TW.ProvingBasics.PropositionsAsTypes.html)的典範來說是根本性的。
如果我們允許非全函數，就能輕易地證明 `⊥`：

```code
contradiction : ⊥
contradiction = contradiction
```
:::

有下列幾種方法可以處理這個問題。

0. 採用另一個明顯會終止的演算法。
1. 向 Agda 保證遞迴會終止，而不提供證明。
2. 把函數標示為不會終止（這會使它無法在證明中被展開）。
3. 使用簡單但脆弱的燃料。
4. 以*可及性見證（accessibility witnesses）*的形式，使用更精緻的燃料。
5. 提供終止性的證明。

讓我們依序檢視這些選項。


## 採用另一個演算法

這個選項一般而言行不通。就這裡的特定情況而言，我們可以先計算輸入數字的二進位表示，再數有幾個位元：

```
open import Padova2025-zh-TW.ProgrammingBasics.Lists
open import Padova2025-zh-TW.VerifiedAlgorithms.Binary

digits₀ : ℕ → ℕ
digits₀ n = length (encode n)
```

這個定義如預期般運作。


## 保證會終止

保證會終止是把問題快速擱置的辦法，也許是為了專注於形式化專案中其他更有趣的特色。這個選項同樣不令人滿意，
而且在使用 Agda 的安全模式時不可用（在 Agda 檔案開頭加上 `{-# OPTIONS --safe #-}` 即可開啟安全模式）。

```
{-# TERMINATING #-}
digits₁ : ℕ → ℕ
digits₁ zero       = zero
digits₁ x@(succ _) = succ (digits₁ (half x))
```



## 標示為不會終止

`{-# TERMINATING #-}` 的一個稍微安全一點的變體，是把定義標示為不會終止。這樣我們仍然可以用 `C-c C-v` 執行這個函數，
但在型別檢查期間，這個定義永遠不會被展開。

```
{-# NON_TERMINATING #-}
digits₂ : ℕ → ℕ
digits₂ zero       = zero
digits₂ x@(succ _) = succ (digits₂ (half x))

-- 下面這個 hole 無法被填上。
-- 特別是，`refl` 行不通。
-- open import Padova2025-zh-TW.ProvingBasics.Equality.Base
-- _ : digits₂ zero ≡ zero
-- _ = ?
```

使用 `{-# NON_TERMINATING #-}` 仍然會讓系統不一致，就像使用 `{-# TERMINATING #-}` 一樣——我們可以像下面這樣「證明」`⊥`。

```
open import Padova2025-zh-TW.ProvingBasics.Negation

{-# NON_TERMINATING #-}
loop : ⊥  -- 😱
loop = loop
```


## 使用燃料並證明終止性

選項 3、4 與 5 在後面的模組中討論。

```
-- 選項 3
open import Padova2025-zh-TW.ProvingBasics.Termination.Gas

-- 選項 4
open import Padova2025-zh-TW.ProvingBasics.Termination.WellFounded

-- 選項 5
open import Padova2025-zh-TW.ProvingBasics.Termination.BoveCapretta
```

不過首先，我們來看看自然數上的標準序關係。

```
open import Padova2025-zh-TW.ProvingBasics.Termination.Ordering
```

更多細節請見 [2019 年 Proof and Computation 論文集](https://doi.org/10.1142/12263)的第 8 章，由 Dominique Larchey-Wendling
與 Jean-François Monin 撰寫。他們的論文充滿洞察，拿他們的 Rocq 形式化與 Agda 中的各種做法比較，或許會很有意思。
