```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProvingBasics.Equality.NaturalNumbers where
```

# 關於自然數的結果

```
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.General
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
```


## 習題：加法的結合律

```
+-assoc : (a b c : ℕ) → (a + b) + c ≡ a + (b + c)
-- Holify
+-assoc zero     b c = refl
+-assoc (succ a) b c = cong succ (+-assoc a b c)
```


## 習題：加法的交換律

建立交換律比建立結合律稍微複雜一點。請回想，加法的定義涉及一個有點任意的選擇：要對第一個還是第二個引數做 case split。
本習題中發展的交換律證明，其關鍵想法是證明另一種選擇也同樣行得通。

```
+-zero : (a : ℕ) → (a + zero) ≡ a
-- 這並非依定義成立，定義說的是 zero + b = b。
-- Holify
+-zero zero     = refl
+-zero (succ a) = cong succ (+-zero a)
```

```
+-succ : (a b : ℕ) → a + succ b ≡ succ (a + b)
-- 這並非依定義成立，定義說的是 succ a + b = succ (a + b)。
-- Holify
+-succ zero     b = refl
+-succ (succ a) b = cong succ (+-succ a b)
```

```
+-comm : (a b : ℕ) → a + b ≡ b + a
-- Holify
+-comm zero     b = sym (+-zero b)
+-comm (succ a) b =
  trans (cong succ (+-comm a b)) (sym (+-succ b a))
```


## 習題：兩種加倍的方式

```
two-+-+ : (a : ℕ) → a + a ≡ two · a
-- Holify
two-+-+ a = cong (a +_) (sym (+-zero a))
```


## 習題：分配律

```
·-distribʳ-+ : (a b c : ℕ) → (a + b) · c ≡ a · c + b · c
-- Holify
·-distribʳ-+ zero     b c = refl
·-distribʳ-+ (succ a) b c =
  trans (cong (c +_) (·-distribʳ-+ a b c)) (sym (+-assoc c (a · c) (b · c)))
```

提醒一下：這裡的證明勉強才讀得懂。等我們引進*等式推理（equational reasoning）*之後，就能用更容易理解的方式排版這個證明。


## 習題：一不是零，再訪

```
open import Padova2025-zh-TW.ProvingBasics.Negation
```

