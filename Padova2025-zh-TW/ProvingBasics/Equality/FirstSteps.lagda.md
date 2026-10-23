```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProvingBasics.Equality.FirstSteps where
```

# 相等的第一步

```
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
```


## 範例：我們的第一批恆等式

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
```

有了相等的定義，我們就能陳述並證明 `zero` 等於 `zero`：

```
zero-equals-zero : zero ≡ zero
zero-equals-zero = refl
```

用完全相同的方式，我們可以陳述並證明 `two + two` 等於 `four`：

```
grande-teorema : two + two ≡ four
-- 完整加上括號就是：grande-teorema : ((two + two) ≡ four)
grande-teorema = refl
```

我們恰好可以在下列情況使用 `refl`：所謂恆等式的兩邊*顯然相等*（manifestly equal），也就是說，只需要展開所有定義並
透過計算化簡，不需要任何真正的洞察，就能確信兩者相等。

例如，由於 `zero + b` [依定義](Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic.html#_+_)就等於 `b`，
下面的證明可以使用 `refl`：

```
trivial : (b : ℕ) → zero + b ≡ b
-- 完整加上括號：trivial : (b : ℕ) → ((zero + b) ≡ b)
trivial b = refl
```

這段程式碼（和所有 Agda 程式碼一樣！）既可以從邏輯的意義來讀，也可以從計算的意義來讀：

> （邏輯上的解讀） \
> 「trivial」是這個結果：對每個數字 `b`，`zero + b` 等於 `b`。
>
> （計算上的解讀） \
> 「trivial」是一個函數，讀入一個數字 `b` 作為輸入，並輸出 `zero + b` 等於 `b` 的見證。

`a + zero` 等於 `a` 這件事也是真的。然而，這個恆等式並非*依定義*成立；它需要一個
[不平凡的（歸納）論證](Padova2025-zh-TW.ProvingBasics.Equality.NaturalNumbers.html#+-zero)。
因此，在下面的嘗試中，Agda 會拒絕 `refl`：

```code
nontrivial : (a : ℕ) → a + zero ≡ a
nontrivial a = refl
-- ERROR:
-- a + zero != a of type ℕ
-- when checking that the expression refl has type a + zero ≡ a
```


## 範例：一不是零

`one` 並不等於 `zero`。確實，下面這段 Agda 程式碼中的 hole 無法被填上：

```code
outrageous : one ≡ zero
outrageous = ?
```

理解為什麼會這樣是很有啟發性的。歸根結柢，要建構型別 `one ≡ zero` 的居民，我們必須使用這個型別的一個建構子。
但唯一的建構子是 `refl`。這個建構子只會給我們型別 `x ≡ x` 的元素，其中兩邊在字面上完全相同。
但 `succ zero` 依定義是一個全新鑄造的自然數，與 `zero` 相異。

填上這個 hole 的唯一辦法，就是改變 `≡` 的定義。例如，我們可以加入一個建構子 `bailout`：

```
data _≡'_ {X : Set} : X → X → Set where
  refl    : {x   : X} → x ≡' x
  bailout : {x y : X} → x ≡' y

outrageous' : one ≡' zero
outrageous' = bailout
```


## 習題：後繼的前驅

證明一個數的後繼的前驅，又是原來的那個數。

```
lemma-pred-succ : (a : ℕ) → pred (succ a) ≡ a
lemma-pred-succ a = {--}refl{--}
```


## 單元測試

如果某個定義在開發的其餘部分都不會用到，Agda 支援給它一個可重複使用的虛設名稱「`_`」。Agda 社群用這個功能，
把預期的結果記錄成經過嚴格驗證的單元測試，而不是僅僅把範例寫在註解裡。

```
_ : twice two ≡ four
_ = refl
```

