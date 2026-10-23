```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.Cubical.Issues.PropositionalTruncation where
```

# 命題截斷（Propositional truncation）

```
open import Agda.Primitive
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProvingBasics.EvenOdd
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.General
open import Padova2025-zh-TW.ProvingBasics.Connectives.Existential
open import Padova2025-zh-TW.ProvingBasics.Connectives.Conjunction
open import Padova2025-zh-TW.ProvingBasics.Termination.Ordering
```

是時候坦白了：我們在
[Padova2025-zh-TW.ProvingBasics.Connectives.Existential 模組](Padova2025-zh-TW.ProvingBasics.Connectives.Existential.html)中定義為
存在量詞的東西，並不是黑板數學中真正的存在量詞；同樣地，我們的析取也不是黑板數學中真正的析取。

我們的存在概念更精確地稱為「指定存在」（specified existence），而黑板數學的存在概念是「單純存在」（mere existence）：
依照我們的定義，存在命題的見證是型別 `Σ[ x ∈ A ] B x` 的值，也就是由一個指定的元素 `x : A` 與一個見證 `p : B x` 組成的一對。
所以見證不只證明了有某個元素 `x` 使得 `B x`；它還明確地指定了一個可能的這樣的元素 `x`。
這與黑板數學的存在概念形成對比，後者不會揭露指定的元素。

這在我們用存在性假設來建構數學對象時會造成差別。如果假設是指定存在，我們建構的結果可以依賴於 `x`。
如果假設是單純存在，結果不允許依賴於 `x`。

接下來，我們會把單純存在寫成 `∥ Σ[ x ∈ A ] B x ∥`（請記住，標準 Agda 並不支援這個）。


## 命題作為某些型別

我們可以更精確地說明這一點：對那些所有值都相等的型別，引進術語*命題*：

```
isProp : {ℓ : Level} → Set ℓ → Set ℓ
isProp X = (a b : X) → a ≡ b
```

對於滿足 `isProp` 的型別，唯一有意思的問題是它是否有居民。

例如，對每個數字 `n`，「`n` 是偶數」的見證所成的型別 `Even n` 是一個命題：

```
Even-isProp : (n : ℕ) → isProp (Even n)
-- Holify
Even-isProp _ base-even     base-even     = refl
Even-isProp _ (step-even p) (step-even q) = cong step-even (Even-isProp _ p q)
```

相對地，型別 `Σ[ x ∈ A ] B x` 通常不是命題。


## 消去原理

對於指定存在，我們有下面的消去原理：「如果給定一個元素 `x : A` 與一個見證 `p : B x`，我們有辦法建構型別 `R` 的元素，
那麼從假設 `Σ[ x ∈ A ] B x`，我們也有辦法建構這樣的元素。」

```
Σ-elim : {A : Set} {B : A → Set} {R : Set} → ((x : A) → B x → R) → (Σ[ x ∈ A ] B x → R)
-- Holify
Σ-elim f (x , p) = f x p
```

對於單純存在（標準 Agda 沒有它），我們只有下面較弱的原理：

```code
mere-existence-elim : {A : Set} {B : A → Set} {R : Set} → isProp R → ((x : A) → B x → R) → (∥ Σ[ x ∈ A ] B x ∥ → R)
```

與 `Σ-elim` 不同，單純存在的消去原理要求結果型別 `R` 是一個命題。

對兩種存在都成立的一個細節，沒有表達在上面 `Σ-elim` 與 `mere-existence-elim`（在標準 Agda 中是虛構的）的型別簽名中：
結果型別 `R` 不必屬於基礎 universe `Set`。它也可以是更大的型別，活在 `Set₁`、`Set₂` 或更高層。


## 選擇公理？

這兩種存在概念的差異，在與函數的互動中特別明顯。例如，下面的陳述看起來有點像選擇公理——它作為數學的*古典*基礎的一塊基石而廣為人知。
因此，人們不會預期它在預設為建構性的標準 Agda 中可以證明。然而它確實可以證明：

```
kinda-looking-like-the-axiom-of-choice
  : {A B : Set} {R : A → B → Set}
  → ((x : A) → Σ[ y ∈ B ] R x y)
  → Σ[ f ∈ (A → B) ] ((x : A) → R x (f x))
-- Holify
kinda-looking-like-the-axiom-of-choice p
  = (λ x → fst (p x)) , (λ x → snd (p x))
```

依照我們的定義，陳述「∀x:A. ∃y:B. R x y」的見證，本身就已經是一個函數：輸入一個元素 `x : A`，輸出由一個適當的元素 `y : B`
與 `R x y` 的見證組成的一對。把這樣的見證轉換成選擇函數，只是重新包裝所提供資訊的問題；以指定存在而非單純存在來表述，
選擇公理就不是一個有深遠後果的原理，而僅僅是一個建構性的重言式。


## 一個非直謂的後備方案

Cubical Agda 會讓我們對每個型別 `A : Set` 建構它的*命題截斷* `∥ A ∥ : Set`，也就是 `A` 在命題世界中的反射。
這個構造看起來像這樣：

