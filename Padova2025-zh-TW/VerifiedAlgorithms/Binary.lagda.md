```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.VerifiedAlgorithms.Binary where
```

# 案例研究：自然數的二進位表示

我們以一元方式定義了自然數，由 `zero` 與 `succ` 自由生成 ℕ；這種做法在邏輯上令人愉悅，但在計算上缺乏效率。
讓我們引進自然數的二進位表示，在二進位表示上定義基本的算術運算，然後證明這些運算相對於一元模型是正確的。

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
open import Padova2025-zh-TW.ProgrammingBasics.Booleans
open import Padova2025-zh-TW.ProgrammingBasics.Lists
open import Padova2025-zh-TW.ProvingBasics.Negation
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.General
open import Padova2025-zh-TW.ProvingBasics.Equality.NaturalNumbers
open import Padova2025-zh-TW.ProvingBasics.Equality.Reasoning.Core
```

二進位表示就是由零與一組成的串列（允許前導零）：

```
BitString : Set
BitString = List Bool
```

例如，我們把數字 12（二進位 `1100`）表示為 `false ∷ false ∷ true ∷ true ∷ []`，也就是最低有效位元放在最前面。
每個位元串都表示某個自然數：

```
decode : BitString → ℕ
-- Holify
decode []           = zero
decode (false ∷ xs) = twice (decode xs)
decode (true  ∷ xs) = succ (twice (decode xs))

-- Tests
-- EX: decode [] ≡ zero
-- EX: decode (false ∷ true  ∷ []) ≡ two
-- EX: decode (true  ∷ true  ∷ []) ≡ three
-- EX: decode (true  ∷ false ∷ []) ≡ one
```


## 習題：二進位後繼

實作位元串上的後繼運算，然後證明它相對於模型是正確的。

```
succᵇ : BitString → BitString
-- Holify
succᵇ []           = true  ∷ []
succᵇ (false ∷ xs) = true  ∷ xs
succᵇ (true  ∷ xs) = false ∷ succᵇ xs

-- Tests
-- EX: succᵇ (false ∷ true ∷ []) ≡ true ∷ true ∷ []
-- EX: succᵇ (true  ∷ true ∷ []) ≡ false ∷ false ∷ true ∷ []
```

```
succᵇ-correct : (xs : BitString) → decode (succᵇ xs) ≡ succ (decode xs)
-- Holify
succᵇ-correct []           = refl
succᵇ-correct (false ∷ xs) = refl
succᵇ-correct (true  ∷ xs) = begin
  decode (succᵇ (true ∷ xs))      ≡⟨⟩
  decode (false ∷ succᵇ xs)       ≡⟨⟩
  twice (decode (succᵇ xs))       ≡⟨ cong twice (succᵇ-correct xs) ⟩
  twice (succ (decode xs))        ≡⟨⟩
  succ (succ (twice (decode xs))) ≡⟨⟩
  succ (decode (true ∷ xs))       ∎
```


## 習題：編碼自然數

實作一個函數，把給定的自然數編碼成位元串，然後證明你的實作是正確的。

```
encode : ℕ → BitString
-- Holify
encode zero     = []
encode (succ x) = succᵇ (encode x)
```

::: Hint :::
上面的函數 `succᵇ` 可能會派上用場。
:::

```
decode-encode : (x : ℕ) → decode (encode x) ≡ x
-- Holify
decode-encode zero     = refl
decode-encode (succ x) = trans (succᵇ-correct (encode x)) (cong succ (decode-encode x))
```


## 習題：二進位表示的唯一性

每個自然數都有無限多種二進位表示，因為我們總是可以在末端補上零。讓我們證明，末端的零是二進位表示不唯一的唯一來源。

為此，我們先定義一個謂詞 `AllZero : BitString → Set`，表達給定的位元串全部由零組成。想想這要怎麼做，
然後看一看下面的參考定義。

::: More :::
```
data AllZero : BitString → Set where
  triv : AllZero []
  cons : {xs : BitString} → AllZero xs → AllZero (false ∷ xs)
```
:::

有了謂詞 `AllZero`，我們就能定義兩個位元串等價是什麼意思：

```
infix 4 _≈_
data _≈_ : BitString → BitString → Set where
  base : {xs ys : BitString} → AllZero xs → AllZero ys → xs ≈ ys
  -- 「等價，因為兩個字串都只由零組成。」

  cons : {xs ys : BitString} {b : Bool} → xs ≈ ys → b ∷ xs ≈ b ∷ ys
  -- 「等價，因為兩個字串的最低位數字相同，
  -- 接著再以等價的方式繼續。」
