```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProvingBasics.Termination.BoveCapretta.Intricate0 where
```

# 一個錯綜複雜的零函數

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.General
```

讓我們考慮下面這個遞迴函數定義。

```code
f : ℕ → ℕ
f zero     = zero
f (succ x) = f (f x)
```

Agda 會拒絕這個定義，並給出「Termination checking failed」的訊息。Agda 的終止性檢查器完全不知道遞迴呼叫 `f (f x)` 中的
`f x` 最後會是什麼值。但即使這個事實對 Agda 來說並不明顯，這個遞迴呼叫確實會終止，而函數 `f` 恆為零。本節的目標，
是用 Agda 能接受的方式表示這個函數，然後驗證它是全函數。


## 表示這個函數

要在 Agda 中表示這個函數，我們先藉由歸納–遞迴（induction-recursion）引進一個謂詞 `Def` 與一個函數 `f₀`。
對數字 `n`，`Def n` 表示 `n` 屬於定義域，也就是說，遞迴在輸入 `n` 時會終止。函數 `f₀` 接受兩個輸入：
一個數字 `n` 以及一個「遞迴在輸入 `n` 時會終止」的見證，並計算出遞迴的結果。

```
data Def : ℕ → Set
f₀ : (n : ℕ) → Def n → ℕ

data Def where
  base : Def zero
  step : {x : ℕ} → (p : Def x) → Def (f₀ x p) → Def (succ x)

f₀ zero     _          = zero
f₀ (succ x) (step p q) = f₀ (f₀ x p) q
```

作為熱身，我們可以證明數字 `zero`、`one`、`two` 與 `three` 確實屬於定義域：

```
defined-on-input-zero : Def zero
-- Holify
defined-on-input-zero = base
```

```
defined-on-input-one : Def one
defined-on-input-one = step {--}defined-on-input-zero{--} {--}defined-on-input-zero{--}
```

```
defined-on-input-two : Def two
-- Holify
defined-on-input-two = step defined-on-input-one defined-on-input-zero
```

```
defined-on-input-three : Def three
-- Holify
defined-on-input-three = step defined-on-input-two defined-on-input-zero
```


## 有條件地求值這個函數

在 `n` 屬於函數定義域的假設下，我們可以證明輸入 `n` 時的值為零：

```
all0 : (n : ℕ) → (p : Def n) → f₀ n p ≡ zero
-- Holify
all0 zero     p          = refl
all0 (succ n) (step p q) = all0 (f₀ n p) q
```


## 驗證全函數性

`all0` 所表達的洞察，足以推出這個函數在所有輸入上都有定義。

```
total : (n : ℕ) → Def n
-- Holify
total zero     = base
total (succ n) = step (total n) (subst Def (sym (all0 n (total n))) base)
```

有了全函數性，我們終於可以這樣定義 `f`。

```
f : ℕ → ℕ
f n = f₀ n (total n)
```


## 驗證定義等式

我們也可以驗證定義等式成立：

```
Def-prop : {x : ℕ} → (p q : Def x) → p ≡ q
-- Holify
Def-prop base base = refl
Def-prop (step p p') (step q q') with p | Def-prop p q
... | .q | refl = cong (step q) (Def-prop p' q')
-- 或者，借助 {-# BUILTIN EQUALITY _≡_ #-} 啟用的語法糖：
-- Def-prop (step p p') (step q q') rewrite Def-prop p q
--   = cong (step q) (Def-prop p' q')
```

```
f₀-extensional : (x : ℕ) (p q : Def x) → f₀ x p ≡ f₀ x q
-- Holify
f₀-extensional x p q = cong (f₀ x) (Def-prop p q)
```

```
f-eq : (x : ℕ) → f (succ x) ≡ f (f x)
f-eq x = f₀-extensional (f x) _ _
```
