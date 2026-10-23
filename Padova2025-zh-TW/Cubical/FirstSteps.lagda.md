```
{-# OPTIONS --cubical --guardedness #-}
module Padova2025-zh-TW.Cubical.FirstSteps where
```

# 第一步

```
open import Cubical.Foundations.Prelude
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
open import Padova2025-zh-TW.ProvingBasics.Negation
open import Padova2025-zh-TW.ProvingBasics.Termination.Gas using (𝟙; tt)
```

::: Todo :::
待補：適當的簡介。把各種型別的大雜燴拆出來。
:::


## 無序對

```
data UnorderedPair (A : Set) : Set where
  pair : (x y : A) → UnorderedPair A
  swap : (x y : A) → pair x y ≡ pair y x
```


## 關於相等的一般事項

```
refl' : {X : Set} {a : X} → a ≡ a
refl' {a = a} = λ i → a
```

```
symm' : {X : Set} {a b : X} → a ≡ b → b ≡ a
symm' p = λ i → p (~ i)
```

```
cong' : {X Y : Set} {a b : X} → (f : X → Y) → a ≡ b → f a ≡ f b
cong' f p = {--}λ i → f (p i){--}
```

```
funext : {A B : Set} {f g : A → B} → ((x : A) → f x ≡ g x) → f ≡ g
-- Holify
funext h = λ i → λ x → h x i
```

驗證遞移性比較困難。我們就直接使用 cubical 標準函式庫中的函數：

```
trans' : {X : Set} {a b c : X} → a ≡ b → b ≡ c → a ≡ c
trans' p q = p ∙ q
```

儘管 cubical Agda 以激進的方式重新想像了同一性，最終原生的相等型別與我們一直在使用的歸納定義的型別是一致的：

```
open import Padova2025-zh-TW.ProvingBasics.Equality.Base renaming (_≡_ to _≡ᵢ_)
```

```
≡ᵢ→≡ : {X : Set} {a b : X} → a ≡ᵢ b → a ≡ b
-- Holify
≡ᵢ→≡ refl = refl'
```

```
≡→≡ᵢ : {X : Set} {a b : X} → a ≡ b → a ≡ᵢ b
≡→≡ᵢ = J (λ b q → _ ≡ᵢ b) _≡ᵢ_.refl
```


## 習題：無序對的和

```
open import Padova2025-zh-TW.ProvingBasics.Equality.NaturalNumbers
```

```
sum-pair : UnorderedPair ℕ → ℕ
-- Holify
sum-pair (pair x y)   = x + y
sum-pair (swap x y i) = ≡ᵢ→≡ (+-comm x y) i
```


## 整數

```
infixl 5 _⊝_
data ℤ : Set where
  _⊝_    : (a b : ℕ) → ℤ
  cancel : (a b : ℕ) → a ⊝ b ≡ succ a ⊝ succ b
```

定義後繼與前驅函數。

```
succℤ : ℤ → ℤ
succℤ (a ⊝ b)        = succ a ⊝ b
succℤ (cancel a b i) = {--}cancel (succ a) b i{--}
```

```
predℤ : ℤ → ℤ
predℤ (a ⊝ b)        = a ⊝ succ b
predℤ (cancel a b i) = {--}cancel a (succ b) i{--}
```


## 習題：一不是零，再訪

證明一不是零。

```
lemma-nontrivial : one ≡ zero → ⊥
-- Holify
lemma-nontrivial p = transport (λ i → disambig (p i)) zero
  where
  disambig : ℕ → Set
  disambig zero     = ⊥
  disambig (succ _) = ℕ  -- 或其他任何有居民的型別
```

::: Hint :::
使用我們先前採用的 `_≡_` 的歸納定義時，這需要一個空模式。現在 `_≡_` 不再是歸納定義的，而是內建的概念，
我們無法對相等見證做 case split。

取而代之，請這樣進行：

