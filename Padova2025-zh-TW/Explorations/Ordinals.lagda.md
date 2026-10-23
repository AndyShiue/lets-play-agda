```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.Explorations.Ordinals where
```

# 比無窮還大的數

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProvingBasics.Negation
open import Padova2025-zh-TW.ProvingBasics.Connectives.Disjunction
open import Padova2025-zh-TW.ProvingBasics.Connectives.Existential
open import Padova2025-zh-TW.ProvingBasics.Connectives.Conjunction
open import Padova2025-zh-TW.ProvingBasics.Termination.Gas using (𝟙; tt)
```

::: Todo :::
待補：粗略的草稿，要整理成形。並大力讚揚 https://arxiv.org/abs/2208.03844，本說明就是以它為基礎。
:::

集合論的一句關鍵格言是：*永不停止，繼續前進。* *序數*就是這句格言的絕佳例證，它是支援無限大數字的幾種記數系統之一
（其他著名的有基數與超實數）。

序數是這樣開始的：

> 0, 1, 2, 3, 4, ...

然而，和自然數不同，我們接著並不停止。我們繼續：

> 0, 1, 2, 3, 4, …, ω

所以 ω 是第一個無限數。但它不是最後一個，因為我們繼續：

> 0, 1, 2, 3, 4, …, ω, ω + 1, ω + 2, …

應該有一個比所有這些都大的數嗎？遵循格言，當然應該有：

> 0, 1, 2, 3, 4, …, ω, ω + 1, ω + 2, ..., ω + ω = ω · 2

現在提高我們的巡航速度，跳過無限多個數，我們最終得到下面這些生物：

> ω · ω = ω², ω³, ω⁴, ω<sup>ω</sup>, ω<sup><sup>ω</sup></sup>,
> ω<sup>ω<sup>ω<sup>⋰</sup></sup></sup> = ε₀,
> ε₀<sup>ε₀<sup>ε₀<sup>⋰</sup></sup></sup> = ε₁,
> ε₁<sup>ε₁<sup>ε₁<sup>⋰</sup></sup></sup> = ε₂

這樣我們得到越來越多的 *epsilon 數*。得到 ε₀、ε₁、ε₂ 等等之後，我們繼續得到 ε<sub>ω</sub>、ε<sub>ε₀</sub>、
ε<sub>ε<sub>ε₀</sub></sub>，依此類推；仍然不停止，我們最終得到這個數

> ε<sub>ε<sub>ε<sub>⋱</sub></sub></sub> = ζ₀

而且我們還有很長的路要走。僅憑「加一」與「繼續前進」這兩個運算，從零出發，我們就已經得到了相當多的數。
（順帶一提，資深的集合論學者仍然認為它們微不足道：所有展示的數都只有可數多個前驅。）

若想巡遊序數更長的一段起始部分，我們推薦
[John Baez 的一篇文章](https://johncarlosbaez.wordpress.com/2016/06/29/large-countable-ordinals-part-1/)。

    ω 的圖：
      :-)   I  I  I  I  I  ...

    ω + 1 的圖：
           +------------------+
      :-)  |I  I  I  I  I  ...|  I
           +------------------+

    ω + ω + 1 的圖：
           +-------------+  +-------------+
      :-)  |I  I  I  ... |  |I  I  I  ... |  I
           +-------------+  +-------------+

    1 + ω 的圖：
      :-)   I  I  I  I  I  I  ...

    關於 ω + 1 與 1 + ω，我們知道些什麼？
    答：succ ω = ω + 1 > ω；   1 + ω = ω。

關於（可數）序數的三個基本信念是：

1. 零應該存在。
2. 每個數都應該有後繼。
3. 每個（嚴格遞增的）序列都應該有極限。

例如，ω 是下列序列的極限：

      0,   1,   2,  3, ...
      ||   ||   ||
      f 0  f 1  f 2

注意：ω 也是下列序列的極限：

      0,   1,   2,   4,   8,  16,  32, ...
      ||   ||   ||   ||   ||
      g 0  g 1  g 2  g 3  g 4

我們以互相遞迴的方式同時定義：序數（的表示）的型別 `O`、見證 `x` 嚴格小於 `y` 的型別 `x < y`、
見證 `x` 至多為 `y` 的型別 `x ≤ y`，以及對每個函數 `f : ℕ → O`，見證 `f` 是嚴格遞增序列的型別 `Monotonic f`。

```
infix 4 _≤_ _<_
data O : Set
data _≤_ : O → O → Set
_<_ : O → O → Set
Monotonic : (ℕ → O) → Set
```

```
Monotonic f = (n : ℕ) → f n < f (succ n)

