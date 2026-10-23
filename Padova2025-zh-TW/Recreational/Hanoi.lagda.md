```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.Recreational.Hanoi where
```

# 河內塔

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Vectors
open import Padova2025-zh-TW.ProvingBasics.Negation
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.General
open import Padova2025-zh-TW.ProvingBasics.Connectives.Conjunction
open import Padova2025-zh-TW.ProvingBasics.Connectives.Existential
open import Padova2025-zh-TW.ProvingBasics.Connectives.More using (Dec; yes; no)
```

有限多個圓盤堆疊在柱子 `A` 上。它們應該被移動到另一根柱子 `C` 上。暫時地，圓盤也可以停放在第三根柱子 `B` 上。
難處在於：每個圓盤的大小都不同，而且在任何時刻，較大的圓盤都不能放在較小的圓盤上面。

[這個著名的謎題有一個眾所周知的遞迴解法。](https://zh.wikipedia.org/zh-tw/%E6%B1%89%E8%AF%BA%E5%A1%94)
要把 $n$ 個圓盤從柱子 `A` 移到 `C`，做法如下：

1. 遞迴地把最上面的 $n - 1$ 個圓盤從 `A` 移到輔助柱子 `B`。原本在 `A` 上的第 $n$ 個圓盤現在位於最上面。
2. 把那個圓盤從 `A` 移到目標柱子 `C`。
3. 遞迴地把 $n - 1$ 個圓盤從柱子 `B` 移到 `C`。

讓我們在 Agda 中形式化這個謎題與這個解法。只要對這個策略做一點點調整，我們甚至能夠證明：任何有效的圓盤組態，
都可以經由一個有效的移動序列，從任何其他有效的組態到達，而且我們可以執行這個證明，來決定這樣一個有效的移動序列。

我們會採用依構造而正確的做法，因此策略的描述，以及該策略確實如預期運作的證明，會被統一成單一個產物。


## 預備知識

對向量 `xs` 與謂詞 `P`，型別 `All P xs` 表示向量 `xs` 的每個元素都滿足 `P`。`All P xs` 的居民就是適當見證所成的串列。
下面的定義直接取自
[Padova2025-zh-TW.ProvingBasics.Connectives.More](Padova2025-zh-TW.ProvingBasics.Connectives.More.html#All)，
我們在那裡討論過同一個概念，只不過針對的是串列而不是向量。

```
data All {A : Set} (P : A → Set) : {n : ℕ} → Vector A n → Set where
  []  : All P []
  _∷_ : {n : ℕ} {x : A} {xs : Vector A n} → P x → All P xs → All P (x ∷ xs)
```

```
all-replicateV : {n : ℕ} {A : Set} {P : A → Set} {x : A} → P x → All P (replicateV n x)
all-replicateV {zero}   px = {--}[]{--}
all-replicateV {succ n} px = {--}px ∷ all-replicateV px{--}
```


## 謎題的形式化

三根柱子由下面這個有三個建構子的型別編碼。

```
data Peg : Set where
  A : Peg
  B : Peg
  C : Peg
