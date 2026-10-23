```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProgrammingBasics.Booleans where
```

# 布林值

下面這三行程式碼引進一個新的資料型別 `Bool`。這個型別恰好包含兩個值：`false` 與 `true`：

```
data Bool : Set where
  false : Bool
  true  : Bool
```

在 Agda 中，每個 term 都有某個型別。term 的型別以冒號標示。因此 term `false` 與 `true`
的型別是 `Bool`，而 `Bool` 本身的型別是 `Set`。我們把型別想像成裝著值的容器，類似黑板數學中的集合。
型別 `Set` 是 Agda 內建的，不需要（也無法）手動定義。它包含所有所謂的小型（small）資料型別。

::: Aside :::
在標準集合論中，「所有集合所成的集合」是個不連貫的概念，會導致[羅素悖論（Russell's paradox）](https://zh.wikipedia.org/zh-tw/%E7%BD%97%E7%B4%A0%E6%82%96%E8%AE%BA)。

同樣地，在型別論中我們不能有「所有型別的型別」，否則會產生 Girard 悖論。因此，Agda 的型別 `Set`
並不是*所有*型別的型別，而只是「小」型別的型別。型別 `Set` 本身並不小，而是「大」。`Set` 的型別是 `Set₁`，
也就是所有大型別的型別，而它本身並不「大」，而是「非常大」。`Set₁` 的型別是 `Set₂`，也就是所有非常大型別
的型別，而它本身又是……如此類推：

```
-- true : Bool : Set : Set₁ : Set₂ : …
```

在 Agda 中，這個故事過去會一直延續到 `Setω`，但在 2021 年，universe 階層被擴充到第 (ω·2) 層。
:::


## 範例：常數

有了布林值的型別，我們就能引進簡單的常數：

```
our-first-constant : Bool
our-first-constant = true
```

不太刺激——沒有函數的話，我們只能選擇 `false` 與 `true` 這兩個平凡的右手邊。


## 範例：恆等函數

讓我們來實作第一個函數：恆等函數，它把每個輸入值映射到自己，也就是把 `false` 映射到 `false`、把 `true`
映射到 `true`。和 Haskell 一樣，也和大多數其他程式語言不同，定義函數不需要任何特殊的關鍵字。

以下是所需程式碼的樣板：

```
idBool : Bool → Bool   -- 輸入 `→` 請打 `\->`、`\to` 或 `\rightarrow`
idBool x = {--}x{--}

-- Tests
-- EX: idBool false ≡ false
-- EX: idBool true  ≡ true
```

在定義的右手邊，我們第一次遇到「hole」，也就是顯示為 `{!!}` 的佔位符。在 Agda 中，我們經常以互動的方式建構程式
或證明；hole 就是主要的互動點。在程式碼中插入問號 `?`，再用 `C-c C-l`（也就是 `Ctrl-c Ctrl-l`）重新載入檔案，
就能產生一個 hole。

請依照下面的提示完成第一個習題，實作恆等函數。

::: Hint :::
1. 點選 `Edit hole` 來啟動 Agda。
2. 按 `C-c C-l` 來啟用 hole。這裡以及接下來，`C-` 表示要按住 `Ctrl` 鍵。
3. 移動到 hole。
4. 在 hole 裡填入下列內容：`x`
5. 按 `C-c C-SPC`，確認你提出的 hole 內容型別正確。
6. 按 `C-c C-l` 請 Agda 重新載入檔案。接著你應該會看到慶祝用的彩帶動畫，確認這個習題已經解出來了。
:::

::: Aside :::
我們[很快就會討論](Padova2025-zh-TW.ProgrammingBasics.DependentFunctions.html)，如何實作一個同時適用於所有型別、
而不受限於型別 `Bool` 的恆等函數。
:::


## 範例：否定

第二個範例，來實作否定函數。它應該把 `false` 映射到 `true`，反之亦然：

```
not : Bool → Bool
-- Holify
not false = true
not true  = false

-- Tests
-- EX: not false ≡ true
-- EX: not true  ≡ false
```

和大多數其他程式語言不同，Agda 沒有內建的 `if` 關鍵字；取而代之，我們用 *pattern matching* 來按情況定義函數。
更棒的是，我們不必自己列出所有可能的情況；可以借助 Agda 的輔助功能替我們完成，做法請見提示。

::: Hint :::
1. 先在 `=` 符號左邊引進一個變數，也就是讓該行以 `not x` 開頭。
2. 用 `C-c C-l` 重新載入檔案，讓 hole 啟用。
3. 接著，確認游標在 hole 裡面，按 `C-c C-c`，並回答你想對變數 `x` 做 case split。
4. 最後，為每個情況填入定義。每個 hole 完成後，按 C-c C-SPACE。
5. 再次用 `C-c C-l` 請 Agda 重新載入檔案。接著你應該會看到彩帶動畫，表示習題已成功解出。
:::


## 執行函數

在黑板數學以及大多數程式語言中，以引數呼叫函數的通用語法是 `f(x)`，例如 `sin(π)`。Agda 遵循 lambda 演算與
Haskell 的傳統，改用（以空白分隔的）並置寫法 `f x`：

```
example-run : Bool
example-run = {--}not our-first-constant{--}
```

在這個 hole 裡填入 `not our-first-constant`，或是你自己選擇的更複雜的函數呼叫。接著按 `C-c C-v`，
輸入你想求值的運算式（此處是 `example-run`），就能觀察結果。

::: Aside :::
如果你是在本機執行 Agda，而不是使用嵌入在這個網頁裡的版本，那麼求值運算式的快捷鍵是 `C-c C-n`（「normalize」），
而不是 `C-c C-v`（「value」）。在瀏覽器中，`C-n` 被綁定為開啟新視窗。
:::
