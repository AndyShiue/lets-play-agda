```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.Explorations.Uncountability.Impossible where
```

# 看似不可能的程式與證明

```
open import Padova2025-zh-TW.ProgrammingBasics.Booleans
open import Padova2025-zh-TW.ProvingBasics.Connectives.Disjunction
open import Padova2025-zh-TW.ProvingBasics.Connectives.Existential
open import Padova2025-zh-TW.ProvingBasics.Negation
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.General
import Padova2025-zh-TW.ProvingBasics.Equality.Booleans as B
```

可判定謂詞 `P : X → Bool` 的*根*是一個值 `x : X`，使得 `P x ≡ false`（如同 `ℕ` 值函數的根）。
讓我們稱型別 `X` 是*可搜尋的*（searchable），若且唯若每個可判定謂詞 `P : X → Bool` 都有根，或者恆為 `true`。

```
Searchable : Set → Set
Searchable X = (P : X → Bool) → (∃[ x ] P x ≡ false) ⊎ ((x : X) → P x ≡ true)
```

在古典數學中，每個型別都平凡地是可搜尋的。但只要我們不公設古典數學，這個可搜尋性條件在 Agda 中表達的是強得多的主張——
也就是說，給定謂詞 `P`，我們能藉由一個演算法來*判定*哪一個選項成立。

（對有居民的型別）與之等價的，是下面這個與[酒客悖論](https://zh.wikipedia.org/zh-tw/%E9%A5%AE%E8%80%85%E6%82%96%E8%AE%BA)相關的性質。

```
HasDrinkers : Set → Set
HasDrinkers X = (P : X → Bool) → ∃[ a ] (P a ≡ true → ((x : X) → P x ≡ true))
```

```
false≢true : false ≢ true
false≢true ()
```

```
HasDrinkers⇒Searchable : {X : Set} → HasDrinkers X → Searchable X
-- Holify
HasDrinkers⇒Searchable find P with find P
... | a , p with P a in eq
... | false = left  (a , eq)
... | true  = right (p refl)
```

```
Searchable⇒HasDrinkers : {X : Set} → X → Searchable X → HasDrinkers X
-- Holify
Searchable⇒HasDrinkers x₀ dec P with dec P
... | left  (x , eq) = x  , λ eq' → ⊥-elim (false≢true (trans (sym eq) eq'))
... | right f        = x₀ , λ _   → f
```


## 習題：布林值是可搜尋的

像 `Bool` 這樣的有限型別是可搜尋的：要判定一個謂詞有沒有根，我們可以依序檢查型別的每個元素。

```
Bool-searchable : Searchable Bool
Bool-searchable P with P false in eq | P true in eq'
... | false | y     = {--}left  (false , eq){--}
... | true  | false = {--}left  (true  , eq'){--}
... | true  | true  = {--}right λ { false → eq ; true → eq' }{--}
```

還有一個巧妙的證明，運用了關於布林值相等結果那個模組中
[費解的 `is-tautology₁'` 函數](Padova2025-zh-TW.ProvingBasics.Equality.Booleans.html#tautologies)的想法。

```
Bool-hasDrinkers : HasDrinkers Bool
Bool-hasDrinkers P = P false , {--}B.part₂ P{--}
```


## 無限但可搜尋的型別？

```
open import Padova2025-zh-TW.ProgrammingBasics.Lists
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Operators
open import Padova2025-zh-TW.ProvingBasics.Termination.Gas
open import Padova2025-zh-TW.Explorations.Uncountability.Applications
```

令人驚奇的是，除了有限型別之外，*確實存在可搜尋的無限型別*。

- 在任何有[函數外延性](Padova2025-zh-TW.Cubical.Issues.FunctionExtensionality.html)可用的建構性數學風格中，例如 Cubical Agda，
  「自然數的單點緊緻化」（粗略地說，就是添加一個點 `∞` 的 `ℕ`）是可搜尋的。

- 在某些風格中，甚至 [Cantor 空間](Padova2025-zh-TW.Explorations.Uncountability.Applications.html#Cantor)也是可搜尋的——
  儘管它是不可數的。

這個令人震驚的事實已經被 Martín Escardó 徹底探索過。要跳進這個迷人的領域，可以看看
[Andrej Bauer 部落格上的這篇經典文章](https://math.andrej.com/2007/09/28/seemingly-impossible-functional-programs/)、
[這段 Agda 程式碼](https://martinescardo.github.io/TypeTopology/TypeTopology.GenericConvergentSequenceCompactness.html)或
[這些投影片](https://www.ioc.ee/~tarmo/tsem16/escardo2605-slides.pdf)。

下面的模組提供了一個迷你的玩具版本（不假思索地使用一個「會」終止、但無法證明其終止的遞迴）。

```
open import Padova2025-zh-TW.Explorations.Uncountability.Impossible.Toy
```

這個模組匯出一個函數 `root : (Cantor → Bool) → Maybe List`，它要嘛回傳 `just xs`，其中 `xs` 是輸入謂詞某個根的前五項
（需要時也可以產生更多項），要嘛在不存在根時回傳 `nothing`。當應用於在空的上下文中定義、不使用任何假設或公設的謂詞時，
函數 `root` 永遠正確運作，儘管這個後設斷言在 Agda 中無法證明。

::: Aside :::
更精確地說，如果輸入函數是一致連續的，`root` 函數所使用的遞迴就會終止。對某些風格的 Martin-Löf 型別論來說，有一個後設定理：
空上下文中每個型別 `Cantor → Bool` 的 term 確實都是一致連續的，我們也可以想像這個結果對 Agda 同樣成立
（不過嚴格說來 Agda 是欠規定的）。細節請見 Thierry Coquand 與 Guilhem Jaber 的
[這份筆記](https://guilhem.jaber.fr/NoteForcingTypeTheory.pdf)，許多新結果以及文獻指引則請見 Martin Baillon 的
[博士論文](https://theses.hal.science/tel-04617881v1/document/)。
:::

自己試試看：隨意填上這個 hole；按 `C-c C-v`；輸入 `root example`；觀察結果。例如，如果 `example xs` 被定義為
`not (xs zero) || xs one || not (xs two)`，那麼 `root example` 會化約為 `just (true ∷ false ∷ true ∷ false ∷ false ∷ [])`。

```
example : Cantor → Bool
example xs = {--}true{--}
```
