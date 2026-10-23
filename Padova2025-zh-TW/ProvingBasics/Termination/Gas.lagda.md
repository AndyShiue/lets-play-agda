```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProvingBasics.Termination.Gas where
```

# 燃料（Gas）

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
open import Padova2025-zh-TW.ProgrammingBasics.Lists
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
```

為了確信一個遞迴最終會終止，Agda 的終止性檢查器必須觀察到遞迴呼叫是作用在*結構上更小*的引數上，例如 `x` 在結構上比
`succ x` 小。自訂的序關係，無論與手上的情況多麼相關，Agda 的終止性檢查器都不會參考。

為了滿足終止性檢查器，我們可以引進一個額外的引數，它唯一的目的就是在每一步都變得結構上更小。

```
digits₃ : ℕ → ℕ
digits₃ x = go (succ x) x
  where
  go : (gas : ℕ) → (x : ℕ) → ℕ
  go zero       x          = zero  -- bailout，放棄，永遠不該到達這裡
  go (succ gas) zero       = zero
  go (succ gas) x@(succ _) = succ (go gas (half x))
```

這個定義之所以行得通，是因為初始燃料 `succ x` 永遠足以算出正確答案。（用 `x` 當初始燃料也行得通，但那只是因為我們在
bailout 的情況放了 `zero`。）

然而，證明對正的 `x` 有 `digits₃ x ≡ succ (digits₃ (half x))` 有點複雜（因此這裡*不*建議把它當成習題）。

```code
digits₃-eq : (x : ℕ) → digits₃ (succ x) ≡ succ (digits₃ (half (succ x)))
digits₃-eq x = {!!}
```

有一個好得多的方法，是下一個模組討論的
[更精緻的燃料](Padova2025-zh-TW.ProvingBasics.Termination.WellFounded.html)。


## 標記例外情況

上面在 bailout 的情況，我們可以想像出某個（任意的）定義，因為值域 `ℕ` 有居民。在其他情況下，例如值域是某種見證的型別時，
手邊可能沒有合適的「錯誤值」。為了讓燃料方法仍然行得通，我們改用比較明確的機制來標示 bailout 的情況。

```
data Maybe (A : Set) : Set where
  nothing : Maybe A
  just    : A → Maybe A
```

```
digits₃' : ℕ → Maybe ℕ
digits₃' x = go (succ x) x
  where
  go : (gas : ℕ) → (x : ℕ) → Maybe ℕ
  go zero       x          = nothing  -- bailout
  go (succ gas) zero       = just zero
  go (succ gas) x@(succ _) with go gas (half x)
  ... | nothing = nothing
  ... | just y  = just (succ y)
```

在這個版本中，遞迴呼叫（`succ (digits (half x))`）原本簡單的結構消失了；我們可以嘗試用 `_>>=_` 運算子把它找回來。

```
infixl 1 _>>=_
_>>=_ : {A B : Set} → Maybe A → (A → Maybe B) → Maybe B
nothing >>= f = nothing
just x  >>= f = f x
```

```
digits₃'' : ℕ → Maybe ℕ
digits₃'' x = go (succ x) x
  where
  go : (gas : ℕ) → (x : ℕ) → Maybe ℕ
  go zero       x          = nothing  -- bailout
  go (succ gas) zero       = just zero
  go (succ gas) x@(succ _) = go gas (half x) >>= λ y → just (succ y)
```

利用所謂的 [do 記法](https://agda.readthedocs.io/en/stable/language/syntactic-sugar.html#do-notation)，
我們可以把寫法再改善一點：

```
digits₃''' : ℕ → Maybe ℕ
digits₃''' x = go (succ x) x
  where
  go : (gas : ℕ) → (x : ℕ) → Maybe ℕ
  go zero       x          = nothing  -- bailout
  go (succ gas) zero       = just zero
  go (succ gas) x@(succ _) = do
    y ← go gas (half x)
    just (succ y)
```

然而，涉及這幾個版本的 `digits₃` 的證明仍然相當錯綜複雜，也沒有什麼特別的啟發性。作為習題，你可以試著證明：
對每個數字 `x`，`digits₃' x` 都具有 `just _` 的形式。


### `Maybe` 的其他應用

運算式 `lookupMaybe xs n` 應該化約為串列 `xs` 的第 `n` 個元素（外面包一層 `just`），如果這個元素存在的話；
否則化約為 `nothing`。

```
lookupMaybe : {X : Set} → List X → ℕ → Maybe X
-- Holify
lookupMaybe []       n        = nothing
lookupMaybe (x ∷ xs) zero     = just x
lookupMaybe (x ∷ xs) (succ n) = lookupMaybe xs n

-- Tests
-- EX: lookupMaybe (four ∷ two ∷ one ∷ []) one   ≡ just two
-- EX: lookupMaybe (four ∷ two ∷ one ∷ []) two   ≡ just one
-- EX: lookupMaybe (four ∷ two ∷ one ∷ []) three ≡ nothing
```


### 建構子的單射性

```
just-injective : {X : Set} {a b : X} → just a ≡ just b → a ≡ b
-- Holify
just-injective refl = refl
```


## 在具體情形下不經證明地萃取結果

即使不證明 `digits₃'` 的結果永遠具有 `just _` 的形式，我們仍然可以在具體的情形中萃取結果。例如，要把 `digits₃' five`
取得為 `ℕ` 的實際元素（而不是 `Maybe ℕ` 的元素），我們可以做下面的準備工作……