data O where
  zer : O
  suc : O → O
  lim : (f : ℕ → O) → Monotonic f → O

x < y = suc x ≤ y

data _≤_ where
  ≤-zer      : {x : O} → zer ≤ x
  ≤-suc-mon  : {x y : O} → x ≤ y → suc x ≤ suc y
  ≤-trans    : {x y z : O} → x ≤ y → y ≤ z → x ≤ z
  ≤-cocone   : {f : ℕ → O} {fmon : Monotonic f} {x : O} {n : ℕ}
             → x ≤ f n → x ≤ lim f fmon
  ≤-limiting : {f : ℕ → O} {fmon : Monotonic f} {x : O}
             → ((n : ℕ) → f n ≤ x) → lim f fmon ≤ x
```

我們將在下面看到，`≤-trans` 建構子並不需要，不過證明並不特別短。


## 習題：基本性質

如果 `f` 的每一項都至多等於 `g` 中對應的項，那麼 `f` 的極限至多等於 `g` 的極限。

```
lim-mon
  : {f g : ℕ → O} {fmon : Monotonic f} {gmon : Monotonic g}
  → ((n : ℕ) → f n ≤ g n)
  → lim f fmon ≤ lim g gmon
-- Holify
lim-mon p = ≤-limiting (λ n → ≤-cocone (p n))
```

```
≤-refl : {x : O} → x ≤ x
-- Holify
≤-refl {zer}        = ≤-zer
≤-refl {suc x}      = ≤-suc-mon ≤-refl
≤-refl {lim f fmon} = lim-mon (λ a → ≤-refl)
```

```
id≤suc : {x : O} → x ≤ suc x
-- Holify
id≤suc {zer}     = ≤-zer
id≤suc {suc x}   = ≤-suc-mon id≤suc
id≤suc {lim f x} = ≤-limiting (λ n → ≤-trans id≤suc (≤-suc-mon (≤-cocone ≤-refl)))
```


## 習題：定義無窮

```
fromℕ : ℕ → O
fromℕ zero     = zer
fromℕ (succ n) = suc (fromℕ n)
```

```
fromℕ-mon : Monotonic fromℕ
-- Holify
fromℕ-mon n = ≤-refl
```

```
uno : O
uno = suc zer
```

```
ω : O
ω = lim fromℕ fromℕ-mon
```

```
ω' : O
ω' = lim (λ n → fromℕ (succ n)) {--}(λ n → ≤-refl){--}
```

```
example₀ : ω ≤ ω'
-- Holify
example₀ = lim-mon (λ n → id≤suc)
```

```
example₁ : ω' ≤ ω
-- Holify
example₁ = ≤-limiting (λ n → ≤-cocone {n = succ n} ≤-refl)
```


## 序數加法

我們以互相遞迴的方式，同時定義序數加法並證明序數加法的一個單調性結果。

```
infixl 6 _+_
_+_ : O → O → O
+-mon : {x a b : O} → a ≤ b → (x + a) ≤ (x + b)
```

下面是序數加法的定義。

```
a + zer        = a
a + suc b      = suc (a + b)
a + lim f fmon = lim (λ n → a + f n) (λ n → +-mon (fmon n))
```

現在請你填上所需的引理。

```
+-mon {b = zer} ≤-zer        = {--}≤-refl{--}
+-mon {b = suc b} ≤-zer      = {--}≤-trans id≤suc (≤-suc-mon (+-mon ≤-zer)){--}
+-mon {b = lim f fmon} ≤-zer = {--}≤-cocone (+-mon (≤-zer {f zero})){--}
+-mon (≤-trans p q)          = {--}≤-trans (+-mon p) (+-mon q){--}
+-mon (≤-suc-mon p)          = {--}≤-suc-mon (+-mon p){--}
+-mon (≤-cocone p)           = {--}≤-cocone (+-mon p){--}
+-mon (≤-limiting p)         = {--}≤-limiting (λ b → +-mon (p b)){--}
```


## 習題：無窮加一與一加無窮

```
example₂ : ω < ω + uno
-- Holify
example₂ = ≤-refl
```

```
example₃ : uno + ω ≤ ω
-- Holify
example₃ = ≤-limiting (λ n → ≤-cocone {n = succ n} (lemma n))
  where
  lemma : (n : ℕ) → suc zer + fromℕ n ≤ suc (fromℕ n)
  lemma zero     = ≤-refl
  lemma (succ n) = ≤-suc-mon (lemma n)
