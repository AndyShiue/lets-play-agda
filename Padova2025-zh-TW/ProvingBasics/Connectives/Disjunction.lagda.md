```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProvingBasics.Connectives.Disjunction where
```

# 析取

在前面幾節裡，我們已經陳述並證明了不少結果。但我們仍然缺少表達其他一些相當基本的斷言所需的工具，例如下列這些：

1. **每個自然數不是偶數就是奇數。** \
   $\forall(n \in \mathbb{N}).\ (\mathrm{Even}(n) \vee \mathrm{Odd}(n))$

2. **每個大於三的質數，都比六的某個倍數大一或小一。** \
   $\forall(p \in \mathbb{P}).\ (p > 3 \Rightarrow (6 \mid p-1 \vee 6 \mid p+1))$

3. **每個自然數之後都還有質數。** \
   $\forall(n \in \mathbb{N}).\ \exists(p \in \mathbb{N}).\ (p > n \wedge p \in \mathbb{P})$

這個模組以及接下來幾個模組的目的，就是補上這個缺口，並引進析取（∨）、合取（∧）與存在量詞（∃）。依照
[命題即型別（propositions as types）的哲學](Padova2025-zh-TW.ProvingBasics.PropositionsAsTypes.html)，
我們應該引進一個適當的見證型別，例如給定數字 `n` 是偶數或奇數的見證。上面第一個結果就可以用一個函數來形式化：
這個函數讀入任意的數字 `n` 作為輸入，並輸出這種見證。


## 定義：不交聯集

為了表達析取（∨），對給定的型別 `A` 與 `B`，我們引進它們的不交聯集 `A ⊎ B`：

```
infixr 1 _⊎_
data _⊎_ (A : Set) (B : Set) : Set where
  left  : A → A ⊎ B
  right : B → A ⊎ B
-- 在 Haskell 中，`A ⊎ B` 稱為 `Either A B`。
```

換句話說，`A ⊎ B` 的元素有兩種形式：對某個 `x : A` 的 `left x`，或對某個 `y : B` 的 `right y`。
從計算的角度來看，`left` 是一個函數，輸入型別 `A` 的元素，輸出型別 `A ⊎ B` 的元素，`right` 也類似。
從邏輯的角度來看，`A` 蘊涵 `A or B`。數字 `n` 是偶數或奇數的見證所成的型別，就是 `Even n ⊎ Odd n`。


## 習題：涉及析取的重言式

```
open import Padova2025-zh-TW.ProvingBasics.Negation
```

```
∨-comm : {A B : Set} → A ⊎ B → B ⊎ A
-- Holify
∨-comm (left  x) = right x
∨-comm (right y) = left  y
```

```
∨-assoc : {A B C : Set} → (A ⊎ B) ⊎ C → A ⊎ (B ⊎ C)
-- Holify
∨-assoc (left  (left  x)) = left  x
∨-assoc (left  (right y)) = right (left  y)
∨-assoc (right z)         = right (right z)
```

```
∨-elim : {A B C : Set} → (A → C) → (B → C) → A ⊎ B → C
-- Holify
∨-elim f g (left  x) = f x
∨-elim f g (right y) = g y
```

```
∨-map : {A A' B B' : Set} → (A → A') → (B → B') → A ⊎ B → A' ⊎ B'
-- Holify
∨-map f g (left  x) = left  (f x)
∨-map f g (right y) = right (g y)
```

```
∨-codiag : {A : Set} → A ⊎ A → A
-- Holify
∨-codiag (left  x) = x
∨-codiag (right y) = y
```

```
∨-not₁ : {A : Set} → A ⊎ ⊥ → A
-- Holify
∨-not₁ (left  x)  = x
∨-not₁ (right ())
```

```
∨-not₂ : {A B : Set} → A ⊎ B → ¬ B → A
-- Holify
∨-not₂ (left  x) f = x
∨-not₂ (right y) f = ⊥-elim (f y)
-- 或者，第二個子句可以寫成下面這樣。
-- ∨-not₂ (right y) f with f y
-- ... | ()
```