```

$n$ 個圓盤的組態是一個長度為 $n$ 的柱子向量，第 $i$ 個項目告訴我們第 $i$ 個圓盤放在哪根柱子上。我們不需要記錄圓盤在柱子上的位置，
因為這已經被大小的要求唯一決定了。（不過，在形式化有效移動的概念時，我們會需要強加一個與大小有關的限制。）

```
Config : ℕ → Set
Config n = Vector Peg n
```

一個（有效的）遊戲移動，要嘛把最大的圓盤從它所在的柱子搬到另一根，要嘛不動它，因而是想像把最大圓盤拿掉後的子遊戲中的一個（有效的）移動。
在第一種情況下，為了讓移動有效，所有較小的圓盤都必須既不在來源柱子上（否則最大的圓盤不是露出來的），
也不在目標柱子上（否則最大的圓盤無法放到那裡）。

型別 `Move c c'` 是從組態 `c` 到組態 `c'` 的（有效）移動的型別。

```
data Move : {n : ℕ} → Config n → Config n → Set where
  here
    : {n : ℕ}
    → (source target : Peg) {c : Config n}
    → source ≢ target → All (λ p → p ≢ source × p ≢ target) c
    → Move (source ∷ c) (target ∷ c)
  there
    : {n : ℕ} {c c' : Config n} {p : Peg}
    → Move c c'
    → Move (p ∷ c) (p ∷ c')
```

一個（有效的）過程（play）是（有效）移動的序列。我們直接在型別簽名中追蹤起始與結束的組態。

```
infixr 5 _◅_
data Star {X : Set} (P : X → X → Set) : X → X → Set where
  ε   : {x : X} → Star P x x
  _◅_ : {a b c : X} → (x : P a b) → (xs : Star P b c) → Star P a c
```

```
Play : {n : ℕ} → Config n → Config n → Set
Play = Star Move
```


## 輔助結果

柱子的相等是可判定的，證明如下，一個無聊的證明，我們只是逐一走訪每種情況。

```
_≡?_ : (p p' : Peg) → Dec (p ≡ p')
A ≡? A = yes refl
A ≡? B = no λ ()
A ≡? C = no λ ()
B ≡? A = no λ ()
B ≡? B = yes refl
B ≡? C = no λ ()
C ≡? A = no λ ()
C ≡? B = no λ ()
C ≡? C = yes refl
```

我們可以串接移動序列。

```
infixr 5 _◅◅_
_◅◅_ : {X : Set} {P : X → X → Set} {a b c : X} → Star P a b → Star P b c → Star P a c
-- Holify
_◅◅_ ε        ys = ys
_◅◅_ (x ◅ xs) ys = x ◅ (xs ◅◅ ys)
```

我們可以把不含最大圓盤的 $n$ 圓盤子遊戲中的過程，轉換成完整的 $(n + 1)$ 圓盤遊戲中的過程。我們把這個運算稱為 `frame`，
這是參照[分離邏輯](https://en.wikipedia.org/wiki/Separation_logic)的框架規則（frame rule），
它同樣讓人把關於系統一小部分的陳述提升到整體，而讓其他一切保持不動。

```
frame : {n : ℕ} (p : Peg) {c c' : Config n} → Play c c' → Play (p ∷ c) (p ∷ c')
-- Holify
frame p ε        = ε
frame p (m ◅ ms) = there m ◅ frame p ms
```

永遠存在第三根柱子。

```
third : (p p' : Peg) → p ≢ p' → Σ[ q ∈ Peg ] q ≢ p × q ≢ p'
-- Holify
third A A p≢p' = ⊥-elim (p≢p' refl)
third A B p≢p' = C , (λ ()) , (λ ())
third A C p≢p' = B , (λ ()) , (λ ())
third B A p≢p' = C , (λ ()) , (λ ())
third B B p≢p' = ⊥-elim (p≢p' refl)
third B C p≢p' = A , (λ ()) , (λ ())
third C A p≢p' = B , (λ ()) , (λ ())
third C B p≢p' = A , (λ ()) , (λ ())
third C C p≢p' = ⊥-elim (p≢p' refl)
```


## 解法的形式化

給定相異的柱子 `source`、`target` 與 `auxiliary`，下面的函數會產生一個過程，從所有圓盤都在 `source` 上的組態出發，
把它們移到 `target`。不需要另外的正確性證明——正確性已經由型別確立。（註解中概述的策略是最優的，不過這一點既沒有被陳述也沒有被證明。）

```
solve₀
  : {n : ℕ} → (source target auxiliary : Peg)
  → source ≢ target
  → source ≢ auxiliary
  → target ≢ auxiliary
  → Play (replicateV n source) (replicateV n target)
solve₀ {zero}   source target auxiliary s≢t s≢a t≢a = {--}ε{--}
solve₀ {succ n} source target auxiliary s≢t s≢a t≢a =
  -- 步驟 1：把最上面的 n 個圓盤移到輔助柱子。
  {--}frame source (solve₀ source auxiliary target s≢a s≢t a≢t){--} ◅◅
  -- 步驟 2：把現在露出來的圓盤移到目標柱子。
  {--}here source target s≢t (all-replicateV (a≢s , a≢t)){--} ◅
  -- 步驟 3：把這 n 個圓盤從暫時停放的位置移到目標柱子。
  {--}frame target (solve₀ auxiliary target source a≢t a≢s t≢s){--}
  where
  a≢t = ≢-sym t≢a
  a≢s = ≢-sym s≢a
  t≢s = ≢-sym s≢t
```

再多費一點功夫，我們就能證明：每個（有效的）組態都可以從任何其他組態到達：

```
solve : {n : ℕ} → (c c' : Config n) → Play c c'
solve []      []        = {--}ε{--}
solve (p ∷ c) (p' ∷ c') with p ≡? p'
... | yes refl = {--}frame p (solve c c'){--}
... | no  p≢p' =
  let (q , q≢p,p') = third p p' p≢p'
      mid          = replicateV _ q
  in
  -- 步驟 1：把最上面的 n 個圓盤移到輔助柱子。
  {--}frame p (solve c mid){--} ◅◅
  -- 步驟 2：把現在露出來的第 (n + 1) 個圓盤移到它該去的地方。
  {--}here p p' p≢p' (all-replicateV q≢p,p'){--} ◅
  -- 步驟 3：把停放的圓盤移到它們該去的地方。
  {--}frame p' (solve mid c'){--}
```

同樣地，正確性由型別保證。（但與 `solve₀` 不同，函數 `solve` 並不總是計算出最優的過程。）

是時候執行我們的證明了！例如，把 `replicateV three A` 與 `replicateV three C` 放進型別簽名的兩個 hole 裡，
並把 `solve _ _` 放進下面剩下的 hole 裡。然後用 `C-c C-v` 執行 `example`，觀察得到的移動序列。
（輸出會被一些不等式見證弄得有點雜亂。）

```
example : Play {--}(replicateV three A){--} {--}(replicateV three C){--}
example = {--}solve _ _{--}
```

<!--
## Pretty-printing plays

Enjoy running `solve₀` or `solve` (using `C-c C-v`), to obtain suitable
sequences of moves. The output will contain inequality witnesses, which are
important for the proofs but not relevant for the mere algorithmic question of
which disks to move where.

```code
open import Padova2025-zh-TW.ProgrammingBasics.Lists
```

```code
toList : {n : ℕ} {c c' : Config n} → Play c c' → List (Peg × Peg)
toList ε        = []
toList (m ◅ ms) = go m ∷ toList ms
  where
  go : {n : ℕ} {c c' : Config n} → Move c c' → Peg × Peg
  go (here source target _ _) = source , target
  go (there m)                = go m
```

```code
example : List (Peg × Peg)
example = toList (solve (replicateV three A) (replicateV three C))
```

```code
_ : example ≡ (A , C) ∷ (A , B) ∷ (C , B) ∷ (A , C) ∷ (B , A) ∷ (B , C) ∷ (A , C) ∷ []
_ = refl
```
-->
