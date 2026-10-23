```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProgrammingBasics.HigherOrder where
```

# 高階函數

```
open import Padova2025-zh-TW.ProgrammingBasics.Booleans
open import Padova2025-zh-TW.ProgrammingBasics.Operators
```

::: Todo ::
待補：加入簡介。
:::


## 習題：一元重言式

實作一個函數 `is-tautology₁?`，檢查給定的輸入函數是否恆為真。

例如，對於由 `f x = x` 定義的函數 `f`，`is-tautology₁ f` 的結果應該是 `false`。

```
is-tautology₁ : (Bool → Bool) → Bool
is-tautology₁ f = {--}f false && f true
-- 還有下面這個更費解的解法：
-- is-tautology₁ f = f (f false){--}

-- Tests
-- EX: is-tautology₁ (λ x → x)     ≡ false
-- EX: is-tautology₁ (λ x → false) ≡ false
-- EX: is-tautology₁ not           ≡ false
-- EX: is-tautology₁ (λ x → true)  ≡ true
```

<!--
TODO: Exercises about...
- verifying that is-tautology₁ does what it should do
- verifying the clever solution "f (f false)"
-->


## 習題：二元重言式

實作一個函數 ``is-tautology₂?``，檢查給定的二元輸入函數是否恆為真。

例如，對於由 `f x y = true` 定義的函數 `f`，`is-tautology₂ f` 的結果應該是 `true`。

```
is-tautology₂ : (Bool → Bool → Bool) → Bool
is-tautology₂ f = {--}is-tautology₁ (f false) && is-tautology₁ (f true){--}

-- Tests
-- EX: is-tautology₂ _&&_            ≡ false
-- EX: is-tautology₂ _&&'_           ≡ false
-- EX: is-tautology₂ _||_            ≡ false
-- EX: is-tautology₂ (λ x y → x)     ≡ false
-- EX: is-tautology₂ (λ x y → y)     ≡ false
-- EX: is-tautology₂ (λ x y → not x) ≡ false
-- EX: is-tautology₂ (λ x y → not y) ≡ false
-- EX: is-tautology₂ (λ x y → true)  ≡ true
-- TODO：檢查全部 2^4 種情況
```


## 習題：型別是一等公民的值

大多數靜態型別的程式語言，都嚴格區分值（只存在於執行期）與型別（只存在於編譯期，並在產生的機器碼中被抹除）。
在 Agda 中，型別本身就是值——它們是型別 `Set` 的值——因此我們可以自由地操作它們。

例如，定義一個函數 `Endo`，它輸入一個型別 `X`，輸出由 `X` 到 `X` 的函數所成的型別 `X → X`：

```
Endo : Set → Set
Endo X = {--}X → X{--}

-- Tests
module _ where private
  open import Agda.Primitive
  data _≡_ {ℓ : Level} {X : Set ℓ} : X → X → Set ℓ where
    refl : {x : X} → x ≡ x

  test : (X : Set) → Endo X ≡ (X → X)
  test X = refl
```


## 習題：函數的合成

實作一個高階函數，它輸入兩個可合成的函數，輸出它們的合成。

```
infixr 9 _∘_
_∘_ : {X Y Z : Set} → (Y → Z) → (X → Y) → (X → Z)
-- Holify
_∘_ g f = λ x → g (f x)

-- Tests
-- EX: not ∘ not ≡ λ x → not (not x)
```
