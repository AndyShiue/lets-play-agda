```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.Explorations.Bertrand where
```

# Bertrand 公設

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
open import Padova2025-zh-TW.ProgrammingBasics.Lists
open import Padova2025-zh-TW.ProvingBasics.Negation
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Connectives.Disjunction
open import Padova2025-zh-TW.ProvingBasics.Connectives.Existential
open import Padova2025-zh-TW.ProvingBasics.Connectives.Conjunction
open import Padova2025-zh-TW.ProvingBasics.Connectives.More
open import Padova2025-zh-TW.ProvingBasics.Termination.Ordering
open import Padova2025-zh-TW.ProvingBasics.Termination.Gas
```

Bertrand 公設是數論中的一個基本結果。它說的是：對每個正自然數 $n$，都存在質數 $p$ 滿足 $n < p ≤ 2n$。
這個事實的[標準證明](https://zh.wikipedia.org/zh-tw/%E4%BC%AF%E7%89%B9%E5%85%B0-%E5%88%87%E6%AF%94%E9%9B%AA%E5%A4%AB%E5%AE%9A%E7%90%86)分兩步進行：第一，對於 $n ≥ 427$ 的數，
給出一個涉及二項式係數的論證。第二，對於有限多個 $n < 427$ 的數，直接用暴力法檢查命題，不需要特定的數學洞察。

在這個模組中，我們的目標是在 Agda 中形式化第二步，因為相較於典型的概念性證明，它是令人耳目一新的節奏轉換。
（Thiago Felicissimo 與 Frédéric Blanqui 提供了一個正確但難以閱讀的
[完整證明](https://github.com/Deducteam/matita_lib_in_agda/blob/master/matita-arithmetics-chebyshev-bertrand.agda)，
那是一個[把非直謂的 Matita 系統中的證明機械地翻譯到直謂的 Agda 的案例研究](https://arxiv.org/abs/2308.15465)。）

首先，讓我們形式化這個命題。


## 命題的形式化

```
-- `a ∣ b` 表示 `a` 整除 `b`。
_∣_ : ℕ → ℕ → Set
a ∣ b = b % a ≡ zero
-- 另一種（也許更好的）表述是：
-- a | b = Σ[ k ∈ ℕ ] b ≡ k · a

-- `IsPrime p` 表示 `p` 是質數。
IsPrime : ℕ → Set
IsPrime p = (p ≥ two) × All (λ k → k > zero → k ∣ p → k ≡ one) (downFrom p)

-- `BertrandClaim n` 表示存在一個質數，它大於 `n`
-- 且至多為 `2 · n`（或者 `n` 為零）。
BertrandClaim : ℕ → Set
BertrandClaim n = (n ≡ zero) ⊎ ∃[ p ] (n < p × p ≤ twice n × IsPrime p)
```


## 決策程序與部分決策程序

型別 `Dec X` 的值會判定 `X`：要嘛提供 `X` 的一個居民，要嘛提供不存在這種居民的見證。整除性、質數性、
在給定上界之下存在質數：這些全都是可判定的。但在接下來的內容中，我們有時會滿足於*部分決策程序*，
也就是要嘛回傳見證、要嘛讓事情保持未決的函數。我們這麼做，既是為了減少證明義務的數量，也是為了好玩，藉此探索這種可判定性的近似。

```
dec-∣ : (a b : ℕ) → Dec (a ∣ b)
-- Holify
dec-∣ a b = b % a ≟ zero
```

```
dec-trivial-divisor : (p k : ℕ) → Dec (k > zero → k ∣ p → k ≡ one)
-- Holify
dec-trivial-divisor p k = dec-→ (dec-< zero k) (dec-→ (dec-∣ k p) (k ≟ one))
```

```
prime? : (p : ℕ) → Maybe (IsPrime p)
prime? p with dec-≤ two p | dec-All (dec-trivial-divisor p) (downFrom p)
... | yes two≤p | yes f = {--}just (two≤p , f){--}
... | _         | _     = {--}nothing{--}
```

```
bertrand₀? : (n p : ℕ) → Maybe (n < p × p ≤ twice n × IsPrime p)
bertrand₀? n p with dec-< n p | dec-≤ p (twice n) | prime? p
... | yes n<p | yes p≤2n | just f = {--}just (n<p , p≤2n , f){--}
... | _       | _        | _      = {--}nothing{--}
```

下面的函數，是
[Padova2025-zh-TW.ProvingBasics.Connectives.More 中的 `find`](Padova2025-zh-TW.ProvingBasics.Connectives.More.html#find)
的類比，只不過針對的是部分可判定性，而不是完全可判定性。

```
find' : {A : Set} {P : A → Set} → ((x : A) → Maybe (P x)) → (xs : List A) → Maybe (Any P xs)
-- Holify
find' P? [] = nothing
find' P? (x ∷ xs) with P? x | find' P? xs
... | just px  | _       = just (here px)
... | nothing  | just q  = just (there q)
... | nothing  | nothing = nothing
```

```
bertrand? : (n : ℕ) → Maybe (BertrandClaim n)
bertrand? n with n ≟ zero | find' (bertrand₀? n) (downFrom (succ (twice n)))
... | yes n≡zero | _       = {--}just (left n≡zero){--}
... | no  n≢zero | just f  = {--}just (right (satisfied f)){--}
... | no  n≢zero | nothing = {--}nothing{--}
```


## 以經驗觀察命題

我們想要證明下面的結果。

```code
claim : (n : ℕ) → n < 427 → BertrandClaim n
```

函數 `bertrand?` 對任意輸入 `n` 計算出型別 `Maybe (BertrandClaim n)` 的值，而且——根據 Bertrand 公設——這些值實際上都具有
`just _` 的形式。Agda 可以對每個特定的數字 `n` 驗證這個事實，只要不假思索地求值 `bertrand? n`；但（在帶有 `--safe` 的 Agda 中）
對於變數 `n : ℕ` 的一般情形，我們無法剝掉 `just` 建構子，因為不存在函數 `unsafeFromJust : {A : Set} → Maybe A → A`。

要繼續，我們先把部分決策程序對前 427 個數字的所有肯定判定，
[收集](Padova2025-zh-TW.ProvingBasics.Termination.Gas.html#collect)成一個 `All` 結構。

```
claim? : Maybe (All BertrandClaim (downFrom ten))
claim? = collect bertrand? ten
-- 這裡其實應該放 427，但為了減輕 Let's play Agda 伺服器的負擔，改用 10。
```

我們沒有提供 `claim?` 具有 `just _` 形式的理由。但它確實是，而且當我們把 `claim?` 放進下面的 hole 時，Agda 會驗證這個單一事實：

```
empirical-fact : All BertrandClaim (downFrom ten)
empirical-fact = from-just {--}claim?{--}
```

接著我們就可以用這個結構來證明命題。

```
claim : (n : ℕ) → n < ten → BertrandClaim n
claim n n<10 = lookup empirical-fact n<10
```

要進一步探索，請在下面的 hole 裡放入你最喜歡的、小於十的數字，然後按 `C-c C-v` 執行 `example`，就會印出一個質數，
它大於你的數字，且至多是你的數字的兩倍。

```
fav : ℕ
fav = {--}four{--}

example : BertrandClaim fav
example = claim fav fav<ten
  where
  fav<ten = {--}from-just (Dec→Maybe (dec-< fav ten)){--}
```
