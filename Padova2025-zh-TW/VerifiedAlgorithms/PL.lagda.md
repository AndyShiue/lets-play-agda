```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.VerifiedAlgorithms.PL where
```

# 案例研究：編譯器與直譯器

```
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Arithmetic
open import Padova2025-zh-TW.ProgrammingBasics.Lists
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
open import Padova2025-zh-TW.ProvingBasics.Equality.Reasoning.Core
```

在這個模組中，我們先定義一個玩具程式語言的語法，並實作一個參考求值器。接著我們寫出一個虛擬堆疊機器的模擬器，
並寫一個把玩具語言編譯成這個堆疊機器程式的編譯器。最後，我們相對於參考求值器，驗證編譯器的正確性。

本模組是根據 Jesper Cockx 的
[Programming and Proving in Agda](https://github.com/jespercockx/agda-lecture-notes/raw/master/agda.pdf)
第 4 節寫成的。

```
data Expr : Set where
  lit : ℕ → Expr             -- 字面值（常數）
  add : Expr → Expr → Expr   -- 加法
```

```
example : Expr
example = add (lit zero) (add (lit (succ zero)) (lit zero))
-- 應該求值為 succ zero
```

```
eval : Expr → ℕ
eval (lit x)   = x
eval (add a b) = eval a + eval b
```

```
_ : eval example ≡ succ zero
_ = refl
```

```
-- 我們的堆疊機器的運算型別
data Op : Set where
  PUSH : ℕ → Op
  SUM  : Op
```

```
Stack : Set
Stack = List ℕ

Code : Set
Code = List Op
-- 例如，PUSH 3 ∷ PUSH 5 ∷ SUM 是型別 Code 的一個值。
-- 串列 PUSH 3 ∷ SUM 也是型別 Code 的一個值；不過，執行它會失敗。
```

```
-- 我們虛擬機器的模擬器
run : Code → Stack → Stack
run []           s             = s
run (PUSH x ∷ c) s             = run c (x ∷ s)
run (SUM ∷ c)    (a ∷ (b ∷ s)) = run c ((a + b) ∷ s)
run _            _             = []
```

```
-- 我們玩具程式語言的編譯器
compile : Expr → Code → Code
compile (lit x)   c = PUSH x ∷ c
compile (add a b) c = compile b (compile a (SUM ∷ c))
```

```
theorem : (e : Expr) (c : Code) (s : Stack) → run (compile e c) s ≡ run c (eval e ∷ s)
-- Holify
theorem (lit x)   c s = refl
theorem (add a b) c s = begin
  run (compile (add a b) c) s             ≡⟨⟩
  run (compile b (compile a (SUM ∷ c))) s ≡⟨ theorem b (compile a (SUM ∷ c)) s ⟩
  run (compile a (SUM ∷ c)) (eval b ∷ s)  ≡⟨ theorem a (SUM ∷ c) (eval b ∷ s) ⟩
  run c ((eval a + eval b) ∷ s)           ≡⟨⟩
  run c (eval (add a b) ∷ s)              ∎
```

```
compile₀ : Expr → Code
compile₀ e = compile e []
```

```
theorem₀ : (e : Expr) → run (compile₀ e) [] ≡ eval e ∷ []
theorem₀ e = theorem e [] []
```
