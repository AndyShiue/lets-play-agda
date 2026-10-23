```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProvingBasics.Negation where
```

# 否定

在數理邏輯中，命題 $P$ 的否定 $\neg P$ 被定義為「假設 $P$ 會蘊涵矛盾」，也就是蘊涵式 $(P
\Rightarrow ↯)$。

要在 Agda 中採用這個定義，我們引進一個沒有任何居民的型別 `⊥`：

```
data ⊥ : Set where   -- 輸入 `⊥` 請打 `\bot`
-- 沒有建構子，所以型別 `⊥` 顯然是空的
```

因此，在 Agda 中證明否定 $\neg P$，意思就是建構一個函數，把 $P$ 的見證映射到 ↯ 的見證，也就是型別 `⊥` 的值。

我們也可以在 Agda 中引進否定符號：

```
infix 3 ¬_
¬_ : Set → Set  -- 輸入 `¬` 請打 `\neg`
¬ P = (P → ⊥)
```


## 習題：一不是偶數

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProvingBasics.EvenOdd
```

這是 `Even` 的定義的直接後果，但在這個階段仍然很有啟發性：數字 `one` 不是偶數。

```
one-not-even : Even one → ⊥
-- Holify
one-not-even ()
```

::: Hint :::
1. 照慣例，先在 `=` 符號左邊引進一個變數：
   `one-not-even p = {!!}`
2. 然後，同樣照慣例，按 `C-c C-c` 請 Agda 對 `p` 做 case split。
3. Agda 會發現沒有任何可能的情況，並用*空模式（empty pattern）* `()` 來表示這個觀察。
:::


## 習題：沒有同時為偶數與奇數的數字

```
even-and-odd : {a : ℕ} → Even a → Odd a → ⊥
-- Holify
even-and-odd (step-even p) (step-odd q) = even-and-odd p q
```


## 習題：沒有基底情形的歸納型別

讓我們考慮自然數定義的下列變體：

```
data Weird : Set where
  succ : Weird → Weird
```

型別 `Weird` 有多少個值？

::: More :::
給定型別 `Weird` 的一個居民 `x`，它唯一的建構子 `succ` 可以用來得到另一個居民 `succ x`。再套用一次 `succ`
又會得到另一個居民，依此類推。但我們一開始就沒有任何居民；建構子 `succ` 派不上用場；型別 `Weird` 是空的。

::: Aside :::
那無限的運算式 `succ (succ (succ (...)))` 呢？這個運算式不是表示型別 `Weird` 的一個值嗎？

不是——這樣不會終止的運算式，在資料型別中是不允許的。試試看：
```code
loop : Weird
loop = succ loop
```
對於所謂的*餘資料型別*（co-datatypes），某些特定種類的不終止運算式是可行的，但我們在這裡不討論它們。
:::

我們可以在 Agda 中這樣形式化這個觀察，表達下面的蘊涵：如果存在 `Weird` 的居民，就會導出矛盾。

```
Weird-is-empty : Weird → ⊥
-- Holify
Weird-is-empty (succ x) = Weird-is-empty x
```
:::


## 習題：Ex falso quodlibet

在古典邏輯與直覺主義邏輯中（但極小邏輯除外），從矛盾可以推出任何陳述。在 Agda 中，有一個對應的事實：
對任意型別 `A`，都有一個函數 `⊥ → A`：

```
⊥-elim : {A : Set} → ⊥ → A
-- Holify
⊥-elim ()
```


## 習題：無矛盾律

從 `A` 與 `¬ A` 我們可以推出矛盾：

```
contradiction : {A : Set} → A → ¬ A → ⊥
-- Holify
contradiction p f = f p
```


## 習題：雙重否定

在古典數學中，一個陳述的雙重否定 $\neg \neg A$ 與 $A$ 等價。建構性數學（Agda 的預設模式）讓我們看到更細緻的區別；
一般而言，$\neg \neg A$ 與 $A$ 並不等價。（我們之後會詳細探討這兩個陳述的差別。）

雖然在 Agda 中我們沒有 $\neg \neg A \Rightarrow A$（除非我們把這個原理加為公設），但反向的蘊涵是成立的。

```
dni : {A : Set} → A → ¬ ¬ A
-- Holify
dni x = λ k → k x
```

作為推論，三重否定蘊涵（因此也等價於）單重否定。

```
triple-to-one : {A : Set} → ¬ ¬ ¬ A → ¬ A
-- Holify
triple-to-one p = λ x → p (dni x)
```


## 習題：逆否

證明如果 `A` 蘊涵 `B`，則 `¬ B` 也蘊涵 `¬ A`：

```
contraposition : {A B : Set} → (A → B) → (¬ B → ¬ A)
-- Holify
contraposition f g p = g (f p)
```

反方向無法建構性地證明，因此在 Agda 的預設模式中不可用。
