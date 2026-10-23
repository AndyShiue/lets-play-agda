```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.Explorations.CZF where
```

# 集合即樹

```
open import Padova2025-zh-TW.ProgrammingBasics.Booleans
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProvingBasics.Negation
open import Padova2025-zh-TW.ProvingBasics.Connectives.Existential
open import Padova2025-zh-TW.ProvingBasics.Connectives.Conjunction
open import Padova2025-zh-TW.ProvingBasics.Termination.Gas
open import Agda.Primitive
```

集合論與型別論，無論哪種風格，都可以作為大部分數學的基礎。而且它們彼此關聯：在集合論中，我們可以建造型別論的模型；
在型別論中，我們也可以建造集合論的模型。後者就是這個模組的目的：我們會引進一個型別 `V`，它的元素表示集合論中的集合。
我們會有像 `∅`（表示空集）與 `N`（表示自然數集）這樣的常數，像 `union`（取集合之集合的聯集）這樣的函數，
一個稱為 `_∈_` 的全域成員關係，等等。接著我們也能夠研究這個集合論模型的性質：選擇公理成立嗎？冪集公理呢？

我們要描述的模型是 Peter Aczel 的*集合即樹*模型。我們用任意分支的樹來表示集合；例如，集合
`{ x, {y,z}, {0,1,2,...} }` 由下面的樹表示：

<pre style="line-height: 1.2em">
         *
        ╱│╲
       ╱ │ ╲
      ╱  │  ╲
     ╱   │   ╲
    ╱    │    ╲
   x     *     *
        ╱ ╲   ╱│╲
       y   z 0 1 2 ...
</pre>

在 Agda 中，我們這樣表達這個想法。

```
data V : Set₁ where
  sup : {I : Set} → (I → V) → V
```

建構子 `sup` 接受一個索引型別 `I` 與一個以 `I` 為索引的樹族，回傳一棵新的樹，其根的子節點就是那些樹。一開始，
我們不認識任何樹；為了起步，我們使用空的樹族：

```
∅ : V
∅ = sup {⊥} empty-function   -- 只有一個根節點，沒有子節點
  where
  empty-function : ⊥ → V
  empty-function ()
```

給定樹 `x` 與 `y`，我們可以建立一棵新的樹，其根以 `x` 與 `y` 為子節點：

```
pair : V → V → V
pair x y = sup {Bool} f  -- 一個有兩個子節點的根節點
  where
  f : Bool → V
  f false = x
  f true  = y
```

下面的函數應該把集合 `x` 映射到單元素集合 `{ x }`，也就是把樹 `x` 映射到一棵樹，其根恰好只有一個子節點，即 `x`。

```
singleton : V → V
-- Holify
singleton x = sup {𝟙} (λ _ → x)
```

下面的函數應該輸入兩個集合 `x` 與 `y`，輸出有序的 _Kuratowski 對_ `{ {x}, {x,y} }`。

```
kuratowski : V → V → V
-- Holify
kuratowski x y = pair (singleton x) (pair x y)
```

對下面的某些結果來說，有下面兩個投影函數會很方便。它們讓我們不必對所討論的集合做 pattern matching，就能取得索引型別或樹族。

```
Index : V → Set
Index (sup {I} f) = I
```

```
fam : (x : V) → Index x → V
fam (sup {I} f) = f
```


## 集合論意義下的自然數

在集合論中，自然數通常從空集出發，如下建立。

```code
0 ≔ {}
1 ≔ { 0 }       = { {} }                  = 0 ∪ {0}
2 ≔ { 0, 1 }    = { {}, {{}} }            = 1 ∪ {1}
3 ≔ { 0, 1, 2 } = { {}, {{}}, {{},{{}}} } = 2 ∪ {2}
```

換句話說，一個數字被等同於它的前驅所成的集合；數字零沒有任何前驅，因此由空集表示。為了在 Agda 中模仿這個構造，
讓我們實作函數 `next`，它輸入集合 `X`，輸出 `X ∪ {X}`。

```
next : V → V
-- Holify
next x@(sup {I} f) = sup {Maybe I} g
  where
  g : Maybe I → V
  g nothing  = x
  g (just i) = f i
```

有了 `next`，我們就可以把每個實際的自然數轉換成它在集合論中的表示……

```
fromℕ : ℕ → V
-- Holify
fromℕ zero     = ∅
fromℕ (succ x) = next (fromℕ x)
```

……從而得到自然數的集合：

```
N : V
N = sup {ℕ} fromℕ
```


## 等價關係

在集合論中，集合 `{ x, y }` 與 `{ y, x }` 被認為是相等的；然而在 Agda 中，樹 `pair x y` 與 `pair y x` 是相異的：

      *           *
     ╱ ╲   vs.   ╱ ╲
    x   y       y   x

