```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ComputationalContent.Dickson where
```

# 案例研究：Dickson 引理

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProvingBasics.Connectives.Existential
open import Padova2025-zh-TW.ProvingBasics.Termination.Ordering
import Padova2025-zh-TW.ComputationalContent.DoubleNegation
import Padova2025-zh-TW.ComputationalContent.Fictions.Minima
```

本模組的目的，是給出（一個迷你版）Dickson 引理的建構性證明，並以一個在建構性上荒謬至極的斷言作為核心要素，
也就是宣稱每個函數 `ℕ → ℕ` 都有最小值。

Dickson 引理的基本形式說，對每個映射 `α : ℕ → ℕ`，存在一個數字 `i`，使得 `α i ≤ α (succ i)`。

古典證明的建構化，幾乎像魔法一樣進行：

```
Dickson : (ℕ → ℕ) → Set
Dickson α = Σ[ i ∈ ℕ ] α i ≤ α (succ i)
```

```
theorem : (α : ℕ → ℕ) → Dickson α
theorem α = escape do
  (i , p) ← minimum α
  q       ← p (succ i)
  return (i , q)
  where
  open Padova2025-zh-TW.ComputationalContent.DoubleNegation  (Dickson α)
  open Padova2025-zh-TW.ComputationalContent.Fictions.Minima (Dickson α)
-- 等價地：
-- theorem α = escape (minimum f ⟫= λ (i , p) → p (succ i) ⟫= λ fi≤fsucci → return (i , fi≤fsucci))
--   where
--   open Padova2025-zh-TW.ComputationalContent.DoubleNegation  (Dickson α)
--   open Padova2025-zh-TW.ComputationalContent.Fictions.Minima (Dickson α)
```


## 任意好的局部最小值

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
open import Padova2025-zh-TW.ProvingBasics.Connectives.More
open import Padova2025-zh-TW.ProgrammingBasics.Lists
```

映射 `α : ℕ → ℕ` 的 `k` 階近似最小值，是一個數字 `n`，使得對所有數字 `i < n` 都有 `α n ≤ α (i + n)`：

```
ApproximativeMinimum : (ℕ → ℕ) → ℕ → Set
ApproximativeMinimum α k = Σ[ n ∈ ℕ ] All (λ i → α n ≤ α (i + n)) (upTo k)
```

每個真正的最小值，對每個數字 `k` 來說也都是 `k` 階近似最小值。下面的習題說明，由
[`minimum` 函數](Padova2025-zh-TW.ComputationalContent.Fictions.Minima.html#minimum)計算出的動態最小值，
也會產生這樣的近似最小值。

```
arbitrarily-good-approximative-minimum : (α : ℕ → ℕ) (k : ℕ) → ApproximativeMinimum α k
-- Holify
arbitrarily-good-approximative-minimum α k = escape do
  (n , p) ← minimum α
  ps      ← sequence (tabulate (upTo k) λ {i} _ → p (i + n))
  return (n , ps)
  where
  open Padova2025-zh-TW.ComputationalContent.DoubleNegation  (ApproximativeMinimum α k)
  open Padova2025-zh-TW.ComputationalContent.Fictions.Minima (ApproximativeMinimum α k)
```
