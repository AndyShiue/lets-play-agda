```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProvingBasics.Connectives.More where
```

# All 與 Any

```
open import Padova2025-zh-TW.ProgrammingBasics.Lists
open import Padova2025-zh-TW.ProvingBasics.Negation
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.General
open import Padova2025-zh-TW.ProvingBasics.Connectives.Existential
```

謂詞 `All P xs` 表示 `P` 對串列 `xs` 的所有元素都成立。

```
data All {A : Set} (P : A → Set) : List A → Set where
  []  : All P []
  _∷_ : {x : A} {xs : List A} → P x → All P xs → All P (x ∷ xs)
```

謂詞 `Any P xs` 表示 `P` 至少對串列的一個元素成立。

```
data Any {A : Set} (P : A → Set) : List A → Set where
  here  : {x : A} {xs : List A} → P x → Any P (x ∷ xs)
  there : {x : A} {xs : List A} → Any P xs → Any P (x ∷ xs)
```

作為應用，`Any` 可以用來定義成員關係謂詞：

```
infix 4 _∈_ _∉_
_∈_ : {A : Set} → A → List A → Set
x ∈ xs = Any (x ≡_) xs

_∉_ : {A : Set} → A → List A → Set
x ∉ xs = ¬ (x ∈ xs)
```


## 習題：

```
satisfied : {A : Set} {P : A → Set} {xs : List A} → Any P xs → Σ[ x ∈ A ] P x
-- Holify
satisfied (here  px)  = _ , px
satisfied (there pxs) = satisfied pxs
```


## 習題：把 All 與 Any 視為函子

```
All-map : {A : Set} {P Q : A → Set} {xs : List A} → ({x : A} → P x → Q x) → All P xs → All Q xs
-- Holify
All-map f []       = []
All-map f (p ∷ ps) = f p ∷ All-map f ps
```

```
Any-map : {A : Set} {P Q : A → Set} {xs : List A} → ({x : A} → P x → Q x) → Any P xs → Any Q xs
-- Holify
Any-map f (here  p) = here (f p)
Any-map f (there v) = there (Any-map f v)
```


## 製表（Tabulation）

```
tabulate : {A : Set} {P : A → Set} (xs : List A) → ({x : A} → x ∈ xs → P x) → All P xs
-- Holify
tabulate []       f = []
tabulate (x ∷ xs) f = f (here refl) ∷ tabulate xs (λ in-xs → f (there in-xs))
```


## All 對串接的分配

```
All-++-left : {A : Set} {P : A → Set} {ys : List A} (xs : List A) → All P (xs ++ ys) → All P xs
-- Holify
All-++-left []       _        = []
All-++-left (_ ∷ xs) (p ∷ ps) = p ∷ All-++-left xs ps
```

```
All-++-right : {A : Set} {P : A → Set} {ys : List A} (xs : List A) → All P (xs ++ ys) → All P ys
-- Holify
All-++-right []       ps       = ps
All-++-right (_ ∷ xs) (_ ∷ ps) = All-++-right xs ps
```

```
infixr 5 _++ᴬ_
_++ᴬ_ : {A : Set} {P : A → Set} {xs ys : List A} → All P xs → All P ys → All P (xs ++ ys)
[]       ++ᴬ ps' = {--}ps'{--}
(p ∷ ps) ++ᴬ ps' = {--}p ∷ (ps ++ᴬ ps'){--}
```


## Any 對串接的分配

```
Any-++-left : {A : Set} {P : A → Set} {xs : List A} {ys : List A} → Any P xs → Any P (xs ++ ys)
-- Holify
Any-++-left (here  p) = here p
Any-++-left (there v) = there (Any-++-left v)
```

```
Any-++-right : {A : Set} {P : A → Set} {xs : List A} {ys : List A} → Any P ys → Any P (xs ++ ys)
-- Holify
Any-++-right {xs = []}     any = any
Any-++-right {xs = x ∷ xs} any = there (Any-++-right any)
```

