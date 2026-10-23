```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProvingBasics.Equality.Booleans where
```

# 關於布林值的結果

```
open import Padova2025-zh-TW.ProgrammingBasics.Booleans
open import Padova2025-zh-TW.ProgrammingBasics.Operators
open import Padova2025-zh-TW.ProvingBasics.Negation
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.General
```


## 習題：False 不是 true

```
false≢true : false ≢ true
-- Holify
false≢true ()
```


## 習題：雙重否定

```
not² : (x : Bool) → not (not x) ≡ x
-- Holify
not² false = refl
not² true  = refl
```


## 習題：邏輯 AND 的交換律

```
&&-comm : (x y : Bool) → (x && y) ≡ (y && x)
-- Holify
&&-comm false false = refl
&&-comm false true  = refl
&&-comm true  false = refl
&&-comm true  true  = refl
```


## 重言式

[先前](Padova2025-zh-TW.ProgrammingBasics.HigherOrder.html)我們討論過一個函數
`is-tautology₁ : (Bool → Bool) → Bool`，目的是當且僅當第一個引數恆為 `true` 時回傳 `true`。
一個直截了當的實作如下：

```code
is-tautology₁ : (Bool → Bool) → Bool
is-tautology₁ f = f false && f true
```

然而，也可以有一個更費解的實作。

```
is-tautology₁' : (Bool → Bool) → Bool
is-tautology₁' f = f (f false)
```

讓我們驗證這個替代實作也運作正確。為此，我們先形式化「一個函數恆為 `true`」是什麼意思：

```
ConstantlyTrue : (Bool → Bool) → Set
ConstantlyTrue f = (x : Bool) → f x ≡ true
```

換句話說，型別 `ConstantlyTrue f` 的元素，是一個把每個輸入 `x : Bool` 映射到 `f x ≡ true` 的見證的函數。
接著我們就可以陳述並證明：若 `f` 恆為真，`is-tautology₁' f` 會正確地回傳 `true`：

```
part₁ : (f : Bool → Bool) → ConstantlyTrue f → is-tautology₁' f ≡ true
-- Holify
part₁ f p = p (f false)
```

反方向比較複雜。組織這個論證的一種方式，是先驗證一個輔助引理。

```
γ : (f : Bool → Bool) → (a : Bool) → f false ≡ a → f a ≡ true → ConstantlyTrue f
-- Holify
γ f false p q false = q
γ f false p q true  with trans (sym p) q
... | ()
γ f true  p q false = p
γ f true  p q true  = q
```

```
part₂ : (f : Bool → Bool) → is-tautology₁' f ≡ true → ConstantlyTrue f
part₂ f = {--}γ f (f false) refl{--}
```

::: Aside :::
這種組織論證的方式要歸功於 Martín Escardó，他曾
[非常詳盡地](https://martinescardo.github.io/TypeTopology/Various.RootsOfBooleanFunctions.html)探討過這個主題。
:::
