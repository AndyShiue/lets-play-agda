```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.Explorations.Forcing.Cohen (X : Set) (x₀ : X) where
```

# Cohen 強迫法

```
open import Padova2025-zh-TW.ProgrammingBasics.Lists
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
open import Padova2025-zh-TW.ProvingBasics.Negation
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.General
open import Padova2025-zh-TW.ProvingBasics.Equality.Lists
open import Padova2025-zh-TW.ProvingBasics.Equality.Reasoning.Core
open import Padova2025-zh-TW.ProvingBasics.Termination.Ordering
open import Padova2025-zh-TW.ProvingBasics.Termination.Gas using (Maybe; nothing; just; lookupMaybe; just-injective)
open import Padova2025-zh-TW.ProvingBasics.Connectives.Existential
```

這個模組以一個集合 `X` 為參數，我們假設它至少有一個元素 `x₀`（即有居民）。
本模組的目的是提供適當的定義，讓我們能探索基礎宇宙的一個強迫擴張，其中存在一個*由 `X` 的元素組成的泛型無窮序列*，
也就是一個*泛型函數 `f₀ : ℕ → X`*。這個函數會被證明與基礎宇宙的每個函數 `ℕ → X` 都不同；
因此 Cohen 強迫法讓我們能為基礎宇宙增添一個新的函數 `ℕ → X`（而不改變自然數或給定的型別 `X`）。

這個新函數之所以是*泛型*的，意思是：對於某種特定類型的每個性質 `P`，如果 `f₀` 具有它，
那麼基礎宇宙中的每個函數 `f : ℕ → X`（事實上甚至任何強迫擴張中的每個函數 `ℕ → X`）也具有它。


## 用有限串列逼近

