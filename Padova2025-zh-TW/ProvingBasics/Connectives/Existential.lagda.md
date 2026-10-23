```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProvingBasics.Connectives.Existential where
```

# 存在量詞

存在量詞命題「存在一個值 `x : A` 使得 `P x`」的見證，應該是一對東西：一個適當的值 `x : A`，以及一個型別 `P x` 的見證。
因此，對任意型別 `A` 與任意謂詞 `P : A → Set`，我們引進下面的依值序對型別。

```code
infixr 4 _,_
data Σ (A : Set) (P : A → Set) : Set where
  _,_ : (fst : A) → (snd : P fst) → Σ A P
```

::: Aside :::
這個定義本身沒有問題，不過我們實際上會使用下面這個。

```
open import Agda.Primitive

infixr 4 _,_
record Σ {ℓ ℓ' : Level} (A : Set ℓ) (P : A → Set ℓ') : Set (ℓ ⊔ ℓ') where
  constructor _,_
  field
    fst : A
    snd : P fst
open Σ public
```

差異有兩點。第一，我們用的是 `record` 而不是 `data`。record 型別的好處是支援
[eta 相等](https://agda.readthedocs.io/en/latest/language/record-types.html#eta-expansion)：
不必對型別 `Σ A P` 的值 `w` 做 pattern matching，這個值就在判斷上等於 `(fst w , snd w)`。

第二，我們允許型別 `A` 以及函數 `P` 的值屬於更大的一類型別，也就是 `Set₁` 或更高的型別，而不是只限於基礎 universe `Set`。
這種額外的一般性對後續的發展很有用。否則到時候還得重新定義依值序對，會很麻煩。
:::

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProvingBasics.EvenOdd
```

例如，型別 `Σ ℕ Even` 是「存在一個偶數」的見證所成的型別。這個型別有無限多個居民，例如下面這兩個。

```
there-exist-even-numbers : Σ ℕ Even
there-exist-even-numbers = (zero , base-even)

there-exist-even-numbers' : Σ ℕ Even
there-exist-even-numbers' = (two , two-even)
```


## 語法糖

在黑板數學中，我們不寫 `Σ ℕ Even`，而是寫較不簡潔但更有啟發性的「$\exists(x \in \mathbb{N}).\ \mathrm{Even}(x)$」。
多虧 Agda 的一個特殊功能，我們可以在 Agda 中模仿這種記法，因為我們可以定義自訂語法：

::: More :::
```
infix 2 ∃-syntax
infix 2 Σ-syntax
∃-syntax : {ℓ ℓ' : Level} {A : Set ℓ} → (A → Set ℓ') → Set (ℓ ⊔ ℓ')
∃-syntax = Σ _
Σ-syntax : {ℓ ℓ' : Level} (A : Set ℓ) → (A → Set ℓ') → Set (ℓ ⊔ ℓ')
Σ-syntax = Σ
-- 這些只是普通的函數，供下面的 syntax 宣告使用。

syntax ∃-syntax (λ x → P) = ∃[ x ] P
-- 有了這個宣告，右手邊（其中 `P` 是一個 Agda term，
-- 通常會含有自由變數 `x`）
-- 就是左手邊的縮寫。

syntax Σ-syntax A (λ x → P) = Σ[ x ∈ A ] P
```
:::

接著我們就可以這樣表達存在量詞命題。

```
there-exist-even-numbers'' : ∃[ n ] Even n
there-exist-even-numbers'' = four , step-even two-even

there-exist-even-numbers''' : Σ[ n ∈ ℕ ] Even n
there-exist-even-numbers''' = succ (succ four) , step-even (step-even two-even)
```

有點可惜的是，我們不能使用冒號，而不得不改用 `∈`。有些人使用長得像冒號的 `∶`（它和真正的冒號 `:` 是不同的字元），
但這個替代方案也很令人困惑。


## 習題：涉及存在量詞的重言式

```
open import Padova2025-zh-TW.ProvingBasics.Negation
open import Padova2025-zh-TW.ProvingBasics.Connectives.Disjunction
```

```
infinitary-de-morgan₁ : {A : Set} {P : A → Set} → ((x : A) → ¬ P x) → ¬ (∃[ x ] P x)
-- Holify
infinitary-de-morgan₁ f (x , p) = f x p
```

```
infinitary-de-morgan₂ : {A : Set} {P : A → Set} → ¬ (∃[ x ] P x) → ((x : A) → ¬ P x)
-- Holify
infinitary-de-morgan₂ f x p = f (x , p)
```

```
∃-∨ : {A B : Set} {P : A → Set} → Σ[ x ∈ A ] (P x ⊎ B) → (Σ[ x ∈ A ] P x) ⊎ B
-- Holify
∃-∨ (x , left  p) = left  (x , p)
∃-∨ (x , right b) = right b
```


## 附註：偶數性的各種形式化

[回到我們引進謂詞的時候](Padova2025-zh-TW.ProvingBasics.EvenOdd.html)，我們選擇了偶數性的某一個特定定義。
但其他形式化也是可行的。讓我們把所有輔助結果收集在這裡，這些結果顯示了這幾個概念彼此吻合。

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.General
open import Padova2025-zh-TW.ProvingBasics.Equality.NaturalNumbers
```

```
Even₁ Even₂ Even₃ Even₄ : ℕ → Set

Even₁ n = Even n
Even₂ n = ¬ Odd n
Even₃ n = Odd (succ n)
Even₄ n = ∃[ m ] (n ≡ twice m)
```

```
1⇒2 : {n : ℕ} → Even₁ n → Even₂ n
2⇒1 : {n : ℕ} → Even₂ n → Even₁ n
1⇒3 : {n : ℕ} → Even₁ n → Even₃ n
3⇒1 : {n : ℕ} → Even₃ n → Even₁ n
1⇒4 : {n : ℕ} → Even₁ n → Even₄ n
4⇒1 : {n : ℕ} → Even₄ n → Even₁ n

1⇒2 = even-and-odd
2⇒1 = not-odd-implies-even _
1⇒3 = succ-even
3⇒1 = succ-even'
1⇒4 p = half _ , even-twice p
4⇒1 (m , p) = subst Even (sym p) (twice-even m)
```
