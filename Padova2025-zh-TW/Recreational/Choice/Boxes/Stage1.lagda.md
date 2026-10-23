```
{-# OPTIONS --cubical-compatible #-}

open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.General
open import Padova2025-zh-TW.ProvingBasics.Connectives.Existential
open import Padova2025-zh-TW.ProvingBasics.Connectives.Conjunction
import Padova2025-zh-TW.Recreational.Choice.Boxes.Base as Base

module Padova2025-zh-TW.Recreational.Choice.Boxes.Stage1
  (ℝ : Set) (n : ℕ)
  (open Base ℝ n)
  (p : Player) where
```

# 階段 1

我們承諾完整檢視其他每位玩家的通道（lane）。

```
I : Set
I = Σ[ q ∈ Player ] q ≢ p × ℕ

their-box-indices : I → ℕ
their-box-indices (q , _ , m) = pack q m
```