```

作為熱身，讓我們證明等價的位元串表示同一個自然數。

```
decode-allZero : {xs : BitString} → AllZero xs → decode xs ≡ zero
-- Holify
decode-allZero triv     = refl
decode-allZero (cons p) = cong twice (decode-allZero p)
```

```
decode-≈ : {xs ys : BitString} → xs ≈ ys → decode xs ≡ decode ys
-- Holify
decode-≈ (base p q)           = trans (decode-allZero p) (sym (decode-allZero q))
decode-≈ (cons {b = false} p) = cong twice (decode-≈ p)
decode-≈ (cons {b = true}  p) = cong succ (cong twice (decode-≈ p))
```

現在讓我們證明，表示同一個數字的位元串是等價的。

```
unique-zero : {xs : BitString} → decode xs ≡ zero → AllZero xs
-- Holify
unique-zero {[]}         p = triv
unique-zero {false ∷ xs} p = cons (unique-zero (twice-zero p))
  where
  twice-zero : {x : ℕ} → twice x ≡ zero → x ≡ zero
  twice-zero p = twice-injective p
```

```
unique : {xs ys : BitString} → decode xs ≡ decode ys → xs ≈ ys
-- Holify
unique {[]}         {ys}         p = base triv (unique-zero (sym p))
unique {x     ∷ xs} {[]}         p = base (unique-zero p) triv
unique {false ∷ xs} {false ∷ ys} p = cons (unique (twice-injective p))
unique {false ∷ xs} {true  ∷ ys} p = ⊥-elim (impossible-twice p)
unique {true  ∷ xs} {false ∷ ys} p = ⊥-elim (impossible-twice (sym p))
unique {true  ∷ xs} {true  ∷ ys} p = cons (unique (twice-injective (succ-injective p)))
```


## 習題：二進位加法

實作位元串上的加法運算，然後證明它相對於一元模型是正確的。

```
addᵇ : BitString → BitString → BitString
-- Holify
addᵇ []           ys           = ys
addᵇ (x ∷ xs)     []           = x ∷ xs
addᵇ (false ∷ xs) (y ∷ ys)     = y ∷ addᵇ xs ys
addᵇ (true  ∷ xs) (false ∷ ys) = true ∷ addᵇ xs ys
addᵇ (true  ∷ xs) (true  ∷ ys) = false ∷ succᵇ (addᵇ xs ys)
```

```
addᵇ-correct : (xs ys : BitString) → decode (addᵇ xs ys) ≡ decode xs + decode ys
-- Holify
addᵇ-correct [] ys = refl
addᵇ-correct (x ∷ xs) [] = sym (+-zero (decode (x ∷ xs)))
addᵇ-correct (false ∷ xs) (false ∷ ys) = begin
  decode (addᵇ (false ∷ xs) (false ∷ ys))   ≡⟨⟩
  decode (false ∷ addᵇ xs ys)               ≡⟨⟩
  twice (decode (addᵇ xs ys))               ≡⟨ cong twice (addᵇ-correct xs ys) ⟩
  twice (decode xs + decode ys)             ≡⟨ twice-homo (decode xs) (decode ys) ⟩
  twice (decode xs) + twice (decode ys)     ≡⟨⟩
  decode (false ∷ xs) + decode (false ∷ ys) ∎
addᵇ-correct (false ∷ xs) (true ∷ ys) = begin
  decode (addᵇ (false ∷ xs) (true ∷ ys))       ≡⟨⟩
  decode (true ∷ addᵇ xs ys)                   ≡⟨⟩
  succ (twice (decode (addᵇ xs ys)))           ≡⟨ cong succ (cong twice (addᵇ-correct xs ys)) ⟩
  succ (twice (decode xs + decode ys))         ≡⟨ cong succ (twice-homo (decode xs) (decode ys)) ⟩
  succ (twice (decode xs) + twice (decode ys)) ≡˘⟨ +-succ (twice (decode xs)) (twice (decode ys)) ⟩
  twice (decode xs) + succ (twice (decode ys)) ≡⟨⟩
  decode (false ∷ xs) + decode (true ∷ ys)     ∎
