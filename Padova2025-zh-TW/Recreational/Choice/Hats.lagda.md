```
{-# OPTIONS --cubical-compatible #-}

open import Padova2025-zh-TW.ProgrammingBasics.Lists
open import Padova2025-zh-TW.ProgrammingBasics.HigherOrder
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.General
open import Padova2025-zh-TW.ProvingBasics.Connectives.Existential
open import Padova2025-zh-TW.ProvingBasics.Connectives.Disjunction
open import Padova2025-zh-TW.ProvingBasics.Connectives.Conjunction
open import Padova2025-zh-TW.ProvingBasics.Connectives.More

module Padova2025-zh-TW.Recreational.Choice.Hats
  (Player : Set)
  (Color  : Set)
  (dummy  : Color)
  (_≡?_   : (p q : Player) → p ≡ q ⊎ p ≢ q)
  where
```

# 無限帽子問題

一隻邪惡的怪物給無限多個小矮人戴上各種顏色的帽子。每個小矮人都能看見（並在認知上處理）其他每個小矮人的帽子顏色，
但嚴格禁止偷看自己的顏色。相反地，怪物會要求他們每一個人私下猜測自己帽子的顏色。

有沒有一種策略，讓小矮人們遵循它時，能確保*只有有限多個*小矮人猜錯自己的顏色？這個策略必須適用於怪物所指定的任何具體顏色。

小矮人之間只能在帽子戴上之前溝通。顏色的型別是已知的（`Color`，在本模組的開頭固定），小矮人的型別也是已知的（`Player`），
但怪物所選顏色的分佈則一無所知。另請注意，有無限多個小矮人猜對，並不一定表示只有有限多個猜錯。
我們假設顏色的型別有居民（`dummy`）。


## 顯然沒有成功的策略？

怪物提出的挑戰似乎不可能達成：怪物可以隨心所欲地分配顏色；觀察所有其他小矮人的帽子顏色，
絲毫不會限制你自己帽子顏色的可能性。

令人驚訝的是，儘管看起來如此，確實存在成功的策略——若且唯若（選擇公理的某個實例）選擇公理成立。我們會在下面探討這一點。
（小矮人是否有辦法用上這個策略，則是另一個問題。）


## 形式化這個問題

一個*組態*（configuration）是帽子顏色對玩家的一種可能分配：

```
Config : Set
Config = Player → Color
```

一個*（針對特定玩家 `p` 的）盲組態*（blinded configuration）是一個函數，把除了 `p` 以外的每個玩家映射到一個顏色：

```
BlindedConfig : Player → Set
BlindedConfig p = (q : Player) → q ≢ p → Color
```

給定一個組態，我們可以限制它的定義域，得到一個盲組態。

```
blind : (p : Player) → Config → BlindedConfig p
blind p c = λ q _ → c q
```

一個*（針對玩家 `p` 的）玩家策略*告訴 `p`，在得知所有其他玩家的顏色時，應該提交哪個顏色作為猜測：

```
PlayerStrategy : Player → Set
PlayerStrategy p = BlindedConfig p → Color
```

一個*團隊策略*告訴每位玩家要使用哪個玩家策略：

```
TeamStrategy : Set
TeamStrategy = (p : Player) → PlayerStrategy p
```

給定一個組態與一個團隊策略，我們可以向每位玩家徵求猜測，從而得到一個猜測的組態：

```
run : TeamStrategy → Config → Config
run s c p = s p (blind p c)
```

最後，我們可以形式化*成功的團隊策略*的概念。下面的定義所使用的關係 `_≗*_` 定義於
[Padova2025-zh-TW.ProvingBasics.Connectives.More](Padova2025-zh-TW.ProvingBasics.Connectives.More.html#_≗*_)，
表達兩個組態只在有限多個玩家上不同。

```
isSuccessful : TeamStrategy → Set
isSuccessful s = (c : Config) → run s c ≗* c
```


## 一些觀察

給定一個盲組態與一個顏色，我們得到一個完整的組態：

```
unblind : (p : Player) → BlindedConfig p → Color → Config
unblind p c x q with q ≡? p
... | left  _   = x
... | right p≢q = c q p≢q
```

用任意顏色對一個盲組態「解盲」，會得到幾乎相同的組態：

```
unblind-blind : (c : Config) (x : Color) (p : Player) → unblind p (blind p c) x ≗* c
-- Holify
unblind-blind c x p = p ∷ [] , go
  where
  go : (q : Player) → unblind p (blind p c) x q ≡ c q ⊎ q ∈ p ∷ []
  go q with q ≡? p
  ... | left  q≡p = right (here q≡p)
  ... | right q≢p = left  refl
```


## 一個成功的策略

劇透警告。

::: More :::
讓我們依照 `_≗*_` 把組態的型別分割成等價類。根據選擇公理，存在一個選擇函數，為每個等價類挑選代表元。
把這件事改寫成不明確提到等價類的形式，就是選擇公理憑空造出了型別
[`Normalizer Player Color`](Padova2025-zh-TW.ProvingBasics.Connectives.More.html#Normalizer) 的一個值。

::: More :::
有了這樣一個共享的選擇函數，我們就能為玩家們組裝出一個成功的策略，如下。儘管每位玩家都不知道邪惡的怪物究竟選了哪個組態，
每位玩家都能確定地決定真實組態所屬的等價類。被問到自己顏色的猜測時，每位玩家都應該回答：自己的顏色在這個等價類所選的代表元中是什麼，
就回答什麼。由於代表元保證只在有限多個玩家上與真實組態不同，因此只有有限多個玩家猜錯。

讓我們在 Agda 中實作這個想法。

```
assembleStrategy : (Config → Config) → TeamStrategy
-- Holify
assembleStrategy r p bc = r (unblind p bc dummy) p
```

```
correct : (r : Normalizer Player Color) → isSuccessful (assembleStrategy (Normalizer.rep r))
-- Holify
correct r c = ≗*-trans (≗→≗* run≗r) (rep≗* c)
  where
  open Normalizer r
  run≗r : run (assembleStrategy rep) c ≗ rep c
  run≗r p = respects (unblind-blind c dummy p) p
```

*在這裡，我們把小矮人們留在他們的營火旁，留在等待著他們的漫漫長夜裡：他們要經過多少個夜晚——多少輩子——才能為不可數多個等價類中的每一個，
達成唯一代表元的共識？*

:::
:::
