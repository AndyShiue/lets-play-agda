```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.Cubical.Issues.Quotients where
```

# 商

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
open import Padova2025-zh-TW.ProvingBasics.Negation
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.General
open import Padova2025-zh-TW.ProvingBasics.Equality.NaturalNumbers
open import Padova2025-zh-TW.ProvingBasics.Equality.Reasoning.Core
```

讓我們定義整數的型別 `ℤ`。

```
infixl 6 _⊝_
data ℤ : Set where
  _⊝_ : ℕ → ℕ → ℤ
```

想法是：一個整數以一對自然數表示，寫成 `a ⊝ b`。我們可以把 `a` 想像成存款，`b` 想像成債務。
例如，負數 $-2$ 可以表示為 `two ⊝ four`，也可以表示為 `one ⊝ three`。

接著我們可以在整數上實作後繼與前驅函數：

```
succℤ : ℤ → ℤ
succℤ (a ⊝ b) = succ a ⊝ b
-- 存款加一

predℤ : ℤ → ℤ
predℤ (a ⊝ b) = a ⊝ succ b
-- 債務加一
```

到目前為止都很順利；我們現在可以繼續實作加法、乘法等等。然而，在驗證恆等式時，我們會遇到問題，例如 `succℤ (predℤ x) ≡ x`：
這些恆等式並不成立！雖然 `succℤ (predℤ x)` 與 `x` 表示同一個整數，但這兩個值並不真正相同。如果 `x = a ⊝ b`，
那麼 `succℤ (predℤ x)` 實際上是 `succ a ⊝ succ b`。

Agda 不知道我們心中想的是哪個等價關係；我們必須自己定義它。

```
infix 4 _≈_
data _≈_ : ℤ → ℤ → Set where
  ≈-refl   : {x : ℤ}     → x ≈ x
  ≈-sym    : {x y : ℤ}   → x ≈ y → y ≈ x
  ≈-trans  : {x y z : ℤ} → x ≈ y → y ≈ z → x ≈ z
  ≈-cancel : {a b : ℕ}   → succ a ⊝ succ b ≈ a ⊝ b
-- 由建構子 ≈-cancel 生成的最小等價關係
```

接著我們就可以這樣陳述並證明前面提到的恆等式。

```
succ-pred : (x : ℤ) → succℤ (predℤ x) ≈ x
-- Holify
succ-pred (a ⊝ b) = ≈-cancel
```

上面定義的型別 `ℤ` 並不真正是整數的型別；它是整數*表示*的型別。每個真正的整數在型別 `ℤ` 中都有無限多個表示，
我們必須注意，絕不能用真正的相等 `_≡_` 來比較這些表示，而是永遠使用我們自訂的等價關係 `_≈_`。

真正的整數會從這個名稱取得不當的型別 `ℤ` 藉由*取商運算*得到，也就是形式上等同那些被 `_≈_` 關聯起來的值，大致如下：

```code
data ℤ' : Set  -- 真正的整數型別
  _⊝_    : ℕ → ℕ → ℤ'
  cancel : (a b : ℕ) → succ a ⊝ succ b ≡ a ⊝ b
-- 在標準 Agda 中是夢想，在 Cubical Agda 中是現實
```

然而，這不是有效的 Agda 程式碼，暗示了 Agda 型別系統的一個限制：標準 Agda 沒有商型別——只有 Cubical Agda 有。

沒有適當的商型別，我們有四個選項，描述如下，但它們都不理想。我們也應該指出，設計具有合理商型別的型別論框架是一個進行中的研究領域，
有幾個引人入勝的專案，例如 Cubical／同倫型別論、觀察型別論（observational type theory）、setoid 型別論——
當然還有帕多瓦大學發展的極簡基礎（minimalist foundation）。


## 堅持使用正規形式

::: Todo :::
待補：撰寫。
:::


## 改用完全不同的實作

我們可以靠一種表示唯一的方式來實作整數，避開所有商的問題，例如這樣：

```
data ℤ'' : Set where
  pos     : ℕ → ℤ''
  negsucc : ℕ → ℤ''