```


## 習題：加上零

```
+-zer : (x : O) → zer + x ≤ x
-- Holify
+-zer zer       = ≤-zer
+-zer (suc x)   = ≤-suc-mon (+-zer x)
+-zer (lim f x) = lim-mon (λ n → +-zer (f n))
```


## 習題：更一般的比較引理

下面定義的型別 `f simulates g` 包含這個斷言的見證：序列 `g` 中的每一項都被序列 `f` 中的某一項所支配。
例如，序列 `0, 1, 2, …` 模擬序列 `0, 1, 2, 4, 8, 16, …`（反之亦然）。

```
_simulates_ : (ℕ → O) → (ℕ → O) → Set
f simulates g = (a : ℕ) → ∃[ b ] g a ≤ f b
```

```
comparison-lemma
  : {f g : ℕ → O} {fmon : Monotonic f} {gmon : Monotonic g}
  → f simulates g → lim g gmon ≤ lim f fmon
-- Holify
comparison-lemma sim = ≤-limiting (λ n → ≤-cocone (snd (sim n)))
```

有了這個比較引理，我們就可以重新證明上面的 `lim-mon`：

```
lim-mon'
  : {f g : ℕ → O} {fmon : Monotonic f} {gmon : Monotonic g}
  → ((n : ℕ) → f n ≤ g n)
  → lim f fmon ≤ lim g gmon
