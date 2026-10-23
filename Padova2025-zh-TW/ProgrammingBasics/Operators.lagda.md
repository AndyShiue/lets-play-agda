```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProgrammingBasics.Operators where
```

# 運算子

讓我們先匯入前一個模組的定義：

```
open import Padova2025-zh-TW.ProgrammingBasics.Booleans
```

`import` 關鍵字會載入對應的模組；`open` 則把它所有的定義帶進作用域。沒有 `open` 的話，
我們就得用 `Padova2025-zh-TW.ProgrammingBasics.Booleans.Bool` 來指稱布林值的型別。


## 範例：邏輯 AND

邏輯 AND 運算子可以在 Agda 中這樣定義：針對四種可能的情況，各指定一個子句。

```
and : Bool → Bool → Bool
and false false = false
and false true  = false
and true  false = false
and true  true  = true
```

::: Aside :::
從黑板數學來看，我們可能會預期型別簽名寫成 `and : Bool × Bool → Bool`。目前先不必擔心這個問題，
就把所顯示的語法當作 Agda 引進雙參數函數的方式。我們之後會看到一個[令人滿意的解釋](https://zh.wikipedia.org/zh-tw/%E6%9F%AF%E9%87%8C%E5%8C%96)。
:::

下面是這個運算子的使用方式：

```
example-usage : Bool
example-usage = and false (and true false)
```

這段程式碼看起來有點像 Lisp。我們可以把函數改名為 `_&&_`，更貼近黑板上的記法。在語意上沒有任何改變；
在語法上，底線表示函數 `_&&_` 應該當成中綴運算子使用，引數分別放在左右兩側。

```
infixr 6 _&&_
_&&_ : Bool → Bool → Bool
false && false = false
false && true  = false
true  && false = false
true  && true  = true
```

::: Aside :::
這段程式碼的第一行 `infixr 6 _&&_` 是可選的，只是用來告訴 Agda 我們的新運算子結合得有多緊。例如，
之後我們會給 `_+_` 優先順序 6、給 `_*_` 優先順序 `7`，這樣 `a + b * c` 這類運算式才會被正確地解析成
`a + (b * c)`，而不是錯誤的 `(a + b) * c`。
:::

接著我們可以把 `example-usage` 改寫如下。

```
example-usage' : Bool
example-usage' = false && (true && false)
```


## 習題：邏輯 OR

同樣地，實作邏輯 OR 運算子。

```
infixr 5 _||_
_||_ : Bool → Bool → Bool
false || y = {--}y{--}
true  || y = {--}true{--}

-- Tests
-- EX: (false || false) ≡ false
-- EX: (false || true)  ≡ true
-- EX: (true  || false) ≡ true
-- EX: (true  || true)  ≡ true
```


## 習題：更好的邏輯 AND 定義

上面提供的 `_&&_` 定義過於複雜。我們其實不需要四個定義子句，兩個就夠了。請找出這個更短的替代定義。

```
_&&'_ : Bool → Bool → Bool
-- Holify
_&&'_ false y = false
_&&'_ true  y = y

-- Tests
module _ where private
  open import Padova2025-zh-TW.ProvingBasics.Equality.Base

  test₁ : (y : Bool) → (false &&' y) ≡ false
  test₁ y = refl

  test₂ : (y : Bool) → (true &&' y) ≡ y
  test₂ y = refl
```

::: Aside :::
根據經驗法則，情況區分越少的函數定義越好，因為這樣的定義能讓我們寫出更短的證明，Agda 也能把 term 化簡得更徹底。
例如，雖然對每個 `y` 的值，`false && y` 都是 `false`，但這個事實對 Agda 來說並不顯而易見，需要另外證明。
相較之下，對 `_&&'_` 來說，這個恆等式是一目了然的。
:::
