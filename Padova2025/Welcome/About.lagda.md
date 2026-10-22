# About this project

## About this version

This is a static rebuild of *Let's play Agda*, the interactive Agda tutorial
created by [Ingo Blechschmidt](https://www.ingo-blechschmidt.eu/) (University of
Antwerp) for a 2025 course at the [University of
Padova](https://www.unipd.it/en/dm) organized by [Milly
Maietti](https://www.math.unipd.it/~maietti/); see the [original
site](https://lets-play-agda.quasicoherent.io/) and the [original
repository](https://github.com/iblech/lets-play-agda). The text and the Agda
code of the tutorial are the work of the original author and of the
contributors named below, and are available under the
[CC BY-SA](https://creativecommons.org/licenses/by-sa/4.0/) license. This
version shows them as a static website whose Agda editor runs in your browser
([source code of this version](https://github.com/AndyShiue/lets-play-agda)).
The sections below describing this site's technology have been updated for
this version; the credits are those of the original.


## Credits

Over the years, the structure and contents of this course have been shaped by
and greatly benefited from feedback of participants at

- the Chaos Communication Congress
  ([2018](https://events.ccc.de/congress/2018/wiki/index.php/Session:Formalizing_mathematics_in_the_proof_assistant_Agda),
  [2019](https://events.ccc.de/congress/2019/wiki/index.php/Session:Formalizing_mathematics_in_the_proof_assistant_Agda),
  [2023](https://events.ccc.de/congress/2023/hub/en/event/formalizing-mathematics-in-the-proof-assistant-agd/),
  [2024](https://events.ccc.de/congress/2024/hub/en/event/wondrous-mathematics-how-a-group-of-theorists-reso/)),
- the Curry Club Augsburg
  ([2019](https://curry-club-augsburg.de/posts/2019-02-19-treffen-47.html), 2021),
- two Dagstuhl meetings
  ([2021](https://www.dagstuhl.de/de/seminars/seminar-calendar/seminar-details/21472),
  [2024](https://www.dagstuhl.de/de/seminars/seminar-calendar/seminar-details/24021)),
- the [2022 ALGAR summer school](https://www.uantwerpen.be/en/summer-winter-schools/algar/programme/previous-editions/2022/content-description/),
- the Proof and Computation autumn school
  ([2022](https://www.mathematik.uni-muenchen.de/~schwicht/pc22.php),
  [2023](https://www.mathematik.uni-muenchen.de/~schwicht/pc23.php),
  [2024](https://www.mathematik.uni-muenchen.de/~schwicht/pc24.php)),
- two minicourses at the University of Verona
  ([2022](https://ct.quasicoherent.io/),
  [2024](https://rt.quasicoherent.io/))

-- and in particular by the students at the University of Padova
([2020](https://agdapad.quasicoherent.io/~Agda_in_Padova/),
[2021](https://agdapad.quasicoherent.io/~AgdaInPadova/),
[2022](https://agdapad.quasicoherent.io/~AgdaPadova/),
[2023](https://agdapad.quasicoherent.io/~Padova/),
[2024](https://agdapad.quasicoherent.io/~Padova2024/),
[2025](https://agdapad.quasicoherent.io/~Padova2025/),
[2026](https://agdapad.quasicoherent.io/~Padova2026/)). It was set in motion by
[a course](https://martinescardo.github.io/pc2018/pc2018.pdf) of
[Martín Escardó](https://martinescardo.github.io/) at the
[2018 installment of Proof and Computation](https://www.mathematik.uni-muenchen.de/~schwicht/pc18.php),
where I have learned Agda with help from [Anja Petković Komel](https://anjapetkovic.com/)
and later [Matthias Ritter](https://mathoverflow.net/users/166281/matthias-hutzler).

Pull requests were contributed by:

- Taylor Belcher
- Matteo Cusin
- @joha2
- Maja Kądziołka

These helped to substantially improve the presentation of this course.
Furthermore, feedback of the following persons was influential and greatly
appreciated:

- Timur Aminev
- Martin Ceresa
- Fredrik Nordvall Forsberg
- Johannes Hartung
- Jacopo Piccione
- Alessandro Rizzi
- Noon van der Silk


### Open source dependencies

This interactive Agda tutorial builds on awesome free software projects:

- [Agda](https://agda.readthedocs.io/) itself, which runs in your browser as
  WebAssembly thanks to the [Agda Web](https://agda-web.github.io/) project
  and the [Agda Language Server](https://github.com/agda/agda-language-server),
- [Visual Studio Code for the Web](https://github.com/microsoft/vscode) (Code - OSS),
- [agda-mode for VS Code](https://github.com/banacorn/agda-mode-vscode) by
  Ting-Gian Lua, and the
  [ALS WASM Loader](https://github.com/qbane/vscode-als-wasm-loader) by Andy Pan,
- the [cubical library](https://github.com/agda/cubical).

Press [here](javascript:showConfetti()) for a confetti animation.


### Similar projects for other languages

- [Holbert](https://liamoc.net/holbert/)
- [Lean Game Server](https://adam.math.hhu.de/)
- [Rocq interactive online system](https://coq.vercel.app/)
  (see also [the thesis of Jelle Wemmenhove](https://pure.tue.nl/ws/portalfiles/portal/353344889/20250321_Wemmenhove_hf.pdf))


## Working locally

In case you prefer to work with a local Agda installation, there is an
[archive](Padova2025.zip) of all Agda code.

This tutorial is a static website; [its repository](https://github.com/AndyShiue/lets-play-agda)
contains everything needed to build and host it yourself.


## Backing up your data

- The interactive Agda elements of this project run in your browser. There is
  no server involved, and your Agda code never leaves your computer.

- Your solutions to Agda exercises are stored in your browser's local
  storage. This storage is in principle permanent but in practice prone to be
  cleared, for instance when working in your browser's private mode or when
  deleting "application data" of web sites. Hence you might want to
  periodically [download your solutions](javascript:downloadLocalStorage()) for safekeeping.

- You can [import backups by clicking here](javascript:importIntoLocalStorage()).
  This will merge the backup's contents with the local storage.


## Streak

As soon as you have started filling in your first hole, a small calendar will
appear in the lower left corner below the navigation. This calender allows you
to monitor your progress. Like your Agda code, this activity log is only stored
in your browser's local storage.

<span class="daybox active"></span> Days on which you have been playing<br>
<span class="daybox resting"></span> Days on which you have been resting<br>
<span class="daybox inactive"></span> Days on which you have been inactive

To better match night owls, a day is defined as ending at 5 am in the morning.
For the case that this is useful to you, also your longest streak of continuous
day-after-day activity is computed. Up two resting days in each 7-day time span
do not interrupt a streak.


## Unicode symbols

Agda's community is big on Unicode, helping us to notationally mimic
blackboard mathematics. On this webpage, you can hover over special symbols in
Agda fragments to learn how they can be input. Many LaTeX commands work, for
instance `\alpha` will produce a Greek `α`.

Here is a list of Unicode symbols used in this course.

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
module Padova2025.Welcome.About where
```
-->
