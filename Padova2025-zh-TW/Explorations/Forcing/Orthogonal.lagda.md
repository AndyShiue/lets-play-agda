```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.Explorations.Forcing.Orthogonal where
```

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Lists
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.General
open import Padova2025-zh-TW.ProvingBasics.Termination.Ordering
open import Padova2025-zh-TW.ProvingBasics.Connectives.Disjunction
open import Padova2025-zh-TW.ProvingBasics.Connectives.Conjunction
open import Padova2025-zh-TW.ProvingBasics.Connectives.Existential
open import Padova2025-zh-TW.ProvingBasics.Connectives.More
```

# 正交強迫法

這是一項進行中的工作，目的是形式化一個反例，推翻「無串流集合（streamless sets）的笛卡兒積仍是無串流的」這個猜想。
**積極的開發正在[這個儲存庫](https://gitlab.com/iblech/streamless-sets)進行，等事情穩定下來，就會移植到這裡。**

```
Good : {X : Set} → (X → X → Set) → (ℕ → X) → Set
Good _≈_ f = ∃[ i ] ∃[ j ] i ≢ j × f i ≈ f j 
```

```code
key-lemma : (f : ℕ → ℕ) (n : ℕ) → Good _≡_ f ⊎ ∃[ i ] ∃[ j ] i ≢ j × (f i ≥ n × f j ≥ n)
key-lemma f n = {!!}
-- 證明想法：檢查 f 的前 n + 2 個值。
-- 小於 n 的數字只有 n 個。
-- 所以如果這些值全都相異，其中至少有兩個保證 ≥ n。
-- 否則就有重複。
```

```
data Cl {X : Set} (_≈_ : X → X → Set) : X → X → Set where
  ≈-base  : {a b : X} → a ≈ b → Cl _≈_ a b
  ≈-refl  : {a : X} → Cl _≈_ a a
  ≈-symm  : {a b : X} → Cl _≈_ a b → Cl _≈_ b a
  ≈-trans : {a b c : X} → Cl _≈_ a b → Cl _≈_ b c → Cl _≈_ a c
```

```
Cl' : {X : Set} → List (X × X) → (X → X → Set)
Cl' ps = Cl (λ a b → (a , b) ∈ ps)
```

```
_⫫_ : {X : Set} → (R S : X → X → Set) → Set
R ⫫ S = (a b : _) → R a b → S a b → a ≡ b
```

```
L : Set
L = List (ℕ × ℕ) × List (ℕ × ℕ)
```

```
data ∇ (P : L → Set) : L → Set where
  now    : {σ : L} → P σ → ∇ P σ
  laterₗ : {R S : List (ℕ × ℕ)} → (f : ℕ → ℕ) → ((R' S' : List (ℕ × ℕ)) → Good (Cl' (R ++ R')) f → ∇ P (R ++ R' , S ++ S')) → ∇ P (R , S)
  laterᵣ : {R S : List (ℕ × ℕ)} → (f : ℕ → ℕ) → ((R' S' : List (ℕ × ℕ)) → Good (Cl' (S ++ S')) f → ∇ P (R ++ R' , S ++ S')) → ∇ P (R , S)
```

```code
escape : {P : L → Set} (R S : List (ℕ × ℕ)) → Cl' R ⫫ Cl' S → ∇ P (R , S) → ∃[ R' ] ∃[ S' ] (Cl' R' ⫫ Cl' S') × P (R' , S')
escape = {!!}
```

```code
theorem : ¬ ∇ (λ (R , S) → ∃[ i ] ∃[ j ] i ≢ j × Cl' R i j × Cl' S i j) ([] , [])
theorem = {!!}
```
