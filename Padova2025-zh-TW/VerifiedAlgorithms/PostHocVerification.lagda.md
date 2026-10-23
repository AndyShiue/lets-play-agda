```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.VerifiedAlgorithms.PostHocVerification where
```

# 事後驗證

```
open import Padova2025-zh-TW.ProgrammingBasics.Booleans
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.DecisionProcedures
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.General
open import Padova2025-zh-TW.ProvingBasics.Equality.NaturalNumbers
```

> *Beware of bugs in the above code; I have only proved it correct, not tried it.*（小心上面程式碼中的錯誤；我只證明了它是正確的，並沒有試過它。） \
> ―Donald Knuth

在*事後驗證*中，我們運用 Agda 的表達力與強度，來驗證（另外實作的）演算法的正確性。

例如，函數 [`eq? : ℕ → ℕ → Bool`](Padova2025-zh-TW.ProgrammingBasics.Naturals.DecisionProcedures.html#eq?)
的目的是判斷它的兩個輸入是否一致。但我們的實作真的達成這個目標了嗎？在沒有依值型別的一般程式語言中，我們可能會用特定的例子
（也許是[隨機產生的](https://jesper.sikanda.be/posts/quickcheck-intro.html)）來測試這個函數，或是仔細檢視實作，
也許請同事一起審查，……由於 Agda 型別系統的表達力，在 Agda 中我們可以改為形式化地證明其正確性。

::: Todo :::
待補：擴充。
:::

```
eq?-correct₁ : (x y : ℕ) → eq? x y ≡ true → x ≡ y
-- Holify
eq?-correct₁ zero     zero     p = refl
eq?-correct₁ (succ x) (succ y) p = cong succ (eq?-correct₁ x y p)
```

```
eq?-correct₂ : (x y : ℕ) → x ≡ y → eq? x y ≡ true
-- Holify
eq?-correct₂ zero zero p = refl
eq?-correct₂ (succ x) (succ y) p = eq?-correct₂ x y (succ-injective p)
```


## 習題：不等的決策程序之正確性

```
open import Padova2025-zh-TW.ProvingBasics.Termination.Ordering
```

```
≤?-correct₁ : (x y : ℕ) → ≤? x y ≡ true → x ≤ y
-- Holify
≤?-correct₁ zero     y        p = z≤n
≤?-correct₁ (succ x) (succ y) p = s≤s (≤?-correct₁ x y p)
```

```
≤?-correct₂ : (x y : ℕ) → x ≤ y → ≤? x y ≡ true
-- Holify
≤?-correct₂ x        y        z≤n     = refl
≤?-correct₂ (succ x) (succ y) (s≤s p) = ≤?-correct₂ x y p
```


## 習題：判定偶數的決策程序之正確性

```
open import Padova2025-zh-TW.ProvingBasics.EvenOdd
```

```
even?-correct₁ : (x : ℕ) → even? x ≡ true → Even x
-- Holify
even?-correct₁ zero            p = base-even
even?-correct₁ (succ (succ x)) p = step-even (even?-correct₁ x p)
```

```
even?-correct₂ : {x : ℕ} → Even x → even? x ≡ true
-- Holify
even?-correct₂ base-even     = refl
even?-correct₂ (step-even p) = even?-correct₂ p
```


## 習題：減法函數之正確性

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
```

```
∸-correct : (x y : ℕ) → x ≥ y → y + (x ∸ y) ≡ x
-- Holify
∸-correct x        zero     x≥y       = refl
∸-correct (succ x) (succ y) (s≤s x≥y) = cong succ (∸-correct x y x≥y)
```
