```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.VerifiedAlgorithms.CorrectByConstruction where
```

# 依構造而正確

相對於演算法正確性的事後驗證，另一種選擇是*依構造而正確的做法*（correct-by-construction approach）。
從一開始就運用依值型別的表達力，實作就保證能正確運作——不需要另外的驗證。

我們已經看過這種做法的例子：

- [`eq? : (a b : ℕ) → (a ≡ b) ⊎ ¬ (a ≡ b)`](Padova2025-zh-TW.ProvingBasics.Connectives.Disjunction.html#eq?)，來自析取那個模組——對照
  [由 `eq?-correct₁` 與 `eq?-correct₂` 做的事後處理](Padova2025-zh-TW.VerifiedAlgorithms.PostHocVerification.html#eq?-correct₁)。
- [`even-or-odd : (x : ℕ) → Even x ⊎ Odd x`](Padova2025-zh-TW.ProvingBasics.Connectives.Disjunction.html#even-or-odd)——對照
  函數 [`even?-correct₁` 與 `even?-correct₂`](Padova2025-zh-TW.VerifiedAlgorithms.PostHocVerification.html#even?-correct₁)。

依構造而正確做法在實務上的主要優點是，往往需要的程式碼比較少。它的主要缺點是，具有計算意義的值（也就是被傳來傳去的自然數）
與不具計算相關性的值（某些斷言的見證）交織在一起，可能會讓程式碼更難閱讀。

我們會在[插入排序的案例研究](Padova2025-zh-TW.VerifiedAlgorithms.InsertionSort.CorrectByConstruction.html)中更詳細地探討依構造而正確。
更多範例可以在 [Jesper Cockx 的教學](https://jespercockx.github.io/ohrid19-agda/)中找到。
