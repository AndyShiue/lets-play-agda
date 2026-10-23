```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProvingBasics.Equality.Base where
```

# 定義

在黑板數學中，「$x = y$」是一個*斷言*，一個*陳述*。例如，這個斷言可能為真，也可能為假。在 Agda 社群中，
`x ≡ y` 是一個型別——`x` 與 `y` 相等的見證所成的型別。例如，這個型別可能有居民，也可能是空的。

如果在黑板數學中我們要證明 $x = y$，那麼在 Agda 中，我們要給出一個型別 `x ≡ y` 的值。

下面三行程式碼設定了這些型別：

```code
infix 4 _≡_
data _≡_ {X : Set} : X → X → Set where
  refl : {a : X} → a ≡ a
```

::: Aside :::
基本的等號 `=` 在 Agda 中只用於定義。要陳述涉及相等的假設或結果，我們使用 `≡`。
:::

::: More :::
在 Let's play Agda 後面的某些部分，我們不會採用前面的程式碼作為相等的正式定義，儘管它對我們幾乎所有的發展都足以勝任。
上面這個定義的問題在於，它只對*小*型別 `X`（也就是活在 `Set` 裡的型別）引進相等型別。但有時我們也想談論
更大型別（活在 `Set₁`、`Set₂` 或更高層）的值之間的相等。

```
open import Agda.Primitive

infix 4 _≡_
data _≡_ {ℓ : Level} {X : Set ℓ} : X → X → Set ℓ where
  refl : {a : X} → a ≡ a
```
:::
