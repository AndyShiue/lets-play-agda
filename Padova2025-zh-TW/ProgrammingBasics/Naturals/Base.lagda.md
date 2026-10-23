```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProgrammingBasics.Naturals.Base where
```

# 定義

在上一章，我們定義了有限型別：布林值。Agda 也支援無限型別。自然數是最原始的例子，我們現在就來探索它。
自然數的型別是由下面三行 Agda 程式碼創造出來的。

```
data ℕ : Set where  -- 輸入「ℕ」請打「\bN」
  zero : ℕ
  succ : ℕ → ℕ      -- 「successor（後繼）」的縮寫
```

對每個輸入，`succ` 建構子都會輸出一個全新鑄造的型別 `ℕ` 的值。因此型別 `ℕ` 包含下列相異的元素：

```
-- zero
-- succ zero
-- succ (succ zero)
-- succ (succ (succ zero))
-- ...
```

我們可以為常用的數字定義縮寫：

```
one : ℕ
one = succ zero

two : ℕ
two = succ one

three : ℕ
three = succ two

four : ℕ
four = succ three

five : ℕ
five = succ four

ten : ℕ
ten = succ (succ (succ (succ (succ (succ (succ (succ (succ (succ zero)))))))))
```

::: Aside :::
用一元（unary）寫自然數很痛苦。只要在獨立的一行加上 `{-# BUILTIN NATURAL ℕ #-}`，就能請 Agda 啟用適當的語法糖。
從此我們可以寫像 `42` 這樣的十進位運算式，Agda 會在背後透明地把它展開（desugar）成適當的 `succ` 呼叫：
`succ (succ (... (zero)))`。
:::
