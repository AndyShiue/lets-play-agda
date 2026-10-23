# 關於本專案

## 關於這個版本

這是 *Let's play Agda* 的靜態重建版。*Let's play Agda* 是由 [Ingo Blechschmidt](https://www.ingo-blechschmidt.eu/)
（安特衛普大學 University of Antwerp）為 2025 年在[帕多瓦大學](https://www.unipd.it/en/dm)開設、
由 [Milly Maietti](https://www.math.unipd.it/~maietti/) 籌辦的課程所製作的互動式 Agda 教學；
請參閱[原始網站](https://lets-play-agda.quasicoherent.io/)與[原始儲存庫](https://github.com/iblech/lets-play-agda)。
教學的文字與 Agda 程式碼，是原作者與下列貢獻者的作品，以 [CC BY-SA](https://creativecommons.org/licenses/by-sa/4.0/)
授權提供。這個版本把它們呈現為一個靜態網站，其中的 Agda 編輯器直接在你的瀏覽器裡執行
（[這個版本的原始碼](https://github.com/AndyShiue/lets-play-agda)）。
下面描述本網站技術的章節已針對這個版本更新；致謝名單則沿用原版。


## 致謝

多年來，本課程的結構與內容，受到下列活動參與者的回饋所塑造，並從中獲益良多：

- Chaos Communication Congress
  （[2018](https://events.ccc.de/congress/2018/wiki/index.php/Session:Formalizing_mathematics_in_the_proof_assistant_Agda)、
  [2019](https://events.ccc.de/congress/2019/wiki/index.php/Session:Formalizing_mathematics_in_the_proof_assistant_Agda)、
  [2023](https://events.ccc.de/congress/2023/hub/en/event/formalizing-mathematics-in-the-proof-assistant-agd/)、
  [2024](https://events.ccc.de/congress/2024/hub/en/event/wondrous-mathematics-how-a-group-of-theorists-reso/)），
- Curry Club Augsburg
  （[2019](https://curry-club-augsburg.de/posts/2019-02-19-treffen-47.html)、2021），
- 兩場 Dagstuhl 研討會
  （[2021](https://www.dagstuhl.de/de/seminars/seminar-calendar/seminar-details/21472)、
  [2024](https://www.dagstuhl.de/de/seminars/seminar-calendar/seminar-details/24021)），
- [2022 年 ALGAR 暑期學校](https://www.uantwerpen.be/en/summer-winter-schools/algar/programme/previous-editions/2022/content-description/)，
- Proof and Computation 秋季學校
  （[2022](https://www.mathematik.uni-muenchen.de/~schwicht/pc22.php)、
  [2023](https://www.mathematik.uni-muenchen.de/~schwicht/pc23.php)、
  [2024](https://www.mathematik.uni-muenchen.de/~schwicht/pc24.php)），
- 維洛納大學（University of Verona）的兩門短期課程
  （[2022](https://ct.quasicoherent.io/)、
  [2024](https://rt.quasicoherent.io/)）

——特別是帕多瓦大學的學生們
（[2020](https://agdapad.quasicoherent.io/~Agda_in_Padova/)、
[2021](https://agdapad.quasicoherent.io/~AgdaInPadova/)、
[2022](https://agdapad.quasicoherent.io/~AgdaPadova/)、
[2023](https://agdapad.quasicoherent.io/~Padova/)、
[2024](https://agdapad.quasicoherent.io/~Padova2024/)、
[2025](https://agdapad.quasicoherent.io/~Padova2025/)、
[2026](https://agdapad.quasicoherent.io/~Padova2026/)）。本課程的起點，是
[Martín Escardó](https://martinescardo.github.io/) 在
[2018 年的 Proof and Computation](https://www.mathematik.uni-muenchen.de/~schwicht/pc18.php)
開設的[一門課](https://martinescardo.github.io/pc2018/pc2018.pdf)，我就是在那裡學會 Agda 的，
過程中得到 [Anja Petković Komel](https://anjapetkovic.com/)，以及後來
[Matthias Ritter](https://mathoverflow.net/users/166281/matthias-hutzler) 的幫助。

以下人士提供了 pull request：

- Taylor Belcher
- Matteo Cusin
- @joha2
- Maja Kądziołka

這些貢獻大幅改善了本課程的呈現方式。此外，下列人士的回饋也影響深遠，我們非常感謝：

- Timur Aminev
- Martin Ceresa
- Fredrik Nordvall Forsberg
- Johannes Hartung
- Jacopo Piccione
- Alessandro Rizzi
- Noon van der Silk


### 開源的相依專案

這個互動式 Agda 教學，建立在許多出色的自由軟體專案之上：

- [Agda](https://agda.readthedocs.io/) 本身，多虧 [Agda Web](https://agda-web.github.io/) 專案
  與 [Agda Language Server](https://github.com/agda/agda-language-server)，它能以 WebAssembly 的形式在你的瀏覽器中執行，
- [Visual Studio Code for the Web](https://github.com/microsoft/vscode)（Code - OSS），
- Ting-Gian Lua 的 [agda-mode for VS Code](https://github.com/banacorn/agda-mode-vscode)，
  以及 Andy Pan 的 [ALS WASM Loader](https://github.com/qbane/vscode-als-wasm-loader)，
- [cubical library](https://github.com/agda/cubical)。

按[這裡](javascript:showConfetti())可以看到彩帶動畫。


### 其他語言的類似專案

- [Holbert](https://liamoc.net/holbert/)
- [Lean Game Server](https://adam.math.hhu.de/)
- [Rocq interactive online system](https://coq.vercel.app/)
  （另請參閱 [Jelle Wemmenhove 的博士論文](https://pure.tue.nl/ws/portalfiles/portal/353344889/20250321_Wemmenhove_hf.pdf)）


## 在本機使用

如果你偏好使用本機安裝的 Agda，我們提供了所有 Agda 程式碼的[壓縮檔](Padova2025-zh-TW.zip)。

這個教學是一個靜態網站；[它的儲存庫](https://github.com/AndyShiue/lets-play-agda)
包含了自行建置與架設所需的一切。


## 備份你的資料

- 本專案中互動式的 Agda 元件都在你的瀏覽器裡執行。沒有任何伺服器參與，
  你的 Agda 程式碼不會離開你的電腦。

- 你對 Agda 習題的解答，儲存在瀏覽器的 local storage 中。這個儲存空間原則上是永久的，
  但實際上很容易被清除，例如在瀏覽器的私密模式下使用，或是刪除網站的「應用程式資料」時。
  因此你可能會想定期[下載你的解答](javascript:downloadLocalStorage())以便保存。

- 你可以[點這裡匯入備份](javascript:importIntoLocalStorage())。
  這會把備份的內容與目前的 local storage 合併。


## 連續紀錄（Streak）

當你開始填寫第一個 hole 之後，導覽列下方的左下角會出現一個小日曆，讓你追蹤自己的進度。
和你的 Agda 程式碼一樣，這份活動紀錄也只儲存在瀏覽器的 local storage 中。

<span class="daybox active"></span> 你有在練習的日子<br>
<span class="daybox resting"></span> 你有在休息的日子<br>
<span class="daybox inactive"></span> 你沒有活動的日子

為了更貼近夜貓子，我們把一天定義為在凌晨 5 點結束。如果對你有用的話，我們也會計算你
連續每天都有活動的最長紀錄。在每 7 天的時間範圍內，最多兩個休息日不會中斷連續紀錄。


## Unicode 符號

Agda 社群非常愛用 Unicode，這讓我們能在記法上模仿黑板上的數學。在這個網頁上，你可以把滑鼠
移到 Agda 片段中的特殊符號上，了解該怎麼輸入它們。許多 LaTeX 指令都可以使用，例如
`\alpha` 會產生希臘字母 `α`。

以下是本課程用到的 Unicode 符號清單。

<script>
  window.onload = function () {
    let table = document.getElementById("char-table");

    for(const symbol of Object.keys(characterDescriptions).toSorted()) {
      const tr = document.createElement("tr");

      const td1 = document.createElement("td");
      td1.appendChild(document.createTextNode(symbol));

      const td2  = document.createElement("td");
      const code = document.createElement("code");
      code.appendChild(document.createTextNode(characterDescriptions[symbol]));
      td2.appendChild(code);

      tr.appendChild(td1);
      tr.appendChild(td2);
      table.appendChild(tr);
    }
  };
</script>

<div class="char-table"><table id="char-table">
</table></div>

<!--
```
{-# OPTIONS --cubical-compatible #-}
module Padova2025-zh-TW.Welcome.About where
```
-->