lim-mon' p = comparison-lemma {--}(λ n → n , p n){--}
```


## 習題：序數的相等

型別 `O` 的元素不是序數，而是序數的（大多不唯一的）表示。因此，對許多用途而言，
自訂的等價關係比 `O` 的標準相等型別更合適：

```
infix 4 _≈_
_≈_ : O → O → Set
x ≈ y = x ≤ y × y ≤ x
```


## 習題：不等的直接描述

上面，我們以歸納的方式定義了 `_≤_`。這讓見證容易建構，但很難評估：對給定的序數（表示）`x` 與 `y`，
型別 `x ≤ y` 的見證是否存在。對這個任務來說，直接的描述更有用。

```
Code : O → O → Set
Code zer          y            = 𝟙
Code (suc x)      zer          = ⊥
Code (suc x)      (suc y)      = Code x y
Code (suc x)      (lim f fmon) = ∃[ n ] Code (suc x) (f n)
Code (lim f fmon) zer          = ⊥
Code (lim f fmon) (suc y)      = (k : ℕ) → Code (f k) (suc y)
Code (lim f fmon) (lim g gmon) = (k : ℕ) → ∃[ n ] Code (f k) (g n)
```

```
Code-refl : {x : O} → Code x x
-- Holify
Code-refl {zer}        = tt
Code-refl {suc x}      = Code-refl {x}
Code-refl {lim f fmon} = λ k → k , Code-refl {f k}
```

```
Code-suc : {x y : O} → Code x y → Code (suc x) (suc y)
-- Holify
Code-suc p = p
```

下面三個輔助函數需要互相遞迴地定義。下面沒有一個定義特別漂亮。我們需要硬幹過去。

```
Code-trans         : {x y z : O} → Code x y → Code y z → Code x z
Code-cocone        : {f : ℕ → O} {fmon : Monotonic f} {x : O} {n : ℕ} → Code x (f n) → Code x (lim f fmon)
Code-cocone-simple : {f : ℕ → O} {fmon : Monotonic f} {n : ℕ} → Code (f n) (lim f fmon)
```

```
Code-trans {zer}        {y}          {z}          p q       = {--}tt{--}
Code-trans {suc x}      {suc y}      {suc z}      p q       = {--}Code-trans {x} {y} {z} p q{--}
Code-trans {suc x}      {suc y}      {lim f fmon} p (n , q) = {--}n , Code-trans {suc x} {suc y} {f n} p q{--}
Code-trans {suc x}      {lim f fmon} {suc z}      (n , p) q = {--}Code-trans {suc x} {f n} {suc z} p (q n){--}
Code-trans {suc x}      {lim f fmon} {lim g gmon} (n , p) q = {--}fst (q n) , Code-trans {suc x} {f n} {g (fst (q n))} p (snd (q n)){--}
Code-trans {lim f fmon} {suc y}      {suc z}      p q       = {--}λ k → Code-trans {f k} {suc y} {suc z} (p k) q{--}
Code-trans {lim f fmon} {suc y}      {lim g gmon} p (n , q) = {--}λ k → n , Code-trans {f k} {suc y} {g n} (p k) q{--}
Code-trans {lim f fmon} {lim g gmon} {suc z}      p q       = {--}λ k → Code-trans {f k} {g (fst (p k))} {suc z} (snd (p k)) (q (fst (p k))){--}
Code-trans {lim f fmon} {lim g gmon} {lim h hmon} p q       = {--}λ k → fst (q (fst (p k))) , Code-trans {f k} (snd (p k)) (snd (q _)){--}
```

```
Code-cocone {x = zer}                p = {--}tt{--}
Code-cocone {x = suc x}              p = {--}_ , p{--}
Code-cocone {x = lim f fmon} {n = n} p = {--}λ k → n , Code-trans {x = f k} (Code-cocone-simple {f} {fmon} {k}) p{--}
```

```
Code-cocone-simple {f} {fmon} {n} = Code-cocone {f} {fmon} {f n} (Code-refl {f n})
```

```
Code-suc-inc-simple : {x : O} → Code x (suc x)
Code-suc-inc-simple {zer}        = {--}tt{--}
Code-suc-inc-simple {suc x}      = {--}Code-suc-inc-simple {x}{--}
Code-suc-inc-simple {lim f fmon} = {--}λ k → Code-trans {f k} {suc (f k)} {suc (lim f fmon)}
  (Code-suc-inc-simple {f k}) (Code-cocone-simple {f} {fmon} {k}){--}
