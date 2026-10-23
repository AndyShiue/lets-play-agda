```
{-# OPTIONS --cubical-compatible #-}

open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
open import Padova2025-zh-TW.ProgrammingBasics.Lists
open import Padova2025-zh-TW.ProvingBasics.Negation
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.General
open import Padova2025-zh-TW.ProvingBasics.Equality.NaturalNumbers
open import Padova2025-zh-TW.ProvingBasics.Connectives.Disjunction
open import Padova2025-zh-TW.ProvingBasics.Connectives.Existential
open import Padova2025-zh-TW.ProvingBasics.Connectives.Conjunction
open import Padova2025-zh-TW.ProvingBasics.Connectives.More
open import Padova2025-zh-TW.ProvingBasics.Termination.Ordering
open import Padova2025-zh-TW.Explorations.Pigeonhole

module Padova2025-zh-TW.Recreational.Choice.Boxes.Base (ℝ : Set) (n : ℕ) where
```

# 簡介

一隻邪惡的怪物準備了一個祕密房間，裡面有無限多個不透明的盒子。盒子以自然數編號，每個盒子裡都有一個怪物所選的實數。

邪惡的怪物一個接一個地，私下把一個由 `n` 位數學家組成的團隊中的成員帶進房間，其他成員則在外面等候。在房間裡，
每位數學家可以打開任意多個盒子，甚至無限多個，檢視它們的內容。他們可以根據目前為止看到的內容，決定接著要開哪些盒子。
唯一的要求是，他們必須讓自己選擇的一個盒子保持未被碰觸：怪物會要求他們猜那個盒子的內容。

數學家們作為團隊獲勝，若且唯若至多有一個人猜錯。照例，團隊成員之間只能在事前溝通。連續兩次進入房間之間，
房間會被重置為原本的狀態（所以所有被打開的盒子都會再度關上）。

```
Config : Set
Config = ℕ → ℝ
```

```
Player : Set
Player = Fin n
```

```
∅ : ℕ → Set
∅ _ = ⊥
```

```
infixl 5 _▷_
_▷_ : {I : Set} → (ℕ → Set) → (I → ℕ) → (ℕ → Set)
Opened ▷ xs = λ x → Opened x ⊎ ∃[ i ] xs i ≡ x
```

對謂詞 `Opened : ℕ → Set`，型別 `PlayerStrategy Opened` 是所有有效策略的型別，所謂有效，是指不會對已經被打開的盒子提出猜測。

```
data PlayerStrategy (Opened : ℕ → Set) : Set₁ where
  guess : (x : ℕ) → ¬ Opened x → ℝ → PlayerStrategy Opened
  peek  : {I : Set} → (xs : I → ℕ) → ((I → ℝ) → PlayerStrategy (Opened ▷ xs)) → PlayerStrategy Opened
```

```
guessesCorrectly : {Opened : ℕ → Set} → PlayerStrategy Opened → Config → Set
guessesCorrectly (guess x _ y) c = y ≡ c x
guessesCorrectly (peek xs k)   c = guessesCorrectly (k (λ i → c (xs i))) c
```

```
TeamStrategy : Set₁
TeamStrategy = Player → PlayerStrategy ∅
```

```
isSuccessful : TeamStrategy → Set
isSuccessful s
  = (c : Config)
  → (q q' : Player) → ¬ guessesCorrectly (s q)  c → ¬ guessesCorrectly (s q') c
  → q ≡ q'
```


## 通道（lane）算術

```
pack : Player → ℕ → ℕ
pack p zero     = toℕ p
pack p (succ m) = n + pack p m

pack-≥ : (p : Player) (m : ℕ) → pack p (succ m) ≥ n
pack-≥ p m = +-inflationaryₗ n (pack p m)

pack-injective : {q q' : Player} {m m' : ℕ} → pack q m ≡ pack q' m' → q ≡ q' × m ≡ m'
pack-injective {q} {q'} {zero}   {zero}    eq = toℕ-injective eq , refl
pack-injective {q} {q'} {zero}   {succ m'} eq = ⊥-elim (<-irreflexive' (≤-trans (pack-≥ q' m') (≡⇒≤ (sym eq))) (toℕ-bounded q))
pack-injective {q} {q'} {succ m} {zero}    eq = ⊥-elim (<-irreflexive' (≤-trans (pack-≥ q m) (≡⇒≤ eq)) (toℕ-bounded q'))
pack-injective {q} {q'} {succ m} {succ m'} eq with pack-injective (+-cancelₗ n _ _ eq)
... | q≡q' , m≡m' = q≡q' , cong succ m≡m'
```

```
insert : (j : ℕ) → (Σ[ i ∈ ℕ ] i ≢ j → ℝ) → ℝ → Config
insert j c x i with eq? i j
... | left  _   = x
... | right i≢j = c (i , i≢j)
```

```
insert-≗* : (j : ℕ) → (c : Config) → (x : ℝ) → insert j (λ (i , _) → c i) x ≗* c
insert-≗* j c x = j ∷ [] , go
  where
  go : (i : ℕ) → insert j (λ (i , _) → c i) x i ≡ c i ⊎ i ∈ (j ∷ [])
  go i with eq? i j
  ... | left  refl = right (here refl)
  ... | right _    = left refl
```

TODO
引用 Gabay–O'Connor 以及 Hardin & Taylor
