```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.ProvingBasics.Equality.General where
```

# 關於相等的一般結果

```
open import Padova2025-zh-TW.ProvingBasics.Equality.Base
```


## 習題：對稱性

在黑板數學中，有個基本結果：$x = y$ 蘊涵 $y = x$。在 Agda 中，我們有一個函數，把型別 `x ≡ y` 的值轉換成
型別 `y ≡ x` 的值。請填上這個 hole：

```
sym : {A : Set} {x y : A} → x ≡ y → y ≡ x
-- Holify
sym refl = refl
```

::: Hint :::
1. 先在 `=` 符號左邊引進一個變數，也就是讓該行寫成 `sym p = ?`。接著用 `C-c C-l` 重新載入檔案，否則 hole 不會知道變數 `p`。
2. 按 `C-c ,` 請 Agda 印出目前情況的摘要。
3. 然後對 `p` 做 case split。
4. 接著 Agda 會認出 `p` 唯一的可能就是 `refl`。再按一次 `C-c ,` 要求重新印出情況。注意情況已經簡化了。
5. 在 hole 裡填入 `refl`，按 `C-c C-SPACE`，然後重新載入檔案。
:::


## 習題：同餘

在黑板數學中，有個基本結果：若對等式兩邊施加相同的運算，等式仍然成立：若 $x = y$，則 $f(x) = f(y)$。
在 Agda 中，我們有一個函數，把型別 `x ≡ y` 的值轉換成型別 `f x ≡ f y` 的值：

```
cong : {A B : Set} {x y : A} → (f : A → B) → x ≡ y → f x ≡ f y
-- Holify
cong f refl = refl
```


## 習題：遞移性

填上這個 hole，從而證明相等是遞移的。

```
trans : {A : Set} {x y z : A} → x ≡ y → y ≡ z → x ≡ z
-- Holify
trans refl q = q
```


## 習題：逐點相等

證明相等的函數有相等的值。
（反過來則是一個稱為「函數外延性（function extensionality）」的原理，它在 Agda 中可以被公設化，但預設並不假設。）

```
equal→pwequal : {A B : Set} {f g : A → B} {x : A} → f ≡ g → f x ≡ g x
-- Holify
equal→pwequal refl = refl
```


## 習題：不可辨別者的同一性