addᵇ-correct (true ∷ xs) (false ∷ ys) = begin
  decode (addᵇ (true ∷ xs) (false ∷ ys))       ≡⟨⟩
  decode (true ∷ addᵇ xs ys)                   ≡⟨⟩
  succ (twice (decode (addᵇ xs ys)))           ≡⟨ cong succ (cong twice (addᵇ-correct xs ys)) ⟩
  succ (twice (decode xs + decode ys))         ≡⟨ cong succ (twice-homo (decode xs) (decode ys)) ⟩
  succ (twice (decode xs) + twice (decode ys)) ≡⟨⟩
  succ (twice (decode xs)) + twice (decode ys) ≡⟨⟩
  decode (true ∷ xs) + decode (false ∷ ys)     ∎
addᵇ-correct (true ∷ xs) (true ∷ ys) = begin
  decode (addᵇ (true ∷ xs) (true ∷ ys))               ≡⟨⟩
  decode (false ∷ succᵇ (addᵇ xs ys))                 ≡⟨⟩
  twice (decode (succᵇ (addᵇ xs ys)))                 ≡⟨ cong twice (succᵇ-correct (addᵇ xs ys)) ⟩
  twice (succ (decode (addᵇ xs ys)))                  ≡⟨ cong twice (cong succ (addᵇ-correct xs ys)) ⟩
  twice (succ (decode xs + decode ys))                ≡⟨⟩
  succ (succ (twice (decode xs + decode ys)))         ≡⟨ cong succ (cong succ (twice-homo (decode xs) (decode ys))) ⟩
  succ (succ (twice (decode xs) + twice (decode ys))) ≡˘⟨ cong succ (+-succ (twice (decode xs)) (twice (decode ys))) ⟩
  succ (twice (decode xs) + succ (twice (decode ys))) ≡⟨⟩
  succ (twice (decode xs)) + succ (twice (decode ys)) ≡⟨⟩
  decode (true ∷ xs) + decode (true ∷ ys)             ∎
```


## 習題：二進位加法的交換律

讓我們在不使用自然數加法的交換律的前提下，檢查 `addᵇ` 是可交換的：

```
addᵇ-comm : (xs ys : BitString) → addᵇ xs ys ≡ addᵇ ys xs
-- Holify
addᵇ-comm []           []           = refl
addᵇ-comm []           (y     ∷ ys) = refl
addᵇ-comm (x     ∷ xs) []           = refl
addᵇ-comm (false ∷ xs) (false ∷ ys) = cong (false ∷_) (addᵇ-comm xs ys)
addᵇ-comm (false ∷ xs) (true  ∷ ys) = cong (true ∷_)  (addᵇ-comm xs ys)
addᵇ-comm (true  ∷ xs) (false ∷ ys) = cong (true ∷_)  (addᵇ-comm xs ys)
addᵇ-comm (true  ∷ xs) (true  ∷ ys) = cong (false ∷_) (cong succᵇ (addᵇ-comm xs ys))
```

或者，我們也可以轉換到一元模型，並使用 `_+_` 的交換律：

```
addᵇ-comm' : (xs ys : BitString) → addᵇ xs ys ≈ addᵇ ys xs
-- Holify
addᵇ-comm' xs ys = unique
  (begin
    decode (addᵇ xs ys)   ≡⟨ addᵇ-correct xs ys ⟩
    decode xs + decode ys ≡⟨ +-comm (decode xs) (decode ys) ⟩
    decode ys + decode xs ≡˘⟨ addᵇ-correct ys xs ⟩
    decode (addᵇ ys xs)   ∎
   )
```

作為趣聞，我們可以重新推導出一元模型中加法的交換律：轉換到二進位表示，並使用 `addᵇ` 的交換律：

```
+-comm' : (x y : ℕ) → x + y ≡ y + x
-- Holify
+-comm' x y = begin
  x + y                                 ≡˘⟨ cong₂ _+_ (decode-encode x) (decode-encode y) ⟩
  decode (encode x) + decode (encode y) ≡˘⟨ addᵇ-correct (encode x) (encode y) ⟩
  decode (addᵇ (encode x) (encode y))   ≡⟨ cong decode (addᵇ-comm (encode x) (encode y)) ⟩
  decode (addᵇ (encode y) (encode x))   ≡⟨ addᵇ-correct (encode y) (encode x) ⟩
  decode (encode y) + decode (encode x) ≡⟨ cong₂ _+_ (decode-encode y) (decode-encode x) ⟩
  y + x                                 ∎
```