1. 定義一個函數 `disambig : ℕ → Set`，把 zero 映射到 ⊥，把其他一切映射到某個有居民的型別。
2. 假設存在一條路徑 `zero ≡ succ zero`，結合標準函式庫中的
   [`transport`](Cubical.Foundations.Prelude.html#transport) 與 `disambig`：

       transport : {A B : Set} → A ≡ B → A → B
:::


## 習題：無序對抽象的穩健性

證明無序對的抽象不會洩漏，意思是不可能存在一個函數，能取出無序對的第一個分量。

```
lemma-not-leaky : (f : UnorderedPair ℕ → ℕ) → ((a b : ℕ) → f (pair a b) ≡ a) → ⊥
-- Holify
lemma-not-leaky f p = lemma-nontrivial (symm' (p one zero) ∙ cong' f (swap one zero) ∙ p zero one)
```


## 習題：反轉兩次

下面這個習題的解答令人愉悅。不需要（也不可能）做 case split：

```
symm-symm : {X : Set} {a b : X} → (p : a ≡ b) → symm' (symm' p) ≡ p
-- Holify
symm-symm p = refl'
```


## 單純命題（Mere propositions）

在同倫型別論中，一個型別稱為*命題*，若且唯若它的所有居民都相等。因此，關於一個命題，所有需要知道的就是它是否有居民。

```
isProp' : Set → Set
isProp' X = (a b : X) → a ≡ b
```

證明型別 `⊥` 與 `𝟙` 在這個意義下是命題。

```
⊥-isProp : isProp' ⊥
-- Holify
⊥-isProp ()
```

```
𝟙-isProp : isProp' 𝟙
-- Holify
𝟙-isProp tt tt = refl'
```

證明否定是命題。

```
lemma-negations-are-props : (X : Set) → isProp' (X → ⊥)
-- Holify
lemma-negations-are-props X f g = funext λ x → ⊥-isProp (f x) (g x)
```


## 自然數型別的零維性

在同倫型別論中，一個型別稱為 *hset*（或簡稱*集合*），若且唯若它的同一性型別都是單純命題，也就是說，
任意兩個元素之間至多有一條路徑。

```
isHSet : Set → Set
isHSet X = (a b : X) → isProp' (a ≡ b)
```

要驗證 `ℕ` 是 hset，我們需要它的同一性型別的明確描述。對於下面 `Code` 的定義，會證明型別 `a ≡ b` 與 `Code a b` 是等價的。

```
Code : ℕ → ℕ → Set
Code zero     zero     = 𝟙
Code zero     (succ y) = ⊥
Code (succ x) zero     = ⊥
Code (succ x) (succ y) = Code x y
```

```
fromCode : (a b : ℕ) → Code a b → a ≡ b
-- Holify
fromCode zero     zero     p = refl'
fromCode (succ a) (succ b) p = cong' succ (fromCode a b p)
```

```
Code-refl : (a : ℕ) → Code a a
-- Holify
Code-refl zero     = tt
Code-refl (succ a) = Code-refl a
```

```
Code-isProp : (a b : ℕ) → isProp' (Code a b)
-- Holify
Code-isProp zero     zero     = 𝟙-isProp
Code-isProp zero     (succ b) = ⊥-isProp
Code-isProp (succ a) zero     = ⊥-isProp
Code-isProp (succ a) (succ b) = Code-isProp a b
```

```
toCode : (a b : ℕ) → a ≡ b → Code a b
toCode a b = J {--}(λ c q → Code a c){--} {--}(Code-refl a){--}
```

::: Hint :::
如果 `_≡_` 是先前那種歸納定義的相等謂詞，我們會對 `p` 做 case split，化約到 `toCode a a refl` 的情況；
這個情況可以用 `Code-refl a` 解決。

這種 case split 對 `_≡_` 並不可用，不過我們可以用標準函式庫的 `J` 函數來模擬它的效果。
:::

```
from-to₀ : (a : ℕ) → fromCode a a (toCode a a refl') ≡ refl'
from-to₀ zero       = refl'
from-to₀ (succ a) i = cong succ (from-to₀ a i)
```

```
from-to : (a b : ℕ) → (p : a ≡ b) → fromCode a b (toCode a b p) ≡ p
from-to a b p = J (λ y q → fromCode a y (toCode a y q) ≡ q) (from-to₀ a) p
```

```
ℕ-isHSet : isHSet ℕ
-- Holify
ℕ-isHSet a b p q =
  symm' (from-to a b p) ∙ cong' (fromCode a b) (Code-isProp a b (toCode a b p) (toCode a b q)) ∙ from-to a b q
```
