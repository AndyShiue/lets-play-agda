```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProvingBasics.Termination.BoveCapretta.Fun91 where
```

# 91 函數

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
open import Padova2025-zh-TW.ProgrammingBasics.Lists
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Termination.Ordering
open import Padova2025-zh-TW.ProvingBasics.Termination.Gas
open import Padova2025-zh-TW.ProvingBasics.Connectives.Disjunction
open import Padova2025-zh-TW.ProvingBasics.Connectives.More
```

```
{-# BUILTIN NATURAL ℕ #-}
```

讓我們依循傳統，研究[著名的 91 函數](https://en.wikipedia.org/wiki/McCarthy_91_function)：

```code
f : ℕ → ℕ
f x with ≤-<-connex x 20
... | left  x≤20 = f (f (x + 11))
... | right x>20 = x ∸ 10
-- 原版用的是 `100`，而不是 `20`。
-- 這裡用較小的值，以減輕 Let's play Agda 伺服器的負擔。
```

由於巢狀遞迴，這個定義對終止性分析構成挑戰。這個函數是全函數，但這個事實對 Agda 的終止性檢查器來說並不明顯——
Agda 會拒絕這個定義，並給出「Termination checking failed」的訊息。


## 表示這個函數

要在 Agda 中表示這個函數，我們採用與
[前一個模組](Padova2025-zh-TW.ProvingBasics.Termination.BoveCapretta.Intricate0.html)相同的方法。

```
data Def : ℕ → Set
f₀ : (n : ℕ) → Def n → ℕ

data Def where
  gt20 : {n : ℕ} → n > 20 → Def n
  le20 : {n : ℕ} → n ≤ 20 → (p : Def (n + 11)) → Def (f₀ (n + 11) p) → Def n

f₀ n (gt20 _)     = n ∸ 10
f₀ n (le20 x p q) = f₀ (f₀ (n + 11) p) q
```


## 驗證全函數性

已經有人提出了證明 91 函數為全函數的巧妙方法。這裡我們想展示一種「暴力」方法。對於終止性不明顯的輸入 `0` 到 `20`，
我們不假思索地執行遞迴（並設有燃料（gas）上限），在沒有對函數行為有任何真正洞察的情況下，觀察到遞迴確實會終止。

```
observe-termination : (gas : ℕ) (n : ℕ) → Maybe (Def n)
observe-termination zero n = nothing
observe-termination (succ gas) n with ≤-<-connex n 20
... | right n>20 = just (gt20 n>20)
... | left n≤20  = do
  p ← observe-termination gas (n + 11)
  q ← observe-termination gas (f₀ (n + 11) p)
  just (le20 n≤20 p q)
```

對於下面這個 hole，[Padova2025-zh-TW.ProvingBasics.Termination.Gas 中的 `collect` 函數](Padova2025-zh-TW.ProvingBasics.Termination.Gas.html#collect)會很有用。

```
empirical-fact : All Def (downFrom 21)
empirical-fact = from-just {--}(collect (observe-termination 15) 21){--}
```

處理完困難的情況（以經驗的方式）之後，我們現在可以驗證全函數性了。

```
total : (n : ℕ) → Def n
total n with ≤-<-connex n 20
... | left  n≤20 = {--}lookup empirical-fact (succ-monotone n≤20){--}
... | right n>20 = {--}gt20 n>20{--}
```

有了全函數性的證明，我們也可以定義一個顯然為全函數的 91 函數版本。

```
f : ℕ → ℕ
f n = f₀ n (total n)
```


## 決定函數值

事實證明，91 函數的值與下面這個非遞迴定義的函數相同。

```
g : ℕ → ℕ
g x = max 21 x ∸ 10
```

我們想再次用暴力方法證明兩者一致。

```
observe-equality : (n : ℕ) → Maybe (f n ≡ g n)
observe-equality n with <-cmp (f n) (g n)
... | left  fn≡gn = just fn≡gn
... | right _     = nothing
```

```
empirical-fact' : All (λ (n : ℕ) → f n ≡ g n) (downFrom 21)
empirical-fact' = from-just {--}(collect observe-equality 21){--}
```

```
f≗g : (n : ℕ) → n ≤ 20 → f n ≡ g n
f≗g n n≤20 = lookup empirical-fact' (succ-monotone n≤20)
```