[我們先前曾非正式地論證過](Padova2025-zh-TW.ProvingBasics.Equality.FirstSteps.html#example-one-not-zero)，
不存在型別 `one ≡ zero` 的值。現在讓我們正式證明：如果有這樣的值，就會導出矛盾。

```
one≠zero : ¬ (one ≡ zero)
-- Holify
one≠zero ()
```

作為推論，證明並非對所有數字 `a`，`succ (pred a)` 都與 `a` 相同：

```
lemma-succ-pred : ((a : ℕ) → succ (pred a) ≡ a) → ⊥
lemma-succ-pred f = {--}one≠zero (f zero){--}
```

實際上，等式 $\mathrm{succ}(\mathrm{pred}(a)) = a$ 只對正數成立。請陳述並證明這個事實，並使用
[先前的謂詞 `IsPositive`](Padova2025-zh-TW.ProvingBasics.EvenOdd.html#IsPositive)。

```
open import Padova2025-zh-TW.ProvingBasics.EvenOdd
```

```
lemma-succ-pred' : (a : ℕ) → {--}IsPositive a{--} → succ (pred a) ≡ a
-- Holify
lemma-succ-pred' a (case-succ _) = refl
```


## 習題：後繼的單射性

證明後繼函數是單射：

```
succ-injective : {n m : ℕ} → succ n ≡ succ m → n ≡ m
-- Holify
succ-injective = cong pred
```


## 習題：左消去律

```
+-cancelₗ : (a x y : ℕ) → a + x ≡ a + y → x ≡ y
-- Holify
+-cancelₗ zero     x y p = p
+-cancelₗ (succ a) x y p = +-cancelₗ a x y (succ-injective p)
```


## 習題：加倍再減半

```
half-twice : (x : ℕ) → half (twice x) ≡ x
-- Holify
half-twice zero     = refl
half-twice (succ x) = cong succ (half-twice x)
```


## 習題：加倍後為偶數

陳述並證明：對每個數字 `a`，數字 [`twice a`](Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic.html#twice) 是偶數。

```
twice-even : (a : ℕ) → Even (twice a)
-- Holify
twice-even zero     = base-even
twice-even (succ a) = step-even (twice-even a)
```

::: Hint :::
1. 先在 `=` 符號前引進一個變數 `a`，然後用 `C-c C-l` 重新載入檔案，讓該行寫成 `twice-even a = {!!}`。
2. 接著用 `C-c C-c` 請 Agda 對變數 `a` 做 case split。
3. 移到第一個 hole 並按 `C-c ,` 取得情況的摘要。
4. 注意 `base-even` 符合需求（或者使用 Agda 的自動模式 `C-c C-a`）。按 `C-c C-SPACE` 完成。
5. 現在移到第二個 hole，用 `C-c ,` 檢視情況。
6. 認出我們被要求驗證形如 `succ (succ _)` 的數字是偶數。因此使用 `step-even` 建構子，在 hole 裡寫入 `step-even ?`，
   並按 `C-c C-SPACE`。
7. 在新的 hole 裡按 `C-c ,` 掌握變化後的情況。
8. 注意遞迴呼叫 `twice-even a`（在黑板數學中，這相當於引用歸納假設）符合需求。用 `C-c C-SPACE` 完成，接著按 `C-c C-l`。
:::

下面的習題類似，但更複雜。我們會需要 [`subst` 函數](Padova2025-zh-TW.ProvingBasics.Equality.General.html#subst)。

```
twice-even' : (a : ℕ) → Even (a + a)
-- Holify
twice-even' zero     = base-even
twice-even' (succ a) =
  subst Even lemma (step-even (twice-even' a))
  where
  lemma : succ (succ (a + a)) ≡ succ (a + succ a)
  lemma = cong succ (sym (+-succ a a))
```


## 習題：偶數為兩倍

反過來，讓我們證明偶數具有 `twice a` 的形式，更精確地說，讓我們證明：

```
even-twice : {x : ℕ} → Even x → x ≡ twice (half x)
-- Holify
even-twice base-even     = refl
even-twice (step-even p) = cong (λ a → succ (succ a)) (even-twice p)
```


## 習題：不可能的 twice 情況

```
impossible-twice : {x y : ℕ} → twice x ≡ succ (twice y) → ⊥
-- Holify
impossible-twice {succ x} {y} p = impossible-twice (sym (succ-injective p))
```


## 習題：twice 是一個同態

```
twice-homo : (x y : ℕ) → twice (x + y) ≡ twice x + twice y
-- Holify
twice-homo zero     y = refl
twice-homo (succ x) y = cong succ (cong succ (twice-homo x y))
```


## 習題：twice 的單射性

```
twice-injective : {x y : ℕ} → twice x ≡ twice y → x ≡ y
-- Holify
twice-injective {zero}   {zero}   p = p
twice-injective {succ x} {succ y} p = cong succ (twice-injective (succ-injective (succ-injective p)))
```


## 習題：兩個判定偶數的函數

```
open import Padova2025-zh-TW.ProgrammingBasics.Booleans
open import Padova2025-zh-TW.ProvingBasics.Equality.Booleans
```

回到[談決策程序的那一節](Padova2025-zh-TW.ProgrammingBasics.Naturals.DecisionProcedures.html)，我們討論過函數
`even? : ℕ → Bool`，它的目的是在輸入的數字是偶數時回傳 `true`，否則回傳 `false`。

我們至少可以想像 `even?` 的兩種實作：

```
even?₁ : ℕ → Bool
even?₁ zero            = true
even?₁ (succ zero)     = false
even?₁ (succ (succ n)) = even?₁ n

even?₂ : ℕ → Bool
even?₂ zero     = true
even?₂ (succ n) = not (even?₂ n)
```

在這個習題中，請驗證這兩種實作對所有輸入都得到相同的結果。

```
even?₁-even?₂ : (a : ℕ) → even?₁ a ≡ even?₂ a
-- Holify
even?₁-even?₂ zero            = refl
even?₁-even?₂ (succ zero)     = refl
even?₁-even?₂ (succ (succ a)) = trans (even?₁-even?₂ a) (sym (not² (even?₂ a)))
```
