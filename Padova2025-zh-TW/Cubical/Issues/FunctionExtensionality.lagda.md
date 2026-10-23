```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.Cubical.Issues.FunctionExtensionality where
```

# 函數外延性

```
open import Padova2025-zh-TW.ProgrammingBasics.Booleans
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.General
```

讓我們考慮下面三個函數定義。

```
example₁ : Bool → Bool
example₁ x = x

example₂ : Bool → Bool
example₂ false = false
example₂ true  = true

example₃ : Bool → Bool
example₃ false = false
example₃ true  = true
-- 對，和 example₂ 的定義一模一樣。
```

顯然，這些函數在所有輸入上都有相同的值：

```
all-same₁₂ : (x : Bool) → example₁ x ≡ example₂ x
all-same₁₂ false = refl
all-same₁₂ true  = refl

all-same₂₃ : (x : Bool) → example₂ x ≡ example₃ x
all-same₂₃ false = refl
all-same₂₃ true  = refl
```

**無法證明相同。**
然而，在標準 Agda 中我們無法證明這些函數本身是相同的——下面的 hole 無法被填上（而提議使用的 `refl` 也無法通過型別檢查）：

```code
_ : example₁ ≡ example₂
_ = ?

_ : example₂ ≡ example₃
_ = ?
```