```
∈-concat
  : {A : Set} {x : A} {xs : List A} {xss : List (List A)}
  → x ∈ xs → xs ∈ xss → x ∈ concat xss
-- Holify
∈-concat x∈xs (here  refl) = Any-++-left  x∈xs
∈-concat x∈xs (there xs∈)  = Any-++-right (∈-concat x∈xs xs∈)
```


## 習題：De Morgan 定律

與二元情形下[關於 De Morgan 定律的習題](Padova2025-zh-TW.ProvingBasics.Connectives.Conjunction.html#exercise-de-morgans-laws)相關。

```
de-morgan₁ : {A : Set} {P : A → Set} {xs : List A} → All (λ x → ¬ P x) xs → ¬ Any P xs
-- Holify
de-morgan₁ (¬p ∷ ¬ps) (here  p) = ¬p p
de-morgan₁ (¬p ∷ ¬ps) (there q) = de-morgan₁ ¬ps q
```

```
de-morgan₂ : {A : Set} {P : A → Set} {xs : List A} → ¬ Any P xs → All (λ x → ¬ P x) xs
-- Holify
de-morgan₂ {xs = []}     ¬any = []
de-morgan₂ {xs = x ∷ xs} ¬any = (λ p → ¬any (here p)) ∷ de-morgan₂ (λ v → ¬any (there v))
```

```
de-morgan₃ : {A : Set} {P : A → Set} {xs : List A} → Any (λ x → ¬ P x) xs → ¬ All P xs
-- Holify
de-morgan₃ (here  ¬p) (p ∷ ps) = ¬p p
de-morgan₃ (there v)  (p ∷ ps) = de-morgan₃ v ps
```


## 習題：零和，再訪

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Connectives.Conjunction
```

證明：如果一個自然數串列的元素之和為零，則每個元素本身都是零。函數
[`sum-zero`](Padova2025-zh-TW.ProvingBasics.Connectives.Conjunction.html#sum-zero)
或許派得上用場，不過直接的解法也很吸引人。

```
sum-zero' : (xs : List ℕ) → sum xs ≡ zero → All (_≡ zero) xs
-- Holify
sum-zero' []          p = []
sum-zero' (zero ∷ xs) p = refl ∷ sum-zero' xs p
-- 或者：
-- sum-zero' (x ∷ xs) p = fst (sum-zero x (sum xs) p) ∷ sum-zero' xs (snd (sum-zero x (sum xs) p))
```

反過來也成立：

```
sum-zero'' : (xs : List ℕ) → All (_≡ zero) xs → sum xs ≡ zero
-- Holify
sum-zero'' []          []         = refl
sum-zero'' (zero ∷ xs) (refl ∷ p) = sum-zero'' xs p
```


## 可判定的真值

```
open import Padova2025-zh-TW.ProvingBasics.Negation
open import Padova2025-zh-TW.ProvingBasics.Connectives.Disjunction
open import Padova2025-zh-TW.ProgrammingBasics.HigherOrder
```

在古典數學中，排中律可用，因此對任何命題 $A$ 都有 $A ∨ ¬A$。在建構性數學中，我們力求提供更多資訊，所以對任意命題
並沒有這個原理，但在許多重要的特殊情形下我們確實有它。如果 $A \vee \neg A$ 成立，我們就說 $A$ 是*可判定的*（decidable）。

在 Agda 中，我們這樣定義 `A` 可判定的見證所成的型別 `Dec A`。

```
data Dec (A : Set) : Set where
  yes : A   → Dec A
  no  : ¬ A → Dec A
```

換句話說，`Dec A` 只是 `A ⊎ ¬ A` 的變體，只是建構子的名稱改成更具描述性的 `yes` 與 `no`，而不是
[`left`](Padova2025-zh-TW.ProvingBasics.Connectives.Disjunction.html#_⊎_.left)
與 [`right`](Padova2025-zh-TW.ProvingBasics.Connectives.Disjunction.html#_⊎_.right)。


### 相等的可判定性

```
infix 4 _≟_
_≟_ : (a b : ℕ) → Dec (a ≡ b)
a ≟ b = {--}∨-elim yes no (eq? a b){--}
```


### 蘊涵的可判定性

證明：如果 `A` 與 `B` 都可判定，則 `A → B` 也可判定。

```
dec-→ : {A B : Set} → Dec A → Dec B → Dec (A → B)
-- Holify
dec-→ (yes a)  (yes b)  = yes (λ f → b)
dec-→ (yes a)  (no  ¬b) = no  (λ f → ¬b (f a))
dec-→ (no  ¬a) q        = yes (λ a → ⊥-elim (¬a a))
```


### 尋找具有指定性質的元素

```
find : {A : Set} {P : A → Set} → ((x : A) → Dec (P x)) → (xs : List A) → Any P xs ⊎ All (λ x → ¬ (P x)) xs
-- Holify
find P? [] = right []
find P? (x ∷ xs) with P? x | find P? xs
... | yes px  | _       = left  (here px)
... | no ¬px  | left  q = left  (there q)
... | no ¬px  | right q = right (¬px ∷ q)
```


### `All` 的可判定性

```
dec-All : {A : Set} {P : A → Set} → ((x : A) → Dec (P x)) → (xs : List A) → Dec (All P xs)
-- Holify
dec-All P? [] = yes []
dec-All P? (x ∷ xs) with P? x | dec-All P? xs
... | yes px  | yes pxs  = yes (px ∷ pxs)
... | yes px  | no  ¬pxs = no λ { (_  ∷ pxs) → ¬pxs pxs }
... | no  ¬px | _        = no λ { (px ∷ _)   → ¬px px   }
```


## 幾乎處處相等的函數

若兩個函數只在有限多個輸入上有差異，就稱它們*幾乎處處相等*（almost everywhere equal）：

```
_≗*_ : {X Y : Set} → (X → Y) → (X → Y) → Set
f ≗* g = Σ[ xs ∈ List _ ] ((x : _) → f x ≡ g x ⊎ x ∈ xs)
```

逐點相等的函數是幾乎處處相等的：

```
≗→≗* : {X Y : Set} {f g : X → Y} → f ≗ g → f ≗* g
-- Holify
≗→≗* p = [] , λ x → left (p x)
```

下面的引理說明，關係 `_≗*_` 確實是一個等價關係。

```
≗*-refl : {X Y : Set} {f : X → Y} → f ≗* f
-- Holify
≗*-refl = [] , λ x → left refl
```

```
≗*-sym : {X Y : Set} {f g : X → Y} → f ≗* g → g ≗* f
-- Holify
≗*-sym (xs , p) = xs , λ x → ∨-map sym (λ z → z) (p x)
```

```
≗*-trans : {X Y : Set} {f g h : X → Y} → f ≗* g → g ≗* h → f ≗* h
-- Holify
≗*-trans {X} {Y} {f} {g} {h} (xs , p) (xs' , p') = xs ++ xs' , go
  where
  go : (x : X) → f x ≡ h x ⊎ x ∈ xs ++ xs'
  go x with p x | p' x
  ... | left eq    | left eq'    = left (trans eq eq')
  ... | left _     | right x∈xs' = right (Any-++-right x∈xs')
  ... | right x∈xs | _           = right (Any-++-left  x∈xs)
```

我們也會借這個機會，為函數 `X → Y` 定義*正規化器（normalizer）*的概念。正規化器為每個 `_≗*_` 等價類選出一個代表元。
根據選擇公理，這樣的正規化器是存在的（我們偶爾會假設選擇公理，以探索它的後果）。

TODO：說明 record

```
record Normalizer (X Y : Set) : Set where
  field
    rep      : (X → Y) → (X → Y)
    rep≗*    : (f : X → Y) → rep f ≗* f
    respects : {f g : X → Y} → f ≗* g → rep f ≗ rep g
```

拆開來看：`rep` 是挑選代表元的函數；`rep≗*` 說明 `rep` 所挑的永遠與它的輸入落在同一個等價類中；`respects` 則是
選擇函數的定義性質，說明對任意兩個 `_≗*_` 等價的輸入，`rep` 都回傳相同的代表元。