因此，我們需要引進一個等價關係 `_≈_`，表達兩棵樹表示同一個集合。

```
infix 4 _≈_
_≈_ : V → V → Set
sup {I} f ≈ sup {J} g =
  ((i : I) → ∃[ j ] (f i ≈ g j)) ×
  ((j : J) → ∃[ i ] (g j ≈ f i))
-- 「每個子節點 `f i` 都等價於 `sup g` 的某個子節點，
-- 反之亦然。」
```

```
≈-refl : {x : V} → x ≈ x
-- Holify
≈-refl {sup f} = (λ i → i , ≈-refl) , (λ j → j , ≈-refl)
```

```
≈-sym : {x y : V} → x ≈ y → y ≈ x
-- Holify
≈-sym {sup f} {sup g} (p , p') = p' , p
```

```
≈-trans : {x y z : V} → x ≈ y → y ≈ z → x ≈ z
-- Holify
≈-trans {sup {I} f} {sup {J} g} {sup {K} h} (p , p') (q , q')
  = (λ i → fst (q  (fst (p  i))) , ≈-trans (snd (p  i)) (snd (q  (fst (p  i)))))
  , (λ k → fst (p' (fst (q' k))) , ≈-trans (snd (q' k)) (snd (p' (fst (q' k)))))
```


## 成員關係

集合論的基礎是成員關係 $\in$。這個關係也造成了集合論與型別論之間最明顯的差異之一：在集合論中，對任意兩個集合 $X$ 與 $Y$，
運算式「$X \in Y$」永遠是一個定義良好的斷言——也許可證明，也許可反駁，但無論如何是一個語法上正確構成的命題。

相對地，在大多數風格的型別論中，型別判斷 `X : Y` 從來不是一個數學上有趣的問題。取而代之，型別判斷是可判定的——確實，
驗證良型別性正是 Agda 核心所做的事。`X` 要嘛被機械地知道具有型別 `Y`，要嘛它具有某個其他型別（或根本是型別錯誤）。

```
_∈_ : V → V → Set
x ∈ y = ∃[ i ] (fam y i ≈ x)
-- 「x 是 sup f 的元素，若且唯若它等價於 sup f 的某個
-- 子節點。」
```

```
cong-∈ : {x y z : V} → x ≈ y → z ∈ x → z ∈ y
-- Holify
cong-∈ {sup f} {sup g} {sup h} p (i , eq) = fst (fst p i) , ≈-sym (≈-trans (≈-sym eq) (snd (fst p i)))
```

```
cong-∈' : {x y z : V} → x ≈ y → x ∈ z → y ∈ z
-- Holify
cong-∈' {sup f} {sup g} {sup h} p (q , q') = q , ≈-trans q' p
```

作為基本的健全性檢查，每個子節點 `f i` 都是 `sup f` 的元素；下面是一個方便函數，供下面的某些證明使用。

```
∈-basic : {x : V} → (i : Index x) → fam x i ∈ x
-- Holify
∈-basic {sup {I} f} i = i , ≈-refl
```

此外，空集確實是空的：

```
∅-empty : {x : V} → x ∈ ∅ → ⊥
-- Holify
∅-empty ()
```

而上面的 `singleton` 函數確實做到了它名字所暗示的事：

```
singleton-correct₁ : {x : V} → (y : V) → y ∈ singleton x → y ≈ x
-- Holify
singleton-correct₁ y (i , p) = ≈-sym p
```

```
singleton-correct₂ : {x : V} → x ∈ singleton x
-- Holify
singleton-correct₂ = tt , ≈-refl
```


## 外延性公理

```
infix 4 _↔_
_↔_ : {ℓ ℓ' : Level} → Set ℓ → Set ℓ' → Set (ℓ ⊔ ℓ')
A ↔ B = (A → B) × (B → A)
```

集合論的一個基本原理是，集合由它們的元素決定：兩個集合相等，若且唯若它們有相同的元素。我們的集合即樹的集合論模型
滿足這個原理（只要把嚴格相等換成 `_≈_`）。

```
extensionality₁ : {x y : V} → ((z : V) → z ∈ x ↔ z ∈ y) → x ≈ y
-- Holify
extensionality₁ {sup f} {sup g} p
  = (λ i → fst (fst (p (f i)) (i , ≈-refl)) , ≈-sym (snd (fst (p (f i)) (i , ≈-refl))))
  , (λ j → fst (snd (p (g j)) (j , ≈-refl)) , ≈-sym (snd (snd (p (g j)) (j , ≈-refl))))
```