```
record 𝟙 : Set where
  constructor tt

module _ {A : Set} where
  From-just : Maybe A → Set
  From-just nothing  = 𝟙
  From-just (just _) = A

  from-just : (m : Maybe A) → From-just m
  from-just nothing  = tt
  from-just (just x) = x
```

……然後這樣取得值。

```
example-digits-computation : ℕ
-- Holify
example-digits-computation = from-just (digits₃' five)

-- Tests
-- EX: example-digits-computation ≡ three
```

在 hole 裡放入 `from-just (digits₃' five)`；然後用 `C-c C-v` 觀察 `example-digits-computation` 是 `three`。

這個 `from-just` 機制不只是方便而已：我們可以用它，在型別檢查時把一個部分的決策程序變成經過完整驗證的陳述。
`from-just`（以及下面的 `collect`）的有趣應用，出現在我們對
[91 函數](Padova2025-zh-TW.ProvingBasics.Termination.BoveCapretta.Fun91.html)與
[Bertrand 公設](Padova2025-zh-TW.Explorations.Bertrand.html)的探索中，我們在那裡純粹以經驗方式驗證了某些命題。



### 一次萃取有限多個結果

```
open import Padova2025-zh-TW.ProvingBasics.Connectives.More
```

```
collect : {P : ℕ → Set} → ((n : ℕ) → Maybe (P n)) → (n : ℕ) → Maybe (All P (downFrom n))
-- Holify
collect observe zero     = just []
collect observe (succ n) = do
  xs ← collect observe n
  p  ← observe n
  just (p ∷ xs)
```


### 從可判定性到部分可判定性

```
Dec→Maybe : {A : Set} → Dec A → Maybe A
-- Holify
Dec→Maybe (yes x) = just x
Dec→Maybe (no  _) = nothing
```


## 習題：除法與取餘數

```
open import Padova2025-zh-TW.ProgrammingBasics.Booleans
open import Padova2025-zh-TW.ProvingBasics.Connectives.Disjunction
open import Padova2025-zh-TW.ProvingBasics.Termination.Ordering
```

下面這段程式碼本來要實作除法，但無法通過終止性檢查器（而且確實，當除數為零時不會終止）。

```
infix 7 _/_
```

```code
_/_ : ℕ → ℕ → ℕ
a / b with ≤-<-connex b a
... | left  b≤a = succ ((a ∸ b) / b)
... | right a<b = zero
```

使用本模組引進的脆弱的燃料技巧，提供一個會終止且正確的除法版本。你不需要驗證你的實作確實正確。
當除數為零時，你的函數可以計算出任何你喜歡的結果。

```
_/_ : ℕ → ℕ → ℕ
-- Holify
_/_ a b = go a a
  where
  go : (gas : ℕ) → (x : ℕ) → ℕ
  go zero       x = zero  -- bailout
  go (succ gas) x with ≤-<-connex b x
  ... | left  b≤x = succ (go gas (x ∸ b))
  ... | right x<b = zero

-- Tests
-- EX: two   / one   ≡ two
-- EX: two   / two   ≡ one
-- EX: two   / three ≡ zero
-- EX: two   / four  ≡ zero
-- EX: two   / five  ≡ zero
-- EX: three / one   ≡ three
-- EX: three / two   ≡ one
-- EX: three / three ≡ one
-- EX: three / four  ≡ zero
-- EX: three / five  ≡ zero
-- EX: four  / one   ≡ four
-- EX: four  / two   ≡ two
-- EX: four  / three ≡ one
-- EX: four  / four  ≡ one
-- EX: four  / five  ≡ zero
-- EX: five  / one   ≡ five
-- EX: five  / two   ≡ two
-- EX: five  / three ≡ one
-- EX: five  / four  ≡ one
-- EX: five  / five  ≡ one
```

同樣地，下面的程式碼本來要實作取餘數運算，但無法通過終止性檢查器；請提供一個會終止的版本。

```
infix 7 _%_
```

```code
_%_ : ℕ → ℕ → ℕ
a % b with ≤-<-connex b a
... | left  b≤a = (a ∸ b) % b
... | right a<b = a
```

```
_%_ : ℕ → ℕ → ℕ
-- Holify
_%_ a b = go a a
  where
  go : (gas : ℕ) → (x : ℕ) → ℕ
  go zero       x = zero  -- bailout
  go (succ gas) x with ≤-<-connex b x
  ... | left  b≤x = go gas (x ∸ b)
  ... | right x<b = x

-- Tests
-- EX: two   % one   ≡ zero
-- EX: two   % two   ≡ zero
-- EX: two   % three ≡ two
-- EX: two   % four  ≡ two
-- EX: two   % five  ≡ two
-- EX: three % one   ≡ zero
-- EX: three % two   ≡ one
-- EX: three % three ≡ zero
-- EX: three % four  ≡ three
-- EX: three % five  ≡ three
-- EX: four  % one   ≡ zero
-- EX: four  % two   ≡ zero
-- EX: four  % three ≡ one
-- EX: four  % four  ≡ zero
-- EX: four  % five  ≡ four
-- EX: five  % one   ≡ zero
-- EX: five  % two   ≡ one
-- EX: five  % three ≡ two
-- EX: five  % four  ≡ one
-- EX: five  % five  ≡ zero
```
