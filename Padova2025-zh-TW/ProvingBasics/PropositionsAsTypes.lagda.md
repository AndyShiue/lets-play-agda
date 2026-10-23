```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProvingBasics.PropositionsAsTypes where
```

# 命題即型別

這裡有幾個關於偶數與奇數的事實。它們沒有一個特別驚天動地。我們要如何在 Agda 中表達這些斷言，又要如何證明它們？
我們要如何讓 Agda 從「程式設計模式」切換到「邏輯模式」？

<!-- update EvenOdd.lagda.md in case numbering changes -->

1. **零是偶數。** \
   $\mathrm{Even}(0)$

   ::: More :::
   ```code
   base-even : Even zero
   "base-even is a witness that zero is even."
   ```
   :::

2. **如果 $a$ 是偶數，則 $a+2$ 也是。** \
   $\forall(a \in \mathbb{N}).\ (\mathrm{Even}(a) \Rightarrow \mathrm{Even}(a+2))$

   ::: More :::
   ```code
   step-even : (a : ℕ) → Even a → Even (succ (succ a))
   "step-even is a function which reads as input
   - a number `a` and
   - a witness that `a` is even,
   and outputs
   - a witness that `succ (succ a)` is even."
   ```
   :::

3. **偶數的和是偶數。** \
   $\forall(a,b \in \mathbb{N}).\ ((\mathrm{Even}(a) \wedge \mathrm{Even}(b)) \Rightarrow \mathrm{Even}(a+b))$

   ::: More :::
   ```code
   sum-even : (a : ℕ) → (b : ℕ) → Even a → Even b → Even (a + b)
   "sum-even is a function which reads as input
   - a number `a`,
   - a number `b`,
   - a witness that `a` is even and
   - a witness that `b` is even,
   and outputs
   - a witness that `a + b` is even."
   ```
   :::

4. **偶數的後繼是奇數。** \
   $\forall(a \in \mathbb{N}).\ (\mathrm{Even}(a) \Rightarrow \mathrm{Odd}(a+1))$

   ::: More :::
   ```code
   succ-even : (a : ℕ) → Even a → Odd (succ a)
   "succ-even is a function which reads as input
   - a number `a` and
   - a witness that `a` is even,
   and outputs
   - a witness that `succ a` is odd."
   ```
   :::

5. **沒有任何數字同時是偶數與奇數。** \
   **如果一個數字 $a$ 同時是偶數與奇數，則會導出矛盾。** \
   $\forall(a \in \mathbb{N}).\ ((\mathrm{Even}(a) \wedge \mathrm{Odd}(a)) \Rightarrow ↯)$

   ::: More :::
   ```code
   even-and-odd : (a : ℕ) → Even a → Odd a → ⊥
   "even-and-odd is a function which reads as input
   - a number `a`,
   - a witness that `a` is even and
   - a witness that `a` is odd,
   and outputs
   - a witness of a contradiction."
   ```
   :::

令人驚奇的是，Agda 把寫程式與做證明這兩種活動統一了起來。並不存在與「程式設計模式」分開的「邏輯模式」。
取而代之的是，兩者使用同一種語言。

這項壯舉是靠*依值型別*（dependent types）才做得到的。大多數靜態型別的程式語言都有的常見型別，例如 `ℕ`、`List ℕ` 或
`ℕ → ℕ`，與依值型別不同；依值型別是依賴於值的型別。這類型別最有名的例子或許是 `Vector X n`，也就是由 `X` 的元素組成、
長度為 `n` 的串列，其中 `n` 可以是只在執行期才決定的未知值。

要形式化所列出的這些關於偶數與奇數的斷言，關鍵的洞察是：**對每個數字 `n`，我們可以設立一個依值型別 `Even n`，
其中包含「數字 `n` 是偶數」的所謂*見證*（witnesses）。** 我們這樣設立它：對那些不是偶數的數字 `n`，所得到的型別 `Even n`
會是空的；只有對那些是偶數的數字 `n`，所得到的型別才有居民。

所列出的斷言就可以用適當的常數見證，或是操作這類見證的函數來形式化——點擊上面的按鈕，看看怎麼做。
例如，要證明某個命題 $P$ 蘊涵另一個命題 $Q$，在 Agda 中我們建構一個函數，把 $P$ 的見證映射到 $Q$ 的見證。

形式化這些斷言之後，我們現在可以來證明它們了。我們在[下一個模組](Padova2025-zh-TW.ProvingBasics.EvenOdd.html)中進行。