## 習題：偶數或奇數

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProvingBasics.EvenOdd
```

```
even-or-odd : (x : ℕ) → Even x ⊎ Odd x
-- Holify
even-or-odd zero            = left base-even
even-or-odd (succ zero)     = right base-odd
even-or-odd (succ (succ x)) with even-or-odd x
... | left  p = left  (step-even p)
... | right p = right (step-odd p)
```

```
not-odd-implies-even : (x : ℕ) → ¬ Odd x → Even x
-- Holify
not-odd-implies-even x p = ∨-not₂ (even-or-odd x) p
```


## 習題：後繼的前驅，再訪

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
```

[我們已經檢視過](Padova2025-zh-TW.ProvingBasics.Equality.NaturalNumbers.html#lemma-succ-pred')
等式 $\mathsf{succ}(\mathsf{pred}(a)) = a$，它只對正的自然數成立。現在讓我們證明下面這個變體：

```
lemma-succ-pred'' : (a : ℕ) → succ (pred a) ≡ a ⊎ a ≡ zero
-- Holify
lemma-succ-pred'' zero     = right refl
lemma-succ-pred'' (succ a) = left  refl
```


## 習題：相等的可判定性

```
open import Padova2025-zh-TW.ProvingBasics.Equality.General
open import Padova2025-zh-TW.ProvingBasics.Equality.NaturalNumbers
open import Padova2025-zh-TW.ProgrammingBasics.HigherOrder
```

每個自然數要嘛是零，要嘛不是。在古典數學中，這個斷言基於一般的邏輯理由是顯然的，因為它只是
[排中律（law of excluded middle）](https://zh.wikipedia.org/zh-tw/%E6%8E%92%E4%B8%AD%E5%BE%8B)（$A ∨ ¬A$）的一個實例。
但它也有直接的證明，一個我們可以在 Agda 中實作、而不必假設排中律（從而破壞 Agda 預設的建構性模式）的證明。

```
zero? : (x : ℕ) → (x ≡ zero) ⊎ ¬ (x ≡ zero)
-- Holify
zero? zero     = left  refl
zero? (succ x) = right λ ()
```

與依賴排中律的證明不同，這個證明可以被*執行*——試試看，在 Agda 的編輯過程中按 `C-c C-v`，然後輸入像 `zero? four`
這樣的東西。`zero?` 函數就會判斷 `four` 是不是零，並計算出對應的見證。

::: Aside :::
這個證明是歸納證明中少見的例子：歸納步驟並沒有用到歸納假設。
:::

更一般地，我們有這個結果：任意兩個數字要嘛相等，要嘛不相等：

```
eq? : (a b : ℕ) → (a ≡ b) ⊎ ¬ (a ≡ b)
-- Holify
eq? zero     zero     = left refl
eq? zero     (succ b) = right λ ()
eq? (succ a) zero     = right λ ()
eq? (succ a) (succ b) = ∨-map (cong succ) (λ f → f ∘ succ-injective) (eq? a b)
-- 或者：
-- eq? (succ a) (succ b) with eq? a b
-- ... | left  a≡b = left (cong succ a≡b)
-- ... | right a≢b = right λ p → a≢b (succ-injective p)
```


## 習題：雙重否定單子中的神諭

下面兩個重言式，對於從古典證明中萃取出建構性內容這個目的來說極為重要，初次見到時也相當費解。

```
¬¬-oracle : {A : Set} → ¬ ¬ (A ⊎ ¬ A)
-- Holify
¬¬-oracle f = f (right (λ x → f (left x)))
```

```
¬¬-bind : {A B : Set} → ¬ ¬ A → (A → ¬ ¬ B) → ¬ ¬ B
-- Holify
¬¬-bind m f = λ k → m (λ x → f x k)
```


## 習題：排中律與雙重否定消去

```
LEM⇒DNE : ((A : Set) → A ⊎ ¬ A) → ((B : Set) → ¬ ¬ B → B)
-- Holify
LEM⇒DNE p B m with p B
... | left   a = a
... | right ¬a = ⊥-elim (m ¬a)
```

```
DNE⇒LEM : ((B : Set) → ¬ ¬ B → B) → ((A : Set) → A ⊎ ¬ A)
-- Holify
DNE⇒LEM p A = p (A ⊎ ¬ A) ¬¬-oracle
```
