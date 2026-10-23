# 常見的陷阱

## 做 case split 時，游標不在 hole 裡

用來做 case split 的快捷鍵 `C-c C-c`，只有在游標目前位於 hole（`{!!}`）裡面時才有作用。
如果游標在 hole 外面，Agda 會回報錯誤。

**解法。** 先把游標移進 hole 裡。


## 忘了在等號左邊寫出變數

用 pattern matching 定義函數時，每一個引數都必須出現在 `=` 的左邊。常見的錯誤是漏掉某些引數：

```code
-- 錯誤：
length = ...

-- 正確：
length xs = ...
```

如果少了某個變數，goal 顯示中的型別會和你預期的不一樣，多出額外的 `→` 箭頭。

**解法。** 在 `=` 的左邊，為每個引數加上變數名稱。


## 新增變數後忘了重新載入

你在定義的左邊新增了一個變數，接著沒有先重新載入檔案，就立刻想對它做 case split。
Agda 還不知道這個新變數，所以 case split 會失敗。

**解法。** 在 hole 以外的地方修改程式碼之後，一律先按 `C-c C-l`（重新載入），
再進行 `C-c C-c` 之類的後續互動指令。


## 運算子兩側沒有空格

Agda 的詞法分析器要求運算子兩側要有空格。`a+b` 這個運算式會被解讀為一個名叫 `a+b` 的識別字，
而不是 `a + b`。同樣地，`a→b` 也不是 `a → b`。

```text
-- 錯誤（單一個識別字「a+b」）：
example = a+b

-- 正確：
example = a + b
```

**解法。** 在運算子兩側加上空格。


## pattern 裡漏了括號

當你對一個帶有引數的建構子（例如 `_∷_`）做 pattern matching 時，pattern 需要加括號。
沒有括號的話，Agda 會把每個部分各自解讀成獨立的最上層 pattern。

```text
-- 錯誤（三個獨立的 pattern，而不是一個）：
head x ∷ xs = x

-- 正確：
head (x ∷ xs) = x
```


## 用 ASCII 的替代字元，而不是 Unicode

有些 ASCII 字元序列看起來很像 *Let's play Agda* 各模組使用的 Unicode 符號，但對 Agda 來說，
它們是完全不同的識別字。常見的錯誤是用 `::`（兩個 ASCII 冒號）取代 `∷`（Unicode 的 cons 運算子）。

把滑鼠移到本網站上的 Unicode 符號上，就會顯示如何用 Agda 的輸入法輸入它。

**解法。** 小心長得很像的字元。


## 神祕的黃色標示

當 Agda 把你程式碼的某些部分標成黃色時，不是你遇到了顯示上的 bug，就是 Agda 無法解出某些
隱含引數（「unsolved metavariables」）。

**解法。** 先試著用 `C-c C-l` 重新載入。如果黃色標示還在，就明確地把那些應該是隱含的引數寫出來。


## 「Cannot split on local variable」

如果你要求 Agda 對 lambda 運算式（例如 `λ x → {!!}`）裡的變數做 case split，就會出現這個錯誤。

**解法。** 要進行這樣的 case split，先加上外圍的大括號：`λ { x → {!!} }`。
重新載入之後，case split 就能運作。

平心而論，這算是 `C-c C-c` 功能的 bug，所需的大括號應該要自動插入才對。

<!--
```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.Welcome.Pitfalls where
```
-->