```
extensionality₂ : {x y : V} → x ≈ y → ((z : V) → z ∈ x ↔ z ∈ y)
-- Holify
extensionality₂ p z = cong-∈ p , cong-∈ (≈-sym p)
```


## 基本的集合建構公理

```
existence-empty-set : ∃[ x ] ((y : V) → y ∈ x → ⊥)
-- Holify
existence-empty-set = ∅ , λ { (sup f) () }
```

```
pairing-axiom : (x y : V) → ∃[ z ] (x ∈ z × y ∈ z)
-- Holify
pairing-axiom x y = pair x y , ((false , ≈-refl) , (true , ≈-refl))
```

下面的函數應該輸入一個集合的集合，輸出它們的聯集。在黑板上，這寫成「⋃ M」。

```
union : V → V
-- Holify
union (sup {I} f) = sup {Σ I (λ i → Index (f i))} λ (i , j) → fam (f i) j
```

```
union-axiom : (x : V) → ∃[ y ] ((z : V) → z ∈ y ↔ (∃[ w ] (z ∈ w × w ∈ x)))
-- Holify
union-axiom x@(sup {I} f) = union x , λ z
  → (λ { ((i , j) , eq) → f i , (j , eq) , i , ≈-refl })
  , λ { (w , q , i , eq) →
      let r = cong-∈ (≈-sym eq) q
      in (i , fst r) , snd r }
```


## 羅素悖論附近

```
no-set-contains-itself : (v : V) → v ∈ v → ⊥
-- Holify
no-set-contains-itself (sup f) p@(i , eq) = no-set-contains-itself (f i) (cong-∈ (≈-sym eq) (cong-∈' {z = sup f} (≈-sym eq) p))
```

我們很容易想引進所有集合的集合 `u`，如下：

```code
u : V
u = sup {V} (λ x → x)
```

然而，這個嘗試會被 Agda 拒絕，並給出訊息「`Set₁ != Set` when checking that the expression `V` has type `Set`」。
節點的子節點必須由小型別（`Set` 中的型別）來索引；但 `V` 本身不是小型別，而是 `Set₁` 中的型別。

Agda 支援不安全的選項 `--type-in-type`，它會使 universe 階層塌縮。這樣 `u` 的定義就是良型別的，並可如下導出矛盾。

```code
u∈u : u ∈ u
u∈u = u , ≈-refl

contradiction : ⊥
contradiction = no-set-contains-itself u u∈u
```

::: Todo :::
待補：讓這部分能在子模組中探索
:::


## 集合論意義下的序數

集合 `x` 稱為*遞移的*，若且唯若 `a ∈ b ∈ x` 蘊涵 `a ∈ x`：

```
Transitive : V → Set₁
Transitive x = (a b : V) → a ∈ b → b ∈ x → a ∈ x
```

```
Transitive-extensional : (x y : V) → x ≈ y → Transitive x → Transitive y
-- Holify
Transitive-extensional x y eq f a b a∈b b∈y = cong-∈ eq (f a b a∈b (cong-∈ (≈-sym eq) b∈y))
```

有了遞移性的概念，我們就能定義序數的概念：一個集合稱為*序數*，若且唯若它是遞移的，且它的所有元素都是遞移的。

```
Ordinal : V → Set₁
Ordinal x = Transitive x × ((a : V) → a ∈ x → Transitive a)
```

作為起點，空集（表示零）是序數：

```
∅-ordinal : Ordinal ∅
-- Holify
∅-ordinal = (λ a b a∈b ()) , (λ a ())
```

`next` 運算保持序數。因此，所有自然數都是序數。

```
next-ordinal : (x : V) → Ordinal x → Ordinal (next x)
-- Holify
next-ordinal (sup f) (x-transitive , elts-transitive)
  = (λ { a b a∈b (nothing , eq) → let (k , p) = cong-∈ (≈-sym eq) a∈b in just k , p
       ; a b a∈b (just j  , eq) → let (k , p) = x-transitive a b a∈b (j , eq) in just k , p })
  , (λ { a (nothing , eq) b c b∈c c∈a → cong-∈ eq (x-transitive b c b∈c (cong-∈ (≈-sym eq) c∈a))
       ; a (just j , eq) → elts-transitive a (j , eq) })
```

```
fromℕ-ordinal : (n : ℕ) → Ordinal (fromℕ n)
-- Holify
fromℕ-ordinal zero     = ∅-ordinal
fromℕ-ordinal (succ n) = next-ordinal (fromℕ n) (fromℕ-ordinal n)
```

```code
N-ordinal : Ordinal N
-- Holify
N-ordinal
  = (λ { a b a∈b (n , eq) → {! !} })
  , (λ { a (n , eq) → Transitive-extensional _ _ eq (fst (fromℕ-ordinal n)) })
```
