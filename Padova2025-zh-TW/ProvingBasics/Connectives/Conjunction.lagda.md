```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProvingBasics.Connectives.Conjunction where
```

# 合取

```
open import Agda.Primitive
open import Padova2025-zh-TW.ProvingBasics.Connectives.Existential
```

合取 `A and B` 的見證，應該由一個型別 `A` 的見證與一個型別 `B` 的見證組成，也就是說，合取的見證就是一對見證。
這只是前面介紹過的依值序對構造的特例。因此，對任意型別 `A` 與 `B`，我們引進笛卡兒積型別 `A × B`：

```
infixr 2 _×_
_×_ : {ℓ ℓ' : Level} → Set ℓ → Set ℓ' → Set (ℓ ⊔ ℓ')
A × B = Σ A (λ _ → B)
```

特別是，[`fst`](Padova2025-zh-TW.ProvingBasics.Connectives.Existential.html#Σ) 與
[`snd`](Padova2025-zh-TW.ProvingBasics.Connectives.Existential.html#Σ)
這兩個函數，對這些非依值的積也同樣適用。讓我們把這些函數匯出，供匯入本模組的使用者使用。

```
open Padova2025-zh-TW.ProvingBasics.Connectives.Existential using (fst; snd; _,_) public
```


## 習題：涉及合取的重言式

```
open import Padova2025-zh-TW.ProvingBasics.Negation
```

```
∧-comm : {A B : Set} → A × B → B × A
-- Holify
∧-comm (x , y) = (y , x)
```

```
∧-assoc : {A B C : Set} → (A × B) × C → A × (B × C)
-- Holify
∧-assoc ((x , y) , z) = (x , (y , z))
```

```
curry : {A B C : Set} → (A × B → C) → (A → (B → C))
-- Holify
curry f x y = f (x , y)
-- 或者：curry f = λx → λy → f (x , y)
```

```
uncurry : {A B C : Set} → (A → (B → C)) → (A × B → C)
-- Holify
uncurry f (x , y) = f x y
```

```
∧-map : {A A' B B' : Set} → (A → A') → (B → B') → A × B → A' × B'
-- Holify
∧-map f g (x , y) = (f x , g y)
```

```
∧-diag : {A : Set} → A → A × A
-- Holify
∧-diag x = (x , x)
```

```
∧-not : {A : Set} → A × ⊥ → ⊥
-- Holify
∧-not = snd
```

```
frobenius : {A B : Set} {P : A → Set} → ∃[ x ] (P x × B) → (∃[ x ] P x) × B
-- Holify
frobenius (x , (p , b)) = (x , p) , b
```


## 習題：De Morgan 定律

```
open import Padova2025-zh-TW.ProvingBasics.Connectives.Disjunction
```

驗證四條 De Morgan 定律中的下列三條。

```
de-morgan₁ : {A B : Set} → ¬ A × ¬ B → ¬ (A ⊎ B)
-- Holify
de-morgan₁ (f , g) (left  x) = f x
de-morgan₁ (f , g) (right y) = g y
```

```
de-morgan₂ : {A B : Set} → ¬ (A ⊎ B) → ¬ A × ¬ B
-- Holify
de-morgan₂ f = (λ x → f (left x)), (λ y → f (right y))
```

```
de-morgan₃ : {A B : Set} → ¬ A ⊎ ¬ B → ¬ (A × B)
-- Holify
de-morgan₃ (left  f) = λ (x , y) → f x
de-morgan₃ (right g) = λ (x , y) → g y
```

第四條 `¬ (A × B) → ¬ A ⊎ ¬ B` 會破壞建構性數學區分否定性斷言與肯定性斷言的細緻能力。由於 Agda 預設是建構性的系統，
第四條定律在 Agda 中無法證明。


## 習題：零和

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.NaturalNumbers
```

證明如果兩個自然數的和為零，則兩個加數都是零。

```
sum-zero : (a b : ℕ) → a + b ≡ zero → a ≡ zero × b ≡ zero
-- Holify
sum-zero zero     b p = refl , p
sum-zero (succ a) b ()
```