**無法證明相異。**
另一方面，在 Agda 中我們也無法證明上面這三個函數彼此相異，也就是說，我們無法寫出型別 `exampleᵢ ≡ exampleⱼ → ⊥` 的 term。
[Agda 和任何其他合理的形式系統一樣，是不完備的。](https://zh.wikipedia.org/zh-tw/%E5%93%A5%E5%BE%B7%E5%B0%94%E4%B8%8D%E5%AE%8C%E5%A4%87%E5%AE%9A%E7%90%86)
這個不完備性的特定實例讓某些人特別擔憂，因為它關係到 Agda 如此基本的一部分。*相等型別是欠規定的（underspecified）。*

**一個原理。**
「值相等的函數本身也相等」這個原理稱為*函數外延性*（function extensionality）。黑板數學有它，標準 Agda 則沒有。

```
FunctionExtensionality : Set₁
FunctionExtensionality = {X Y : Set} {f g : X → Y} → ((x : X) → f x ≡ g x) → f ≡ g
```


## 公設化函數外延性

如果我們願意，可以公設化函數外延性：

```code
postulate
  funext : FunctionExtensionality
```

把函數外延性加到 Martin-Löf 型別論中，不會破壞它的一致性。此外，如果一個人接受通常那種柏拉圖天堂的想法，就可以放心，
所得到的型別論仍然是談論柏拉圖天堂中對象的合適語言。

然而，公設化函數外延性會讓我們失去*典範性*（canonicity）：有了這個公設，歸納定義型別的元素可能不會化約成建構子的呼叫。
一個基本的例子就是 `funext` 本身。

```code
does-not-reduce-to-refl : example₁ ≡ example₂
does-not-reduce-to-refl = funext all-same₁₂
```

```code
does-not-reduce-to-a-numeral : ℕ
does-not-reduce-to-a-numeral = check does-not-reduce-to-refl
  where
  check : {g : Bool → Bool} → example₁ ≡ g → ℕ
  check refl = zero
```


## 避免函數外延性

在許多用途上，只要改用[逐點相等](Padova2025-zh-TW.ProvingBasics.Equality.General.html#_≗_)取代真正的 `_≡_`，
就能輕易避免函數外延性，如下所示。

```
all-same₁₂' : example₁ ≗ example₂
all-same₁₂' = all-same₁₂
```

但實際擁有函數外延性也是令人嚮往的。Cubical Agda 提供了這樣的系統。


## 習題：逐點相等是等價關係

```
≗-refl : {X Y : Set} {f : X → Y} → f ≗ f
-- Holify
≗-refl x = refl
```

```
≗-sym : {X Y : Set} {f g : X → Y} → f ≗ g → g ≗ f
-- Holify
≗-sym p x = sym (p x)
```

```
≗-trans : {X Y : Set} {f g h : X → Y} → f ≗ g → g ≗ h → f ≗ h
-- Holify
≗-trans p q x = trans (p x) (q x)
```


## 習題：型別構成範疇

設 `f`、`g` 與 `h` 是可合成的函數。那麼我們確實有 `(h ∘ g) ∘ f ≗ h ∘ (g ∘ f)`。
同樣的恆等式用 `_≡_` 取代 `_≗_` 後也成立嗎？還是需要函數外延性？

::: More :::
```
open import Padova2025-zh-TW.ProgrammingBasics.HigherOrder
open import Padova2025-zh-TW.ProgrammingBasics.DependentFunctions
```

儘管標準 Agda 沒有函數外延性，它確實有 *eta 相等*：每個函數 `f` 都在判斷上等於 lambda `λ x → f x`。
這個原理足以驗證（小）型別構成範疇，而且是在真正的命題相等意義下，而不僅是在逐點相等意義下。

```
∘-assoc : {X Y Z W : Set} → (f : X → Y) (g : Y → Z) (h : Z → W) → (h ∘ g) ∘ f ≡ h ∘ (g ∘ f)
-- Holify
∘-assoc f g h = refl
```

```
∘-identityˡ : {X Y : Set} → (f : X → Y) → id Y ∘ f ≡ f
-- Holify
∘-identityˡ f = refl
```

```
∘-identityʳ : {X Y : Set} → (f : X → Y) → f ∘ id X ≡ f
-- Holify
∘-identityʳ f = refl
```

確立了型別構成範疇之後，範疇論者可能會探問它的範疇性質。例如，在黑板數學中，範疇 $\mathrm{Set}$ 有一個始對象（initial object），
也就是空集合 $∅$：對每個集合 $X$，恰好有一個映射 $∅ → X$。

型別的範疇有始對象嗎？終對象呢？

::: More :::

### 沒有始對象

Agda 確實有空型別 `⊥`，而且對每個型別 `X`，都有一個映射 [`⊥-elim : ⊥ → X`](Padova2025-zh-TW.ProvingBasics.Negation.html#⊥-elim)。
因此型別的範疇有一個*弱始對象*（weakly initial object）。然而，沒有函數外延性的話，
我們無法證明任意兩個型別 `⊥ → X` 的函數是相同的。


### 終對象

另一方面，終對象是存在的。它由下面的宣告提供。

```
record 𝟙 : Set where
  constructor tt
```

record 型別預設具有[（它們自己版本的）eta 相等](https://agda.readthedocs.io/en/latest/language/record-types.html#eta-expansion)。
這就是為什麼任意兩個居民在判斷上相等：

```
_ : (x y : 𝟙) → x ≡ y
_ = λ x y → refl
```

作為推論，任意兩個通往 `𝟙` 的函數在判斷上相等：

```
_ : {X : Set} → {f g : X → 𝟙} → f ≡ g
_ = refl
```

相對地，把 `𝟙` 宣告為普通的歸納資料型別（或是在 record 宣告中用 `no-eta-equality` 關鍵字關閉 eta 相等），
會給我們一個型別，其中任意兩個居民在命題上相等、但在判斷上不相等。這個型別在小型別的範疇中不是終對象。

```
data 𝟙' : Set where
  tt : 𝟙'

𝟙'-isProp : (x y : 𝟙') → x ≡ y
𝟙'-isProp tt tt = refl
-- 但如果沒有做 pattern matching，寫成 𝟙'-isProp x y = refl，就會出現型別錯誤。
```


### setoid 的範疇

儘管型別的範疇或許是在探索 Agda 中的範疇版圖時最先想到的，但（小）*setoid* 的範疇對許多應用來說其實明智得多，
較不依賴於基礎（例如函數外延性是否可用），表現也好得多。例如，setoid 的範疇是完備且餘完備的、局部笛卡兒閉的、
正合的（exact）且廣延的（extensive）。它也滿足某個版本的選擇公理。所有這些斷言都可以在
[categories 函式庫](https://github.com/agda/agda-categories)的
[模組 Categories.Category.Instance.Properties.Setoids 及其子模組](https://agda.github.io/agda-categories/index.html)中詳細探索。
:::
:::
