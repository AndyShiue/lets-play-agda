```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.Explorations.Uncountability.Applications where
```

# 應用

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Booleans
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.General
open import Padova2025-zh-TW.ProvingBasics.Negation
open import Padova2025-zh-TW.ProvingBasics.Connectives.Existential
import Padova2025-zh-TW.Explorations.Uncountability.Lawvere as L
```


## Cantor 空間的不可數性

不可數型別的一個首要例子是 Cantor 空間，也就是無窮二元序列的型別。

```
Cantor : Set
Cantor = ℕ → Bool
```

我們會在五種意義下證明它不可數。

```
-- 兩個函數相異的一種強概念。
_#_ : {A B : Set} → (A → B) → (A → B) → Set
f # g = ∃[ a ] f a ≢ g a
```

```
IsSplitSurjective : {A B : Set} → (A → B) → Set
IsSplitSurjective f = (y : _) → ∃[ x ] y ≡ f x
```

```
IsWeaklySplitSurjective : {A B : Set} → (B → B → Set) → (A → B) → Set
IsWeaklySplitSurjective _≈_ f = (y : _) → ∃[ x ] y ≈ f x
```

```
fixpoint-free : {x : Bool} → not x ≡ x → ⊥
-- Holify
fixpoint-free {false} ()
fixpoint-free {true}  ()
```

```
fixpoint-free' : ¬ (∃[ x ] not x ≡ x)
-- Holify
fixpoint-free' (x , eq) = fixpoint-free eq
```

下面是 Cantor 空間不可數這個結果的最強形式：對每個可能的枚舉 `f : ℕ → Cantor`，都存在一個序列 `α : Cantor`，
使得對每個數字 `n`，序列 `α` 與 `f n` 都在某個位置上不同。

```
uncountable₀ : (f : ℕ → Cantor) → Σ[ α ∈ Cantor ] ((n : ℕ) → α # f n)
-- Holify
uncountable₀ f = (λ i → not (f i i)) , (λ n → (n , fixpoint-free))
```

接著我們可以逐步減弱這個結果，得到更容易被辨識為不可數性斷言的陳述。

```
uncountable₁ : (f : ℕ → Cantor) → Σ[ α ∈ Cantor ] ¬ (∃[ n ] α ≗ f n)
-- Holify
uncountable₁ f with uncountable₀ f
... | α , p = α , λ (n , eq) → snd (p n) (eq (fst (p n)))
```

```
uncountable₂ : (f : ℕ → Cantor) → Σ[ α ∈ Cantor ] ¬ (∃[ n ] α ≡ f n)
-- Holify
uncountable₂ f with uncountable₁ f
... | α , p = α , λ (n , eq) → p (n , λ x → cong (λ g → g x) eq)
```

```
uncountable₁' : ¬ (Σ[ f ∈ (ℕ → Cantor) ] IsWeaklySplitSurjective _≗_ f)
-- Holify
uncountable₁' (f , weak-split-surjectivity) = fixpoint-free' (fix₀ weak-split-surjectivity)
  where
  open L f not
-- 或者，作為 uncountable₁ 的推論：
-- uncountable₁' (f , weak-split-surjectivity) with uncountable₁ f
-- ... | α , p = p (weak-split-surjectivity α)
```

```
uncountable₂' : ¬ (Σ[ f ∈ (ℕ → Cantor) ] IsSplitSurjective f)
-- Holify
uncountable₂' (f , split-surjectivity) = fixpoint-free' (fix₀ weak-split-surjectivity)
  where
  weak-split-surjectivity : IsWeaklySplitSurjective _≗_ f
  weak-split-surjectivity h = fst (split-surjectivity h) , λ n → cong (λ g → g n) (snd (split-surjectivity h))
  open L f not
-- 或者，作為 uncountable₂ 的推論：
-- uncountable₂' (f , split-surjectivity) with uncountable₂ f
-- ... | α , p = p (split-surjectivity α)
```


## Baire 空間的不可數性

```
Baire : Set
Baire = ℕ → ℕ
```

```
baire-uncountable₀ : (f : ℕ → Baire) → Σ[ α ∈ Baire ] ((n : ℕ) → α # f n)
-- Holify
baire-uncountable₀ f = (λ i → succ (f i i)) , (λ n → (n , succ-fixpoint-free))
  where
  succ-fixpoint-free : {x : ℕ} → succ x ≢ x
  succ-fixpoint-free ()
```


## 宇宙的不可數性

用類似的方法，我們也可以證明所有小型別所成的型別 `Set` 是不可數的。

Martín Escardó 已經[非常詳盡地](https://martinescardo.github.io/TypeTopology/LawvereFPT.html)探討過這個主題。
