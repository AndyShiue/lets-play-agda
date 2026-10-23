```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic where
```

# 算術

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
```

除了自然數的定義之外，接下來很自然的一步是定義基本的算術。例如，加倍函數可以用 pattern matching 這樣定義。

```
twice : ℕ → ℕ
twice zero     = zero
twice (succ x) = succ (succ (twice x))
```

一個更複雜的例子是加法：

```
infixl 6 _+_
_+_ : ℕ → ℕ → ℕ
zero   + b = b
succ a + b = succ (a + b)
```

和[運算子](Padova2025-zh-TW.ProgrammingBasics.Operators.html)那一節一樣，加法函數名稱中的底線讓我們能把它當成中綴運算子使用。

定義中第二個子句的右手邊，直接取自[皮亞諾公理（Peano axioms）](https://zh.wikipedia.org/zh-tw/%E7%9A%AE%E4%BA%9A%E8%AF%BA%E5%85%AC%E7%90%86)。
要對第一個引數做 case split（如上所示），還是對第二個引數做，大多是品味問題。如果你熟悉高中數學的定律、
但不熟悉皮亞諾公理，可以這樣得到這個定義：

```
-- （直觀上，以黑板數學的方式）
-- succ a + b = (1+a) + b = 1 + (a+b) = succ (a + b)
```

為了健全性檢查，在下面的 hole 裡放一些範例計算（例如 `two + two`），並用 `C-c C-v` 驗證結果是否符合你的預期：

```
example-computation : ℕ
example-computation = {--}two + two{--}
```


## 習題：減半

定義一個函數 `half`，把輸入除以二，必要時無條件捨去。例如 `half four` 應該化約為 `two`，
`half three` 應該化約為 `one`。

```
half : ℕ → ℕ
-- Holify
half zero            = zero
half (succ zero)     = zero
half (succ (succ n)) = succ (half n)

-- Tests
-- EX: half zero ≡ zero
-- EX: half (succ (succ (succ zero))) ≡ succ zero
-- EX: half (succ (succ (succ (succ zero)))) ≡ succ (succ zero)
-- EX: half (succ (succ (succ (succ (succ zero))))) ≡ succ (succ zero)
-- EX: half (succ (succ (succ (succ (succ (succ zero)))))) ≡ succ (succ (succ zero))
```

::: Aside :::
我們也可以把 `half` 的型別簽名寫成這樣：

```code
half : (x : ℕ) → ℕ
```

當我們希望結果型別（這裡是 `ℕ`）依賴於輸入值 `x` 時，這種風格特別有用。這種語法讓人聯想到 20 世紀初使用的
全稱量詞記法：我們現在寫成「$\forall(x \in X).\ \ldots$」的東西，過去寫成「$(x \in X)\ (\ldots)$」，
例如「$(x \in ℕ)\ (y \in ℕ)\ ((x+y)² = x² + 2xy + y²)$」。
而且確實，函數會對*每個輸入*指派某個輸出，所以模仿全稱量詞的記法是合理的。
:::


## 習題：前驅

實作前驅函數。為了簡單起見，我們約定 `zero` 的前驅還是 `zero`（而不是引進負數或錯誤處理）。

```
pred : ℕ → ℕ
-- Holify
pred zero     = zero
pred (succ x) = x

-- Tests
-- EX: pred zero ≡ zero
-- EX: pred four ≡ three
```

::: Aside :::
同樣地，我們也可以把型別簽名寫成 `pred : (x : ℕ) → ℕ`。
:::


## 習題：減法

定義（截斷式的）減法。例如 `one ∸ one` 與 `one ∸ two` 的結果都應該是 `zero`。

```
infixl 6 _∸_
_∸_ : ℕ → ℕ → ℕ  -- 輸入 `∸` 請打 `\.-`
a      ∸ zero   = {--}a{--}
zero   ∸ succ b = {--}zero{--}
succ a ∸ succ b = {--}a ∸ b{--}

-- Tests
-- EX: (one  ∸ one)   ≡ zero
-- EX: (one  ∸ two)   ≡ zero
-- EX: (four ∸ zero)  ≡ four
-- EX: (four ∸ one)   ≡ three
-- EX: (four ∸ two)   ≡ two
-- EX: (four ∸ three) ≡ one
-- EX: (four ∸ four)  ≡ zero
```


## 習題：乘法與指數

定義乘法與指數運算。

```
infixl 7 _·_
_·_ : ℕ → ℕ → ℕ  -- 輸入 `·` 請打 `\cdot`
zero   · b = {--}zero{--}
succ a · b = {--}b + (a · b){--}

-- Tests
-- EX: (two · three) ≡ succ (succ (succ (succ (succ (succ zero)))))
```


## 習題：平方

定義平方，但不使用下面才會引進的指數運算子。

```
infixr 8 _²
_² : ℕ → ℕ
_² x = {--}x · x{--}

-- Tests
-- EX: two ²   ≡ four
-- EX: three ² ≡ four + four + one
```

::: Aside :::
我們可以把平方化約成指數運算來定義，也就是定義 `x ² = x ^ 2`。這個替代的定義會給出與這裡預期的定義相同的結果，
而且我們之後就能在 Agda 中陳述並證明這個事實。不過，有時候我們會希望 `x ²` *依定義*就等於 `x · x`，
而不是*靠一個不平凡的證明*才相等。我們之後會再回頭談[這個細微之處](Padova2025-zh-TW.ProvingBasics.Equality.Base.html)。
:::


## 習題：指數

```
infixr 8 _^_
_^_ : ℕ → ℕ → ℕ
a ^ zero   = {--}one{--}
a ^ succ b = {--}a · (a ^ b){--}

-- Tests
-- EX: (two ^ three) ≡ succ (succ (succ (succ (succ (succ (succ (succ zero)))))))
```


## 習題：最大值

定義一個函數 `max`，回傳兩個輸入中的最大值。例如 `max one four` 應該是 `four`。

```
max : ℕ → ℕ → ℕ
-- Holify
max zero     b        = b
max (succ a) zero     = succ a
max (succ a) (succ b) = succ (max a b)

-- Tests
-- EX: max three four ≡ four
-- EX: max four  one  ≡ four
```
