```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProgrammingBasics.SyntacticSugar where
```

# 語法糖

為了讓 Agda 程式設計更愉快、減少雜訊，並更貼近黑板上的記法，Agda 支援一些語法上的便利功能。這一節我們來討論其中幾個。
它們在處理輸出型別依賴於輸入值的函數時最有用。

我們重複[依值函數簡介](Padova2025-zh-TW.ProgrammingBasics.DependentFunctions.html)中的兩個定義：

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base

id : (X : Set) → X → X
id X a = a

example-usage : ℕ
example-usage = id ℕ four
```


## 把參數標示為隱含

在上面 `example-usage` 的定義中，我們必須明確寫出型別 `ℕ`，儘管 Agda 應該能從第二個引數 `four` 的型別推斷出來
（已知它的型別是 `ℕ`）。

事實上，除了寫出「`ℕ`」，我們也可以用「`_`」當佔位符，請 Agda 推斷出合適的值：

```
example-usage' : ℕ
example-usage' = id _ four
```

::: Aside :::
如果 Agda 無法從上下文推斷出一個值，對應的位置會被標成黃色。
:::

我們還能進一步改善這個情況，把第一個引數完全拿掉。為此，我們把 `id` 的第一個參數標示為*隱含*（implicit）：

```
id-with-implicit-parameter : {X : Set} → X → X
id-with-implicit-parameter a = a

example-usage'' : ℕ
example-usage'' = id-with-implicit-parameter four
```

如果我們想明確指定隱含參數的值——也許是為了幫助 Agda 或人類讀者理解程式碼，或是縮小可能性的範圍，讓錯誤訊息與互動點
更有用——我們可以在呼叫處使用大括號，作為定義中那些大括號的解藥：

```
example-usage''' : ℕ
example-usage''' = id-with-implicit-parameter {ℕ} four
```


## 縮寫參數宣告

考慮下面的型別簽名。

```code
K : (X : Set) → (Y : Set) → X → Y → X
```

這個簽名有兩種方式可以寫得更簡潔。首先，我們可以省略括號變數宣告之間的函數型別箭頭 `→`：

```code
K : (X : Set) (Y : Set) → X → Y → X
```

其次，由於 `X` 與 `Y` 的型別相同，我們可以把宣告縮寫如下：

```code
K : (X Y : Set) → X → Y → X
```

::: Aside :::
要寫出完全道地的 Agda 程式碼，我們還會把 `X` 與 `Y` 也標示為隱含。這樣得到的函數，用法就和
[SKI 演算](https://zh.wikipedia.org/zh-tw/SKI%E7%BB%84%E5%90%88%E5%AD%90%E6%BC%94%E7%AE%97)中對應的組合子一模一樣：

```code
K : {X Y : Set} → X → Y → X
```
:::