```

想法是 `pos x` 表示整數 `+x`，而 `negsucc x` 表示整數 `-(succ x)`。

當然，這種改換實作的選項並非總是可行。


## 公設化商

標準 Agda 沒有的，我們可以公設化：

```
module PostulatedQuotient
  (X : Set)
  (_≈_ : X → X → Set)
  (≈-refl   : {x : X}     → x ≈ x)
  (≈-sym    : {x y : X}   → x ≈ y → y ≈ x)
  (≈-trans  : {x y z : X} → x ≈ y → y ≈ z → x ≈ z) where
  postulate
    Q           : Set
    [_]         : X → Q
    Q-eq        : {x y : X} → x ≈ y → [ x ] ≡ [ y ]
    Q-effective : {x y : X} → [ x ] ≡ [ y ] → x ≈ y
    elim
      : {R : Set} → (f : X → R) → (R-eq : {x y : X} → x ≈ y → f x ≡ f y)
      → (Q → R)
    elim-β
      : {R : Set} → (f : X → R) → (R-eq : {x y : X} → x ≈ y → f x ≡ f y)
      → (x : X) → elim f R-eq [ x ] ≡ f x
    -- 接著還有針對謂詞 Q → Set 的歸納原理

open PostulatedQuotient ℤ _≈_ ≈-refl ≈-sym ≈-trans renaming (Q to ℤ''')
```

如果只是想把 Agda 當成一種語言，用來描述黑板數學的柏拉圖天堂中什麼為真，這個做法效果很好。但是，如同我們在
[公設化函數外延性](Padova2025-zh-TW.Cubical.Issues.FunctionExtensionality.html)時已經描述過的，公設會破壞令人嚮往的型別論性質。
執行中的證明可能會卡在公設化的 term 上，證明也會被 `elim-β` 的應用弄得雜亂。在原生支援商的型別系統中，例如 cubical 型別論，
`elim f R-eq [ x ]`（的等價物）會直接化約成 `f x`；我們可以用 `refl` 取代 `elim-β`。

::: Aside :::
人們常說 Lean 原生支援商，不像標準 Agda 和 Rocq，但它的支援
[代價沉重](https://github.com/rocq-prover/rocq/issues/10871#issuecomment-540452626)。
:::


## 墮入 setoid 地獄

標準 Agda 中的另一條路是墮入 *setoid 地獄*。這是個暱稱，指的是使用像上面的 `ℤ` 這樣未取商的型別，
同時記得（沒有工具輔助地）永遠要證明（同樣沒有工具輔助）函數保持自訂的等價關係。

例如，為了確保 `succℤ` 可以被視為真正整數上的函數、而不只是整數表示上的函數，我們需要證明下列事項：

```
succℤ-≈ : {x y : ℤ} → x ≈ y → succℤ x ≈ succℤ y
-- Holify
succℤ-≈ ≈-refl        = ≈-refl
succℤ-≈ (≈-sym p)     = ≈-sym (succℤ-≈ p)
succℤ-≈ (≈-trans p q) = ≈-trans (succℤ-≈ p) (succℤ-≈ q)
succℤ-≈ ≈-cancel      = ≈-cancel
```

這還不算太糟，Cubical Agda 中也存在類似的證明義務（Cubical Agda 會自動提醒我們）。這個證明有數學內容，
確保 `succℤ` 不會以可觀察的方式區分等價的代表元。

更嚴重的問題是，我們還必須在數學上平凡的情況下，也記得並履行這種證明義務。這些情況需要沒有教育意義的樣板程式碼。

例如，讓我們定義雙重後繼函數：

```
doublesuccℤ : ℤ → ℤ
doublesuccℤ x = succℤ (succℤ x)
```

因為 `succℤ` 保持等價關係，`doublesuccℤ` 也是如此。然而，我們需要明確地陳述並證明這個事實：

```
doublesuccℤ-≈ : {x y : ℤ} → x ≈ y → doublesuccℤ x ≈ doublesuccℤ y
-- Holify
doublesuccℤ-≈ p = succℤ-≈ (succℤ-≈ p)
```


## 習題：等價關係的明確描述

上面我們把 `_≈_` 定義為由唯一建構子 `≈-cancel` 所給出的關係之自反對稱遞移閉包。這個做法讓我們容易設立等價關係，
也容易證明元素之間有關聯；但要證明元素*沒有*關聯，則需要對情況有更多洞察，例如對所生成的關係有明確的描述。

```
_≈'_ : ℤ → ℤ → Set
(a ⊝ b) ≈' (a' ⊝ b') = (a + b') ≡ (a' + b)
```

```
≈'-refl : {x : ℤ} → x ≈' x
-- Holify
≈'-refl {a ⊝ b} = refl
```

```
≈'-sym : {x y : ℤ} → x ≈' y → y ≈' x
-- Holify
≈'-sym {a ⊝ b} {a' ⊝ b'} p = sym p
```

請注意，下面的習題需要一點耐心。

```
≈'-trans : {x y z : ℤ} → x ≈' y → y ≈' z → x ≈' z
-- Holify
≈'-trans {a ⊝ b} {a' ⊝ b'} {a'' ⊝ b''} p q = +-cancelₗ b' (a + b'') (a'' + b) (begin
  b' + (a + b'') ≡˘⟨ +-assoc b' a b'' ⟩
  (b' + a) + b'' ≡⟨ cong (_+ b'') (+-comm b' a) ⟩
  (a + b') + b'' ≡⟨ cong (_+ b'') p ⟩
  (a' + b) + b'' ≡⟨ +-comm (a' + b) b'' ⟩
  b'' + (a' + b) ≡˘⟨ +-assoc b'' a' b ⟩
  (b'' + a') + b ≡⟨ cong (_+ b) (+-comm b'' a') ⟩
  (a' + b'') + b ≡⟨ cong (_+ b) q ⟩
  (a'' + b') + b ≡⟨ cong (_+ b) (+-comm a'' b') ⟩
  (b' + a'') + b ≡⟨ +-comm (b' + a'') b ⟩
  b + (b' + a'') ≡⟨ +-comm b (b' + a'') ⟩
  (b' + a'') + b ≡⟨ +-assoc b' a'' b ⟩
  b' + (a'' + b) ∎)
```

```
≈→≈' : {x y : ℤ} → x ≈ y → x ≈' y
-- Holify
≈→≈' ≈-refl        = ≈'-refl
≈→≈' (≈-sym p)     = ≈'-sym (≈→≈' p)
≈→≈' (≈-trans p q) = ≈'-trans (≈→≈' p) (≈→≈' q)
≈→≈' ≈-cancel      = sym (+-succ _ _)
```

```
≈-cancel-more : (x a b : ℕ) → (x + a) ⊝ (x + b) ≈ a ⊝ b
-- Holify
≈-cancel-more zero     a b = ≈-refl
≈-cancel-more (succ x) a b = ≈-trans ≈-cancel (≈-cancel-more x a b)
```

```
≡→≈ : {x y : ℤ} → x ≡ y → x ≈ y
-- Holify
≡→≈ refl = ≈-refl
```

```
≈'→≈ : {x y : ℤ} → x ≈' y → x ≈ y
-- Holify
≈'→≈ {a ⊝ b} {a' ⊝ b'} p =
  (≈-trans (≈-sym (≈-cancel-more a' a b))
  (≈-trans (≡→≈ (cong₂ _⊝_ (+-comm a' a) (sym p)))
  (≈-cancel-more a a' b')))
-- 為 _≈_ 實作等式推理，可以讓這裡更漂亮
```

```
zeroℤ : ℤ
zeroℤ = zero ⊝ zero

oneℤ : ℤ
oneℤ = one ⊝ zero
```

```
zeroℤ≉oneℤ : ¬ zeroℤ ≈ oneℤ
-- Holify
zeroℤ≉oneℤ p with ≈→≈' p
... | ()
```
