```
{-# OPTIONS --cubical-compatible #-}
open import Padova2025-zh-TW.ProvingBasics.Termination.WellFounded.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
```

本模組的目的，是在良基關係的脈絡下，給定一個稱為 `step` 的遞迴規則，提供由它得到的遞迴函數 `rec`，
並驗證它滿足該遞迴規則。

```
module Padova2025-zh-TW.ProvingBasics.Termination.WellFounded.Scheme
  {X : Set}
  (_<_ : X → X → Set)
  {A : X → Set}
  (step : (x : X) → ((y : X) → y < x → A y) → A x)
  (step-extensional : (x : X) (u v : (y : X) → y < x → A y) → ((y : X) (p : y < x) → u y p ≡ v y p) → step x u ≡ step x v)
  (wf : (x : X) → Acc _<_ x)
  where
```

# 一般遞迴方案

```
go : (x : X) → Acc _<_ x → A x
-- Holify
go x (acc f) = step x (λ y y<x → go y (f y<x))
```

```
rec : (x : X) → A x
rec x = go x (wf x)
```

```
go-extensional : (x : X) (p q : Acc _<_ x) → go x p ≡ go x q
-- Holify
go-extensional x (acc f) (acc g) = step-extensional
  x
  (λ y y<x → go y (f y<x))
  (λ y y<x → go y (g y<x))
  (λ y y<x → go-extensional y (f y<x) (g y<x))
```

::: Aside :::
假設有[函數外延性](Padova2025-zh-TW.Cubical.Issues.FunctionExtensionality.html)，我們可以（在不假設 `step-extensional` 的情況下）
驗證型別 `Acc _<_ x` 的任意兩個值都相等，從而只需用 `cong (go x)` 就能輕易推出 `go-extensional`。
函數外延性在標準 Agda 中不可用，但（除非我們引進自訂的公設）它也沒有被反駁。因此在實務上，
總是應該有辦法提供 `step-extensional`，即使這有點麻煩。
:::

```
rec-eq : (x : X) → rec x ≡ step x (λ y y<x → rec y)
-- Holify
rec-eq x with wf x
... | acc f = go-extensional x (acc f) (acc λ y<x → wf _)
```
