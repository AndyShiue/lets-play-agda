# 歡迎 // Let's play Agda：把抽象的數學證明當成程式來執行

本網站的目的，是幫助你學習 Agda 這個函數式證明語言。它是為 2025 年在[帕多瓦大學
（University of Padova）](https://www.unipd.it/en/dm)開設的一門課程而製作的。

**從這裡開始：**
<span class="edit">[Agda 作為程式語言](Padova2025-zh-TW.ProgrammingBasics.Booleans.html)</span>

<!--<div style="background-color: mediumpurple; padding: 1em; color: white">-->
<div style="outline: 3px solid mediumpurple; padding: 0.5em; border: 1px solid transparent; border-radius: 0.3rem">
  👋 帕多瓦的同學：
  <a href="https://agdapad.quasicoherent.io/~Padova2025/"><strong>講義逐字稿、錄影與連結</strong></a>，
  搭配我們的課程使用
</div>


## 簡單來說：Agda 是一種程式語言……

- 🧊 **純函數式**，沒有可變狀態
- 🐑 語法與風格**類似 Haskell**
- 🧱 **靜態型別**，讓許多錯誤在編譯期就被抓到
- 🌳 **熟悉的型別**，例如整數、串列、……
- 🧭 **型別推論**，讓我們專心處理真正重要的型別

舉例來說，插入排序（insertion sort）的實作大概長這樣：

```code
sort : List ℕ → List ℕ
sort []       = []
sort (x ∷ xs) = insert x (sort xs)
```

我們也可以想像具有下列型別簽名（type signature）的函數……

```code
fibonacci : ℕ → ℕ                                   -- 費氏數
pi        : ℝ                                       -- 任意精度的常數
size      : {X : Set} → Tree X → ℕ                  -- 二元樹的大小
replicate : {X : Set} (len : ℕ) → X → Vector len X  -- 由相同元素組成的向量
```


## ……同時也是一種證明語言……

- 🧾 **見證的型別（types of witnesses）**，把證明與寫程式這兩種活動統一起來
- ✨ **情境輔助（context assistance）**，用互動的方式一步步建構證明
- 🎨 **表達力**足以涵蓋大部分的數學
- 🤹 **以 hole 驅動的開發（hole-driven development）**

在 Agda 中，我們藉由建構一個能算出適當見證（witness）的程式，來證明一個命題。這種作法就是
著名的 *propositions as types*（命題即型別）哲學：

<pre class="code"><a href="Padova2025.ProvingBasics.Equality.FirstSteps.html#grande-teorema">grande-teorema</a>   : 2 + 2 ≡ 4
<a href="Padova2025.ProvingBasics.Equality.Reasoning.html#binomial-theorem">binomial-theorem</a> : (x : ℕ) (y : ℕ) → (x + y) ² ≡ x ² + 2 · x · y + y ²
<a href="Padova2025.VerifiedAlgorithms.InsertionSort.PostHoc.html#theorem">sort-correct</a>     : (xs : List ℕ) → IsSorted (sort xs)</pre>

舉例來說，存在著下列這些見證的型別……

- 證明 `2 + 2` 等於 `4` <span class="inessential">（這個型別非空，也就是有居民 inhabited）</span>；
- 證明 `2 + 2` 等於 `5` <span class="inessential">（這個型別是空的）</span>；
- 證明存在大於 42 的質數 <span class="inessential">（這個型別包含無限多個值，例如序對
  `(43 , p)`，其中 `p` 是「`43` 是大於 `42` 的質數」的見證）</span>；
- 證明質數有無限多個；
- 證明某個給定的排序函數 `sort` 運作正確
  <span class="inessential">（這個型別包含的函數，會讀入任意串列 `xs` 作為輸入，並輸出一個見證，
  證明 `sort xs` 是由小到大排好的）</span>；
- 證明連續統假設（continuum hypothesis）成立；
- 諸如此類。


## ……並且協助我們……

- ✅ 驗證證明的正確性
- 🧮 實作演算法
- 💭 整理數學思路
- ⚙️ 從計算的角度欣賞數學
- 🚀 協力打造數學函式庫


<!--
```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.Welcome where

import Padova2025-zh-TW.Welcome.About
import Padova2025-zh-TW.Welcome.GettingAgda
import Padova2025-zh-TW.Welcome.References
import Padova2025-zh-TW.Welcome.Pitfalls
import Padova2025-zh-TW.Welcome.Rosetta
```
-->