```code
-- 一個「高階歸納型別」（higher inductive type）；只在 cubical 模式下可用
data ∥_∥ (A : Set) : Set where
  ∣_∣    : A → ∥ A ∥
  squash : (x y : ∥ A ∥) → x ≡ y
```

所以截斷 `∥ A ∥` 會像 `A`，但帶有額外的等同，迫使 `∥ A ∥` 成為命題。可以把它想像成 `A` 對「任意兩個元素都等價」的等價關係所取的商。

在標準 Agda 中，我們可以用非直謂（impredicative）編碼來近似命題截斷——代價是必須跳到下一個 universe 層級。

```
-- 在標準 Agda 中，以非直謂的方式作為真正命題截斷的後備方案
∥_∥ : Set → Set₁
∥ A ∥ = ({R : Set} → isProp R → (A → R) → R)
```

這個近似依定義就滿足所要的消去原理，不過只對活在基礎 universe `Set` 中的結果型別 `R` 成立：

```
∥∥-elim : {A : Set} {R : Set} → isProp R → (A → R) → (∥ A ∥ → R)
-- Holify
∥∥-elim p f x = x p f
```

Cubical Agda 把命題截斷定義為高階歸納型別（higher inductive type），這會支援下面更強的原理：

```code
-- 指的是真正的 ∥_∥，而不是非直謂的近似
∥∥-elim : {ℓ : Level} {A : Set} {R : Set ℓ} → isProp R → (A → R) → (∥ A ∥ → R)
```

對真正的命題截斷所做的非直謂近似，絕對是有用的，不過受限的消去原理是個嚴重的限制，尤其是考慮到截斷本身並不活在基礎 universe 中；
我們的近似若巢狀應用，就會遇到問題。

我們對命題截斷的近似還有另一個（相當尷尬的）缺陷：它產生不出命題。要得到 `isProp (∥ A ∥)`，需要函數外延性。


## 從單純存在得到指定存在

```
open import Padova2025-zh-TW.ProgrammingBasics.Booleans
open import Padova2025-zh-TW.ProgrammingBasics.Operators
open import Padova2025-zh-TW.ProvingBasics.Connectives.More
open import Padova2025-zh-TW.ProvingBasics.Connectives.Disjunction
open import Padova2025-zh-TW.ProvingBasics.Negation
```

一般而言，我們無法從某個元素 `x : A` 使得 `B x` 的單純存在，推出它的指定存在；指定存在強得多。但在一些例外的情況下，
我們可以僅憑「有這樣一個元素存在」的知識，明確地重建見證 `x`。讓我們在這裡探索其中一種情況。


### 可判定的情形

作為熱身，讓我們證明當 `A` 可判定時有 `∥ A ∥ → A`。

```
decidable-escape : {A : Set} → Dec A → ∥ A ∥ → A
-- Holify
decidable-escape A? f with A?
... | yes p  = p
... | no  ¬p = ⊥-elim (∥∥-elim (λ ()) ¬p f)
```


### 函數的根

函數 `f : ℕ → Bool` 的*根*是一個數字 `n`，使得 `f n ≡ false`。從根 `x` 的單純存在，我們可以依序檢查每個直到 `x` 的數字，
找到最小的根。與任意的根不同，最小的根是唯一的；這正是讓我們能從單純存在走到指定存在的原因。

TODO

<!--

```
falseUpTo? : (B? : ℕ → Bool) → ℕ → Bool
falseUpTo? B? zero     = true
falseUpTo? B? (succ n) = not (B? n) && falseUpTo? B? n
```

```
Min : (B? : ℕ → Bool) → ℕ → Set
Min B? n = B? n ≡ true × falseUpTo? B? n ≡ true
```

```code
ΣMin-isProp : (B? : ℕ → Bool) → isProp (Σ[ n ∈ ℕ ] Min B? n)
ΣMin-isProp B? (n , p) (n' , p') = {!!}
```

```code
find-min : (B? : ℕ → Bool) → Σ[ x ∈ ℕ ] B? x ≡ true → Σ[ x ∈ ℕ ] Min B? x
find-min B? (x , eq) = {!!}
```

```code
mere-implies-specified
  : (B? : ℕ → Bool)
  → ∥ Σ[ x ∈ ℕ ] B? x ≡ true ∥ → Σ[ x ∈ ℕ ] B? x ≡ true
mere-implies-specified B? p with ∥∥-elim (ΣMin-isProp B?) (find-min B?) p
... | (n , eq , _) = n , eq
```

-->


## 匿名存在

除了指定存在與單純存在之外，還有*雙重否定存在*，有時稱為*匿名存在*或*古典存在*。
（但請注意，「匿名存在」有時也指單純存在。）

在這三者之中，匿名存在是最弱的概念。型別 `¬ ¬ (Σ[ x ∈ A ] B x)` 的值，只是「不可能沒有任何 `x` 使得 `B x`」的見證。
這樣的見證保證這樣的元素存在（也許存在於柏拉圖的天堂的某處？），但沒有揭露任何找到它的方法。

```
∥∥→¬¬ : {A : Set} → ∥ A ∥ → ¬ ¬ A
-- Holify
∥∥→¬¬ f p = ∥∥-elim (λ ()) p f
```