```

```
toCode : {x y : O} → x ≤ y → Code x y
toCode ≤-zer = {--}tt{--}
toCode (≤-suc-mon p) = {--}toCode p{--}
toCode {x} (≤-trans p q) = {--}Code-trans {x} (toCode p) (toCode q){--}
toCode {x} (≤-cocone p) = {--}Code-cocone {x = x} (toCode p){--}
toCode {x} {zer} (≤-limiting {f} {fmon} p) = {--}Code-trans {suc (f zero)} {f one} (toCode (fmon zero)) (toCode (p one)){--}
toCode {x} {suc y} (≤-limiting {f} p) = {--}λ k → toCode {f k} {suc y} (p k){--}
toCode {x} {lim f fmon} (≤-limiting {g} {gmon} p) k with Code-trans {suc (g k)} {g (succ k)} (toCode (gmon k)) (toCode {g (succ k)} {lim f fmon} (p (succ k)))
... | (n , q) = {--}n , Code-trans {g k} {suc (g k)} (Code-suc-inc-simple {g k}) q{--}
```

```
fromCode : {x y : O} → Code x y → x ≤ y
fromCode {zer}        {y}          p       = {--}≤-zer{--}
fromCode {suc x}      {suc y}      p       = {--}≤-suc-mon (fromCode p){--}
fromCode {suc x}      {lim f fmon} (n , p) = {--}≤-cocone (fromCode p){--}
fromCode {lim f fmon} {suc y} p            = {--}≤-limiting λ n → fromCode (p n){--}
fromCode {lim f fmon} {lim g gmon} p       = {--}comparison-lemma (λ k → fst (p k) , fromCode (snd (p k))){--}
```

```
zer? : (x : O) → x ≈ zer ⊎ ¬ x ≈ zer
zer? zer          = {--}left  (≤-zer , ≤-zer){--}
zer? (suc x)      = {--}right λ p → toCode (fst p){--}
zer? (lim f fmon) = {--}right λ p → toCode (fst p){--}
```


## 與自然數及 ω 的乘法

這個運算的目的，是以比完整設立乘法更少的證明義務，幫助我們走到 `ε₀`。

```
infixl 7 _·ₙ_
_·ₙ_ : O → ℕ → O
x ·ₙ zero   = zer
x ·ₙ succ n = x ·ₙ n + x
```

```
≰0⇒≥1 : {x : O} → ¬ x ≤ zer → uno ≤ x
-- Holify
≰0⇒≥1 {zer}        p with p ≤-zer
... | ()
≰0⇒≥1 {suc x}      p = ≤-suc-mon ≤-zer
≰0⇒≥1 {lim f fmon} p = ≤-trans (≤-suc-mon ≤-zer) (≤-cocone (fmon zero))
```

```
·ₙ-mon : (x : O) → ¬ x ≤ zer → (n : ℕ) → x ·ₙ n < x ·ₙ succ n
·ₙ-mon x p n = +-mon {x ·ₙ n} {uno} {x} (≰0⇒≥1 p)
```

```
_·ω : O → O
x ·ω with zer? x
... | left  x≈zer = zer
... | right x≉zer = lim (λ n → x ·ₙ n) (·ₙ-mon x λ p → x≉zer (p , ≤-zer))
```


## 以 ω 為底的指數

::: Todo :::
待補：撰寫。
:::


<!--
## Ordinal multiplication

```code
infixl 7 _·_
_·_ : O → O → O
·-mon : {x a b : O} → a ≤ b → (x · a) ≤ (x · b)
```

```code
a · zer        = zer
a · suc b      = (a · b) + a
a · lim f fmon with zer? a
... | left  _ = zer
... | right _ = lim (λ n → a · f n) (λ n → {!!})
```

Now you are asked to fill in the required lemma.

```code
·-mon p = {!!}
```
-->


## 展望

除了這些使用序數的第一步之外，下面的專案也許很有意思。

- 定義序數乘法與指數，方法是實作 Wikipedia 序數算術頁面所列出的規則
- 定義序數 `ε₀`
- 陳述並證明 `ω ^ ε₀` 與 `ε₀` 相同
- 定義數 `ε₁`、`ε₂`、……

不要期待這些習題有簡短的解答——`lim` 建構子中的單調性要求會帶來相當多的證明義務。然而，我們不能拋掉這個要求，
否則指數就不再可定義：該定義需要一個情況區分，而這只有因為有單調性要求才可能。

下面這些里程碑式的論文包含了詳盡的討論，作者是 Tom de Jong、Nicolai Kraus、Fredrik Nordvall Forsberg 與 Chuangjie Xu：

- [Type-Theoretic Approaches to Ordinals](https://arxiv.org/abs/2208.03844)（序數的型別論做法）
- [Set-Theoretic and Type-Theoretic Ordinals Coincide](https://arxiv.org/abs/2301.10696)（集合論與型別論的序數是一致的）
- [Ordinal Exponentiation in Homotopy Type Theory](https://arxiv.org/abs/2501.14542)（同倫型別論中的序數指數）