為了逼近無窮序列 `ℕ → X`，我們採用 `X` 的元素所成的有限串列，如
[簡介中所述](Padova2025-zh-TW.Explorations.Forcing.Intro.html#approximating-from-below)。

```
L : Set
L = List X
```

給定謂詞 `P : L → Set`，下一個定義引進一個新的謂詞 `∇ P : L → Set`。斷言 `∇ P xs` 的直觀意思是：
無論有限近似 `xs` 隨時間如何演變為更好的近似 `ys`，最終 `P ys` 都會成立。運算子 `∇` 是所謂的*模態*（modality），
更精確地說，是*最終模態*（eventually modality）。

```
data ∇ (P : L → Set) : L → Set where
  -- 「P xs 現在就已經成立，不需要任何精煉。」
  now   : {xs : L} → P xs → ∇ P xs

  -- 「P xs 可能還不成立，我們至少要等
  -- xs 增長一個元素。」
  later : {xs : L} → ((x : X) → ∇ P (xs ∷ʳ x)) → ∇ P xs
```

作為這個模態如何使用的基本例子，讓我們證明：無論空串列 `[]` 隨時間如何演變，它最終都會成為一個長度至少為 3 的串列：

```
eventually-length-3 : ∇ (λ xs → length xs ≥ three) []
-- Holify
eventually-length-3 = later (λ a → later (λ b → later (λ c → now (s≤s (s≤s (s≤s z≤n))))))
```

有時候，運用 Agda 的
[實例引數（instance arguments）功能](https://agda.readthedocs.io/en/stable/language/instance-arguments.html)
可以減輕記法的負擔。藉由定義……

```
cur : {{L}} → L
cur {{xs}} = xs

∇' : ({{L}} → Set) → (L → Set)
∇' P xs = ∇ (λ ys → P {{ys}}) xs

withInstance : ({{L}} → Set) → (L → Set)
withInstance P xs = P {{xs}}
```

……我們可以把前面的例子改寫如下：

```
eventually-length-3' : ∇' (length cur ≥ three) []
-- Holify
eventually-length-3' = eventually-length-3
```


### 習題：Bind 運算子

得到形如 `∇ P xs` 的結果絕不是死路；相反地，我們可以這樣「在模態底下」進行推理。

```
_>>=_ : {P Q : L → Set} {xs : L} → ∇ P xs → ({ys : L} → P ys → ∇ Q ys) → ∇ Q xs
-- Holify
_>>=_ (now   p) k = k p
_>>=_ (later f) k = later λ x → f x >>= k
```


### 習題：最終任意長

證明對每個數字 `n`，空串列最終會演變成長度至少為 `n` 的串列。

```
eventually-length : (n : ℕ) → ∇' (length cur ≥ n) []
eventually-length zero     = {--}now z≤n{--}
eventually-length (succ n) = eventually-length n >>= λ len≥n →
  {--}later λ x →
    now (≤-trans (succ-monotone len≥n) (≡⇒≤ (sym (length-snoc _ x)))){--}
```


### 習題：單調謂詞

與上面類似，我們也可以證明一件有點麻煩的事：最終，我們的近似的長度會恰好是 3：

```
eventually-length-exactly-3 : ∇' (length cur ≡ three) []
-- Holify
eventually-length-exactly-3 = later λ a → later λ b → later λ c → now refl
```

非常照字面來看，這*是*真的：最終，*會*有一個時刻長度是 3。但我們可能會期望，一旦某個謂詞成立，
當我們進一步精煉近似時，它仍會保持成立。

為了解決這一點，我們會努力只把 `∇` 運算子應用於在下列意義下單調的謂詞：

```
Monotone : (P : L → Set) → Set
Monotone P = (xs : L) → P xs → (ys : L) → P (xs ++ ys)

Monotone' : (P : {{L}} → Set) → Set
Monotone' P = Monotone (withInstance P)
```

我們看到，雖然「長度至少為 3」是單調的，「長度恰好為 3」卻不是單調的：

```
monotone-length-3 : Monotone (λ xs → length xs ≥ three)
-- Holify
monotone-length-3 xs p ys = ≤-trans (+-monotone p z≤n) (≡⇒≤ (sym (length-homo xs ys)))
```

```
¬monotone-length-exactly-3 : ¬ Monotone (λ xs → length xs ≡ three)
-- Holify
¬monotone-length-exactly-3 f with f (x₀ ∷ x₀ ∷ x₀ ∷ []) refl (x₀ ∷ [])
... | ()
```


### 習題：∇ 保持單調性

一旦我們確保某個謂詞 P 是單調的，「最終 P」也是單調的：

```
∇-monotone : ∀ {P} → Monotone P → Monotone (∇ P)
-- Holify
∇-monotone P-mono xs p [] rewrite ++-[] xs = p
∇-monotone P-mono xs (now p) (y ∷ ys) = now (P-mono xs p (y ∷ ys))
∇-monotone P-mono xs (later ev-p) (y ∷ ys) = later λ x → subst (∇ _) (lemma x) (∇-monotone P-mono (xs ∷ʳ y) (ev-p y) (ys ∷ʳ x))
  where
  lemma : (x : X) → (xs ∷ʳ y) ++ (ys ∷ʳ x) ≡ (xs ++ (y ∷ ys)) ∷ʳ x
  lemma x = begin
      (xs ∷ʳ y) ++ (ys ∷ʳ x)
    ≡⟨ snoc-++ y xs (ys ∷ʳ x) ⟩
      xs ++ (y ∷ (ys ∷ʳ x))
    ≡⟨⟩
      xs ++ ((y ∷ ys) ∷ʳ x)
    ≡⟨ ++-snoc x xs (y ∷ ys) ⟩
      (xs ++ (y ∷ ys)) ∷ʳ x
    ∎
```


## 建構泛型序列

我們無法直接引進泛型序列 `f₀` 作為型別 `ℕ → X` 的實際函數，因為型別 `ℕ → X` 只包含基礎宇宙的函數。
但我們可以定義等式 `f₀ n ≡ x` 成立是什麼意思。從強迫擴張的觀點來看，這將是一個和其他斷言一樣的斷言，
特別是會有和其他斷言一樣的真值。然而，從基礎宇宙的觀點來看，這個斷言的真值將取決於當前的近似：

```
f₀[_]≡_ : {{L}} → ℕ → X → Set
f₀[ n ]≡ x = lookupMaybe cur n ≡ just x
```

泛型序列 `f₀` 作為單一個體，只存在於強迫擴張中。要從基礎宇宙的觀點談論它，我們需要追蹤當前的近似，
並準備好讓當前的近似演變成更好的近似。

例如，下面是我們表達 `f₀` 在每個輸入上都有定義的方式（即使沒有任何單一個有限近似是如此）：

::: More :::
```
lemma-lookup : {A : Set} → (xs : List A) (n : ℕ) → length xs > n → ∃[ x ] (lookupMaybe xs n ≡ just x)
-- Holify
lemma-lookup (x ∷ xs) (zero)   p       = x , refl
lemma-lookup (x ∷ xs) (succ n) (s≤s p) = lemma-lookup xs n p
```
:::

```
f₀-total : (n : ℕ) → ∇' (∃[ x ] (f₀[ n ]≡ x)) []
-- Holify
f₀-total n = eventually-length (succ n) >>= λ len>n → now (lemma-lookup _ _ len>n)
```

最後，一絲不苟的讀者還會想形式化地檢查 `f₀[ n ]≡ x` 是單調的：

```
f₀-≡-monotone : {n : ℕ} {x : X} → Monotone' (f₀[ n ]≡ x)
-- Holify
f₀-≡-monotone {zero}   (x ∷ xs) refl ys = refl
f₀-≡-monotone {succ n} (x ∷ xs) p       ys = f₀-≡-monotone xs p ys
```


## 強迫擴張中的蘊涵

設 `P` 與 `Q` 是兩個依賴於近似的命題，也就是型別 `L → Set` 的函數。「`P` 蘊涵 `Q`」應該是什麼意思？
更精確地說，給定一個近似 `xs`，「`P` 在階段 `xs` 蘊涵 `Q`」應該是什麼意思？

一種選擇是下面這個直截了當的定義，但我們拒絕它。

```
_⇒-naive_ : (L → Set) → (L → Set) → (L → Set)
P ⇒-naive Q = λ xs → (P xs → Q xs)
-- 被拒絕的提案
```

這個定義沒有考慮到 `xs` 演變成更好近似的可能性：即使 `P` 對當前的近似 `xs` 不成立，隨著我們精煉近似，這一點可能會改變。

也就是說，這個天真的定義不保持單調性：

```
⇒-naive-not-monotone : ((P Q : L → Set) → Monotone P → Monotone Q → Monotone (P ⇒-naive Q)) → ⊥
⇒-naive-not-monotone f = f (withInstance (f₀[ zero ]≡ x₀)) (λ _ → ⊥) {--}f₀-≡-monotone{--} {--}lemma₁{--} {--}[]{--} {--}lemma₂{--} {--}(x₀ ∷ []){--} {--}refl{--}
  where
  lemma₁ : Monotone' ⊥
  lemma₁ xs p ys = {--}p{--}

  lemma₂ : (withInstance (f₀[ zero ]≡ x₀) ⇒-naive (λ _ → ⊥)) []
  lemma₂ ()
```

下面這個在實務上實際採用的定義，解決了這個問題：

```
_⇒_ : (L → Set) → (L → Set) → (L → Set)
P ⇒ Q = λ xs → ((ys : L) → P (xs ++ ys) → Q (xs ++ ys))
```

```
⇒-monotone : {P Q : L → Set} → Monotone P → Monotone Q → Monotone (P ⇒ Q)
-- Holify
⇒-monotone P-mono Q-mono xs p⇒q ys zs p rewrite ++-assoc xs ys zs = p⇒q (ys ++ zs) p
```

Thorsten Altenkirch 把這種風格的定義稱為*說故事的邏輯*（the logic of storytelling）：假設在一個奇幻故事裡，
睿智的巫師給出忠告：「如果敵人越過那座橋，我們就會輸掉戰爭。」這個斷言不只是說，如果敵人現在越過橋，
主角們就會在那一刻輸掉戰爭。它更是說，如果在未來某個時刻，故事繼續發展之後，敵人越過了橋，那麼主角們就會在那時輸掉戰爭。


## 強迫擴張中的否定

同樣地，強迫擴張的底部命題（bottom proposition）的原則性定義*不是*……

```
⫫-naive : L → Set
⫫-naive xs = ⊥
```

……而是：

```
⫫-principled : L → Set
⫫-principled xs = ∇' ⊥ xs
-- 完整寫出來：⫫ xs = ∇ (λ ys → ⊥) xs
```

換句話說，`⫫-principled xs` 表示（最終，經過足夠多次精煉之後）`⊥` 會成立。這是一種正面地表達「給定的近似 `xs` 是死路」的方式。

幸運的是，由於我們（在這個檔案一開始）假設了型別 `X` 有居民（某個元素 `x₀`），這兩個定義實際上是等價的，
因此在剩下的發展中我們會採用比較簡單的那一個。

```
⫫ : L → Set
⫫ = ⫫-naive
```

原則性的定義確實蘊涵天真的定義；更一般地，如果 `R` *最終*成立、但不依賴於當前的近似，那麼它必定就是單純成立：

```
escape : {R : Set} {xs : L} → ∇' R xs → R
-- Holify
escape (now   p) = p
escape (later f) = escape (f x₀)
```

```
⫫-principled-naive : {xs : L} → ⫫-principled xs → ⫫-naive xs
-- Holify
⫫-principled-naive p = escape p
```

有了強迫擴張的底部命題，我們就能定義強迫擴張的否定運算。

```
infix 3 ⫬_
⫬_ : (L → Set) → (L → Set)
⫬_ P = P ⇒ ⫫
```

下面的觀察，偶爾對於確立某些雙重否定成立很有用。

```
dense→negneg : {P : L → Set} → ((xs : L) → ∃[ ys ] P (xs ++ ys)) → (⫬ ⫬ P) []
-- Holify
dense→negneg h = λ xs q → q (fst (h xs)) (snd (h xs))
```

::: More :::
事實上，更一般一點的結果也成立：

```
almostdense→negneg : {P : L → Set} → ((xs : L) → ¬ ¬ (∃[ ys ] P (xs ++ ys))) → (⫬ ⫬ P) []
-- Holify
almostdense→negneg h = λ xs q → h xs λ p → q (fst p) (snd p)
```

```
negneg→almostdense : {P : L → Set} → (⫬ ⫬ P) [] → ((xs : L) → ¬ ¬ (∃[ ys ] P (xs ++ ys)))
-- Holify
negneg→almostdense m xs f = m xs λ ys p → f (ys , p)
```
:::

這個結果（經過小幅修改後，在折疊的小節中被加強為等價）暗示，強迫擴張中的雙重否定可以讀作*可能*（potentially）。
斷言 `(⫬ ⫬ P) []` 表示，任何給定的近似 `xs` *有可能*演變成一個驗證 `P` 的串列，
而不預設它最終必定真的會演變成這樣的串列。


## 泛型序列的新穎性

讓我們證明，在雙重否定的意義下，泛型序列與基礎宇宙中任何給定的序列 `ℕ → X` 至少有一項不同——
假設存在某個無不動點的函數 `step : X → X`。

```
lemma-lookup-last : (xs : L) (a : X) → lookupMaybe (xs ++ (a ∷ [])) (length xs) ≡ just a
-- Holify
lemma-lookup-last []       a = refl
lemma-lookup-last (x ∷ xs) a = lemma-lookup-last xs a
```

```
f₀-fresh
  : (step : X → X) (fixpoint-free : {x : X} → step x ≡ x → ⊥)
  → (g : ℕ → X)
  → (⫬ ⫬ (∇' (∃[ n ] (f₀[ n ]≡ step (g n))))) []
-- Holify
f₀-fresh step fixpoint-free g = dense→negneg {∇' (∃[ n ] (f₀[ n ]≡ step (g n)))} λ xs →
  step (g (length xs)) ∷ [] , now (length xs , lemma-lookup-last xs (step (g (length xs))))
```

<!--
```code
f₀-fresh'
  : (step : X → X) (fixpoint-free : {x : X} → step x ≡ x → ⊥)
  → (g : ℕ → X)
  → (⫬ withInstance ((n : ℕ) → f₀[ n ]≡ g n)) []
f₀-fresh' step fixpoint-free g xs p = f₀-fresh step fixpoint-free g xs λ ys q →
  --escape (q >>= λ (n , eq) → now (fixpoint-free (just-injective (trans (sym eq) {!p n!}))))
  where
  just-injective : {A : Set} {x y : A} → just x ≡ just y → x ≡ y
  just-injective refl = refl
```
-->


## 泛型序列的泛型性

對於序列 `f : ℕ → X` 與數字 `n`，我們定義 `f ↓ n` 為 `f` 的前 `n` 個值所成的串列，
也就是串列 `f zero ∷ f one ∷ … ∷ f (pred n) ∷ []`。

```
_↓_ : (ℕ → X) → ℕ → List X
f ↓ zero   = []
f ↓ succ n = (f ↓ n) ∷ʳ f n
```

```
generic⇒actual : {P : L → Set} → (f : ℕ → X) (n : ℕ) → ∇ P (f ↓ n) → ∃[ m ] P (f ↓ m)
-- Holify
generic⇒actual f n (now   p) = n , p
generic⇒actual f n (later k) = generic⇒actual f (succ n) (k (f n))
```

下面的定理可以這樣讀：「如果強迫擴張中的泛型序列具有性質 `P`，那麼基礎宇宙中任何實際序列的（適當的有限前綴）也具有它。」

```
generic⇒actual₀ : {P : L → Set} → (f : ℕ → X) → ∇ P [] → ∃[ m ] P (f ↓ m)
generic⇒actual₀ f = generic⇒actual f zero
```


## Markov 原理

Markov 原理說：如果一個序列 `ℕ → ℕ` *並非沒有*零點，那麼它實際上有零點。作為雙重否定消去原理的一個實例，
Markov 原理在古典數學中是現成可用的；在大多數風格的建構性數學中，它是禁忌。具體來說，在這一節，
我們會探討 Markov 原理被泛型序列所否證。

讓我們先證明，泛型序列*並非沒有*某個值 `z` 作為它的項之一，如同 Markov 原理的前件。
（值 `z` 是自然數零的佔位符，只有在 `X = ℕ` 時，它才是我們固定的型別 `X` 的元素。）

```
generic-not-not-has-zero : (z : X) → (⫬ ⫬ (∇' (∃[ n ] f₀[ n ]≡ z))) []
-- Holify
generic-not-not-has-zero z = dense→negneg {(∇' (∃[ n ] f₀[ n ]≡ z))}
  λ xs → z ∷ [] , now (length xs , lemma-lookup-last xs z)
```

與 Markov 原理所預測的相反，現在讓我們也證明，泛型序列實際取到值 `z` 這件事*不*成立——
假設 `X` 中存在某個相異的值 `w`。這說明 Markov 原理對泛型序列並不有效。

```
↓-constant : (w : X) (n : ℕ) → (λ _ → w) ↓ n ≡ replicate n w
-- Holify
↓-constant w zero     = refl
↓-constant w (succ n) = trans (cong (_∷ʳ w) (↓-constant w n)) (sym (replicate-snoc n w))
```

```
not-generic-has-zero : (z w : X) → w ≢ z → ¬ (∇' (∃[ n ] f₀[ n ]≡ z) [])
not-generic-has-zero z w w≢z p with generic⇒actual₀ (λ _ → w) p
... | n , m , q = go n m {--}(trans (sym (cong (λ xs → lookupMaybe xs m) (↓-constant w n))) q){--}
  where
  go : (n m : ℕ) → lookupMaybe (replicate n w) m ≡ just z → ⊥
  go zero     m        = {--}λ (){--}
  go (succ n) zero     = {--}λ r → w≢z (just-injective r){--}
  go (succ n) (succ m) = {--}go n m{--}
```