相同的值擁有所有相同的性質：如果 `F : A → Set` 是型別 `A` 的元素的一個性質（例如，`F` 可以是
[先前的謂詞 `Even`](Padova2025-zh-TW.ProvingBasics.EvenOdd.html#Even)），而 `x` 與 `y` 是相同的元素，
那麼 `F x` 應該蘊涵 `F y`。

```
subst : {A : Set} {x y : A} → (F : A → Set) → x ≡ y → F x → F y
-- Holify
subst F refl s = s
```


## 習題：雙參數函數的同餘

```
cong₂
  : {A B C : Set} {x x' : A} {y y' : B}
  → (f : A → B → C) → x ≡ x' → y ≡ y' → f x y ≡ f x' y'
-- Holify
cong₂ f refl refl = refl
```

<!--
-- EXERCISE: Think about the expression "(⊥ ≡ ℕ)". Is it well-defined?
-- 它會是什麼意思？
-->


## 不等

我們可以這樣引進不等：

```
open import Padova2025-zh-TW.ProvingBasics.Negation

infix 4 _≢_
_≢_ : {X : Set} → X → X → Set
a ≢ b = ¬ (a ≡ b)
```

不等是對稱的：

```
≢-sym : {X : Set} {a b : X} → a ≢ b → b ≢ a
-- Holify
≢-sym p = λ eq → p (sym eq)
```


## 逐點相等

我們也會用到「兩個函數有相同的值」這個概念，稱為*逐點相等*（pointwise equality）。
（[我們之後會討論](Padova2025-zh-TW.Cubical.Issues.FunctionExtensionality.html)這個概念與「兩個函數相同」這個更基本的概念之間的關係。）

```
infix 4 _≗_
_≗_ : {A B : Set} → (A → B) → (A → B) → Set
f ≗ g = (x : _) → f x ≡ g x
```

# TODO：在習題中使用 with

## With 抽象

有時候，我們需要對某個依賴於函數輸入的變數做 pattern matching。要做到這一點，可以引進一個帶有 `where` 或 `let`
的輔助函數，並在那裡再做一次 pattern matching；也可以使用 `with` 這個語法糖。後者就是下一節的主題。
```
{-# BUILTIN EQUALITY _≡_ #-}
module WithAbstraction where
  open import Padova2025-zh-TW.ProgrammingBasics.Booleans
  open import Padova2025-zh-TW.ProgrammingBasics.Lists
  open import Padova2025-zh-TW.ProgrammingBasics.Naturals.Base
```
一個非常簡單的例子是 `filter` 函數，它也出現在
[Agda 文件](https://agda.readthedocs.io/en/stable/language/with-abstraction.html)中。
filter 函數接受一個從抽象型別到 `Bool` 的函數（一個謂詞）以及一個串列，並丟掉串列中所有讓謂詞為 `false` 的元素。
我們先不用語法糖來做：
```
  filter' : {A : Set} → (A → Bool) → List A → List A
  filter' f [] = []
  filter' {A} f (x ∷ xs) = aux (f x)
    where
      aux : Bool → List A
      aux false = filter' f xs
      aux true  = x ∷ filter' f xs
```
歸納的情況需要函數 `aux` 來對 `f x` 做 pattern matching。這是很典型的樣板程式碼（boilerplate），也就是為了對 `f x`
做 pattern matching 而存在的函數型別，以及帶有 case split 的函數定義。我們還得把隱含引數 `A : Set` 顯式地寫出來，
才能寫下 `aux` 的型別簽名。

現在我們引進 `with` 關鍵字，來避免這些麻煩。
```
  filter : {A : Set} → (A → Bool) → List A → List A
  filter f [] = []
  filter f (x ∷ xs) with f x
  ... | false = filter f xs
  ... | true  = x ∷ filter f xs
```
這個 `filter` 的實作非常精簡。`with` 讓我們不必引進輔助函數。前面的 `...` 是 `filter f (x ∷ xs)` 的縮寫，
也就是說，這裡我們同樣避免了重複。請注意，`filter f (x ∷ xs)` 與 `with` 之間不再有 `=`。這個 `=` 被移到下面
case split 中的 `false` 與 `true` 後面，告訴我們在各個情況下 `filter f (x ∷ xs)` 應該是什麼。

下面這個函數在一個稍微平凡的情況下示範了 `with` 抽象：
```
  eq-to-bool : {A : Set} → (x y : A) → x ≡ y → Bool
  eq-to-bool x y refl = true
```
同樣的事也可以透過對 `p` 做 `with` 和 pattern matching 來完成。差別在於，在 `with` 之後也可以使用 `p` 的函數。
所以它比原本的定義更一般：
```
  eq-to-bool' : {A : Set} → (x y : A) → x ≡ y → Bool
  eq-to-bool' x y p with p
  ... | refl = true
```
`aux` 函數與 `with` 的目的相同，同樣可以用 `p` 的函數來呼叫：
```
  eq-to-bool'' : {A : Set} → (x y : A) → x ≡ y → Bool
  eq-to-bool'' x y p = aux p
    where
      aux : x ≡ y → Bool
      aux refl = true
```
巢狀的 `with` 也是可行的
```
  show-with-nested : {A : Set} → (x y : List A) → Bool
  show-with-nested x y with length x | length y
  ... | succ (succ zero)  | succ zero  = true
  ... | _                 | _          = false
```
請注意，`with` 抽象的順序很重要，也請注意，整體巢狀的 `with` 和在其中某個情況裡額外加一個 `with` 是不一樣的。
`with` 在建構否定命題的反例時特別有用。下面的例子稍微有點刻意：
```
  ex : (y : Bool) → y ≡ false → ((x : Bool) → x ≡ true) → ⊥
  ex y refl f with f y
  ... | ()
```
函數定義中的 with 抽象，會使得關於該函數的證明中也需要 `with` 抽象。下面這個關於 `filter` 冪等性的例子
也出現在文件中，而且比預期的稍微複雜一些：
```
  filter-idem : {A : Set} →
                (p : A → Bool) → (xs : List A) →
                (filter p (filter p xs)) ≡ (filter p xs)
  filter-idem f [] = refl
```
基底情形很簡單。

歸納情形所需的型別是
`filter f (filter f (x ∷ xs) | f x) ≡ (filter f (x ∷ xs) | f x)`
這表示我們需要對 `f x` 做 `with` 抽象。請注意，在左手邊，只有內層的 `filter` 多了一個 `| f x` 部分。
這表示 Agda 在這裡卡住了，不知道內層 `filter` 出來的串列是 `filter f xs` 還是 `x ∷ (filter f xs)`，
因為只有在 `x ∷ (filter f xs)` 的情況下，才需要 `with` 抽象。
```
  filter-idem f (x ∷ xs) with f x in eq
```
對於 `filter-idem` 定理，我們還需要在 `with` 抽象中引進另一個機制，也就是 `in`。下面會解釋它。
```
  ... | false = filter-idem f xs
```
`false` 的情況很簡單，因為依照 `filter` 的定義，`filter` 只會對去掉第一個元素的其餘串列呼叫。
這使得等式兩邊都塌縮成 `filter-idem f xs` 的形式。

`true` 的情況就沒那麼簡單了。文件顯示，可以用 `rewrite` 來證明歸納步驟，
```
--  ... | true rewrite eq = cong (x ∷_) (filter-idem f xs)
```
不過 `rewrite` 需要解釋：在 `f x` 後面加上 `in`，我們會在每個 `with` 子句中產生一個等式 `eq`，在我們的例子中是
`eq : f x ≡ false` 與 `eq : f x ≡ true`。為此我們需要上面的編譯器 pragma `{-# BUILTIN EQUALITY ≡ #-}`。
在 `false` 的情況下不需要 `eq`，因為元素 `x` 被移除了，所以可以直接使用歸納假設。`true` 的情況比較複雜：
`(filter f (x ∷ xs) | f x)` 中的內層運算式是 `(filter f (x ∷ xs) | true)`，並塌縮成 `x ∷ filter f xs`。
但要完成證明，我們需要它外面還有 `x ∷_`，而我們只有 `(filter f (x ∷ filter f xs) | f x)`。

我們處在 `with` 抽象的 `true` 情況，但必須重新確立 `f x` 仍然是 true。因此，我們必須再做一次 `with`。這是因為外層的
`f x` 只有在我們確立了內層的 `f x` 為 `true`、並得到 filter 中 `x ∷ xs` 的情況之後才看得到。`f x` 無法被一般化
（也就是被替換成一個我們可以做 case split 的變數），因為它已經有值 `true` 了。因此，我們需要使用 dot pattern `.true`。
但光是這樣，Agda 還是不相信它真的是 `true`，因為 dot pattern 只是為了文件記錄的目的。（如果我們寫的是 `bla`
而不是 `.true`，goal 檢視會顯示 `bla = true` 作為一個約束。）我們必須同時對 `eq` 做 with 抽象，並採用 `refl` 的情況。
```
  ... | true with f x  | eq
  ... |          .true | refl = cong (x ∷_) (filter-idem f xs)
```
這種構造在證明中經常出現，因此上面用 `rewrite` 來縮寫它。

::: Aside :::
讓我們開啟 [`with ... in ...` 語法糖](https://agda.readthedocs.io/en/stable/language/with-abstraction.html#with-abstraction-equality)。
:::
