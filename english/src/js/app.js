
/* ================= 英语乐园 · 交互逻辑（MP3 音频版） ================= */
(function(){
  "use strict";
  var COURSE = window.COURSE;
  var state = { view:"home", book:"all", score:0, speed:1 };
  var AUDIO_BASE = "assets/audio/";

  /* ---------- 音频播放 ---------- */
  var cur = null;
  function slug(t){
    return String(t).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48) || "x";
  }
  function play(text){
    try{
      if(cur){ cur.pause(); cur = null; }
      var a = new Audio(AUDIO_BASE + slug(text) + ".mp3");
      a.playbackRate = state.speed;
      cur = a;
      var p = a.play();
      if(p && p.catch) p.catch(function(){ /* 自动播放被拦截时静默 */ });
      return a;
    }catch(e){ return null; }
  }
  function playSeq(items, done){
    var i = 0;
    function step(){
      if(i >= items.length){ if(done) done(); return; }
      var a = play(items[i].t);
      i++;
      if(!a){ setTimeout(step, 200); return; }
      a.onended = function(){ setTimeout(step, items[i-1].gap || 350); };
      a.onerror = function(){ setTimeout(step, 200); };
      setTimeout(function(){ if(a.paused || a.ended) step(); }, 4000);
    }
    step();
  }

  /* ---------- 音效 ---------- */
  var actx = null;
  function beep(f, d, ty){
    try{
      actx = actx || new (window.AudioContext||window.webkitAudioContext)();
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = ty || "sine"; o.frequency.value = f;
      o.connect(g); g.connect(actx.destination);
      g.gain.setValueAtTime(0.14, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + d);
      o.start(); o.stop(actx.currentTime + d);
    }catch(e){}
  }
  function sfxOk(){ beep(660,.12); setTimeout(function(){beep(880,.18);},110); }
  function sfxNo(){ beep(220,.25,"triangle"); }
  function sfxTap(){ beep(520,.07,"square"); }

  /* ---------- 拼音注音 ---------- */
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){
    return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]; }); }
  function ruby(cn, py){
    if(!py) return esc(cn);
    var chars = cn.split(""), syl = py.split(/\s+/), out = "";
    for(var i=0;i<chars.length;i++){
      var s = syl[i] !== undefined ? syl[i] : "";
      out += s ? "<ruby>"+esc(chars[i])+"<rt>"+esc(s)+"</rt></ruby>" : esc(chars[i]);
    }
    return out;
  }
  function R(cn, py){ return "<ruby>"+esc(cn)+"<rt>"+esc(py)+"</rt></ruby>"; }

  /* ---------- 首页 ---------- */
  function renderHome(){
    var h = '<div class="hero"><span class="ip">🐻</span><div>' +
      '<h1>' + R("英语乐园","yīng yǔ lè yuán") + '</h1>' +
      '<p>' + R("人教版二年级英语·看动画学英语","rén jiào bǎn èr nián jí yīng yǔ") + '</p>' +
      '</div></div>';

    h += '<div class="filters">';
    h += '<button class="pill on" data-book="all">' + R("全部","quán bù") + '</button>';
    COURSE.books.forEach(function(b){
      h += '<button class="pill" data-book="' + b.id + '">' + b.emoji + ' ' + R(b.title, b.pinyin) + '</button>';
    });
    h += '</div>';

    h += '<div class="grid" id="unitGrid">' + unitCards("all") + '</div>';
    return h;
  }
  function unitCards(book){
    var h = "";
    COURSE.units.forEach(function(u){
      if(book !== "all" && u.book !== book) return;
      h += '<button class="card ' + u.color + '" data-unit="' + u.id + '">' +
        '<span class="emoji">' + u.emoji + '</span>' +
        '<h3>' + R(u.name, u.pinyin) + '</h3>' +
        '<div class="meta">' + u.words.length + ' ' + R("词","cí") + ' · ' +
        u.sentences.length + ' ' + R("句","jù") + ' · ' + u.grammar.length + ' ' + R("语法","yǔ fǎ") + '</div>' +
        '</button>';
    });
    return h || '<p style="color:#5E4A36">' + R("暂无内容","zàn wú nèi róng") + '</p>';
  }

  /* ---------- 单元页 ---------- */
  function renderUnit(u){
    var h = '<div class="hero"><span class="ip">' + u.emoji + '</span><div>' +
      '<h1>' + R(u.name, u.pinyin) + '</h1>' +
      '<p>' + R("点单词听发音","diǎn dān cí tīng fā yīn") + '</p></div></div>';

    h += '<h2 class="sec">' + R("单词","dān cí") + '</h2><div class="wordgrid">';
    u.words.forEach(function(w){
      h += '<div class="word" data-say="' + esc(w.en) + '">' +
        '<span class="pic">' + w.emoji + '</span>' +
        '<div class="en">' + esc(w.en) + '</div>' +
        '<div class="cn">' + R(w.cn, w.py) + '</div>' +
        '<div class="spk">🔊</div></div>';
    });
    h += '</div>';

    h += '<h2 class="sec">' + R("句型","jù xíng") + '</h2>';
    h += '<div class="scene"><div class="stage" id="stage">' +
      '<div class="actor left" id="actorL">🧒</div>' +
      '<div class="actor right" id="actorR">👩‍🏫</div>' +
      '<div class="bubble l hidden" id="bubL"></div>' +
      '<div class="bubble r hidden" id="bubR"></div></div>' +
      '<div style="margin-bottom:14px"><button class="pill" id="playScene">▶ ' +
      R("播放情景对话","bō fàng qíng jǐng duì huà") + '</button></div>' +
      '<div class="dialog">';
    u.sentences.forEach(function(s,i){
      h += '<div class="line" data-sent="' + i + '">' +
        '<span class="who">' + s.a + '</span>' +
        '<span class="txt">' + esc(s.en) + '</span>' +
        '<span class="who">🔊</span></div>';
    });
    h += '</div></div>';

    h += '<h2 class="sec">' + R("语法","yǔ fǎ") + '</h2><div class="grammar">';
    u.grammar.forEach(function(g){
      h += '<div class="gcard"><h4>' + R(g.title, g.pinyin) + '</h4><ul>';
      g.items.forEach(function(it){ h += '<li>' + esc(it) + '</li>'; });
      h += '</ul></div>';
    });
    h += '</div>';

    h += '<h2 class="sec">' + R("练习","liàn xí") + '</h2><div class="game" id="game"></div>';
    return h;
  }

  /* ---------- 字母页 ---------- */
  function renderLetters(){
    var h = '<div class="hero"><span class="ip">✏️</span><div>' +
      '<h1>' + R("字母书写","zì mǔ shū xiě") + '</h1>' +
      '<p>' + R("看动画，学笔顺，听拼读","kàn dòng huà xué bǐ shùn") + '</p></div></div>';
    h += '<div class="letters">';
    COURSE.alphabet.forEach(function(c){
      h += '<button class="lbtn" data-letter="' + c + '">' + c + '</button>';
    });
    h += '</div><div class="tracebox"><svg id="traceSvg" width="240" height="240" viewBox="0 0 240 240">' +
      '<rect x="6" y="6" width="228" height="228" rx="18" fill="#FFFCF2" stroke="#FFE0BC" stroke-width="3"/>' +
      '<line x1="30" y1="66" x2="210" y2="66" stroke="#D9F0FF" stroke-width="2"/>' +
      '<line x1="30" y1="120" x2="210" y2="120" stroke="#FFE0BC" stroke-width="2" stroke-dasharray="6 6"/>' +
      '<line x1="30" y1="174" x2="210" y2="174" stroke="#D9F0FF" stroke-width="2"/>' +
      '<path id="strokePath" fill="none" stroke="#F08A3C" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<text id="traceLabel" x="120" y="150" font-size="120" font-weight="700" fill="#5A4636" text-anchor="middle" opacity=".13">A</text>' +
      '</svg><div class="traceinfo"><h3 id="traceTitle">' + R("选一个字母开始","xuǎn yī gè zì mǔ kāi shǐ") + '</h3>' +
      '<p id="phonics" style="color:#5E4A36;font-size:.9em"></p>' +
      '<button class="pill" id="replay">↻ ' + R("再写一次","zài xiě yī cì") + '</button></div></div>';
    return h;
  }

  /* ---------- 语法页 ---------- */
  function renderGrammar(){
    var h = '<div class="hero"><span class="ip">📐</span><div>' +
      '<h1>' + R("语法要点","yǔ fǎ yào diǎn") + '</h1>' +
      '<p>' + R("二年级重点语法汇总","èr nián jí zhòng diǎn yǔ fǎ") + '</p></div></div>';
    h += '<div class="grammar">';
    (COURSE.grammarPoints||[]).forEach(function(g){
      h += '<div class="gcard"><h4>' + R(g.t, g.p) + '</h4><p>' + esc(g.d) + '</p></div>';
    });
    h += '</div>';
    return h;
  }

  /* ---------- 游戏页 ---------- */
  function renderGame(){
    var h = '<div class="hero"><span class="ip">🎮</span><div>' +
      '<h1>' + R("听音游戏","tīng yīn yóu xì") + '</h1>' +
      '<p>' + R("听发音，选单词","tīng fā yīn xuǎn dān cí") + '</p></div></div>';
    h += '<div class="game" id="g2"><div class="prompt" id="gPrompt">' +
      R("准备好了吗？","zhǔn bèi hǎo le ma") + '</div>' +
      '<div class="opts" id="gOpts"></div><div class="score" id="gScore"></div></div>';
    return h;
  }

  /* ---------- 单元交互 ---------- */
  function bindUnit(u, root){
    root.querySelectorAll(".word").forEach(function(el){
      el.addEventListener("click", function(){
        sfxTap();
        el.classList.add("speaking");
        setTimeout(function(){ el.classList.remove("speaking"); }, 500);
        play(el.getAttribute("data-say"));
      });
    });
    var pb = root.querySelector("#playScene");
    if(pb){
      pb.addEventListener("click", function(){
        var stage = root.querySelector("#stage");
        var bL = root.querySelector("#bubL"), bR = root.querySelector("#bubR");
        var aL = root.querySelector("#actorL"), aR = root.querySelector("#actorR");
        stage.classList.add("talk");
        var seq = [];
        u.sentences.forEach(function(s){
          seq.push({t:s.en, gap:600});
        });
        var i = 0;
        function step(){
          if(i >= u.sentences.length){
            stage.classList.remove("talk");
            bL.classList.add("hidden"); bR.classList.add("hidden");
            return;
          }
          var s = u.sentences[i];
          aL.textContent = s.a; aR.textContent = s.b;
          bL.textContent = s.en; bL.classList.remove("hidden");
          bR.classList.add("hidden");
          var a = play(s.en);
          setTimeout(function(){
            bR.textContent = s.cn; bR.classList.remove("hidden");
            i++; setTimeout(step, 900);
          }, 2200);
        }
        step();
      });
    }
    root.querySelectorAll(".line").forEach(function(el){
      el.addEventListener("click", function(){
        var s = u.sentences[parseInt(el.getAttribute("data-sent"),10)];
        if(s){ sfxTap(); play(s.en); }
      });
    });
    startQuiz(root.querySelector("#game"), u);
  }

  /* ---------- 听音选词 ---------- */
  function allWords(){
    var a = []; COURSE.units.forEach(function(u){ a = a.concat(u.words); }); return a;
  }
  function startQuiz(host, u){
    if(!host) return;
    var pool = u ? u.words.slice() : allWords();
    var qi = 0, total = 5;
    function next(){
      if(qi >= total){
        host.innerHTML = '<div class="prompt">🎉 ' + R("太棒了！全部完成","tài bàng le") +
          '</div><div class="score">' + R("得分","dé fēn") + ': ' + state.score + '</div>' +
          '<div style="margin-top:14px"><button class="pill" id="again">↻ ' +
          R("再玩一次","zài wán yī cì") + '</button></div>';
        var ag = host.querySelector("#again");
        if(ag) ag.addEventListener("click", function(){ state.score = 0; qi = 0; next(); });
        return;
      }
      var ans = pool[Math.floor(Math.random()*pool.length)];
      var opts = [ans];
      while(opts.length < 3){
        var c = pool[Math.floor(Math.random()*pool.length)];
        if(opts.indexOf(c) === -1) opts.push(c);
      }
      opts.sort(function(){ return Math.random()-0.5; });

      host.innerHTML = '<div class="prompt">🔊 ' + R("听一听，选出正确的单词","tīng yi tīng xuǎn chū zhèng què de dān cí") +
        '</div><div class="opts">' +
        opts.map(function(o){
          return '<button class="opt" data-en="' + esc(o.en) + '">' + o.emoji + ' ' + esc(o.en) + '</button>';
        }).join("") + '</div><div class="score">' +
        R("第","dì") + ' ' + (qi+1) + '/' + total + ' · ' + R("得分","dé fēn") + ' ' + state.score + '</div>';

      setTimeout(function(){ play(ans.en); }, 400);

      host.querySelectorAll(".opt").forEach(function(b){
        b.addEventListener("click", function(){
          if(b.classList.contains("right") || b.classList.contains("wrong")) return;
          if(b.getAttribute("data-en") === ans.en){
            b.classList.add("right"); sfxOk(); state.score += 10;
            play(ans.en);
            setTimeout(function(){ qi++; next(); }, 1100);
          }else{
            b.classList.add("wrong"); sfxNo();
            setTimeout(function(){ b.classList.remove("wrong"); }, 500);
          }
        });
      });
    }
    next();
  }

  /* ---------- 笔顺路径 ---------- */
  var TRACE = {
    A:"M60 190 L120 55 L180 190 M85 140 L155 140",
    B:"M85 55 L85 190 M85 55 L145 55 Q175 55 175 92 Q175 122 145 122 L85 122 M85 122 L155 122 Q185 122 185 156 Q185 190 150 190 L85 190",
    C:"M180 80 Q150 50 115 55 Q75 62 75 122 Q75 182 118 188 Q152 192 180 165",
    D:"M85 55 L85 190 M85 55 L130 55 Q180 60 180 122 Q180 185 130 190 L85 190",
    E:"M180 55 L85 55 L85 190 L180 190 M85 122 L155 122",
    F:"M180 55 L85 55 L85 190 M85 122 L155 122",
    G:"M180 80 Q150 50 115 55 Q75 62 75 122 Q75 182 118 188 Q165 192 180 155 L180 130 L140 130",
    H:"M85 55 L85 190 M180 55 L180 190 M85 122 L180 122",
    I:"M120 55 L120 190 M85 55 L155 55 M85 190 L155 190",
    J:"M155 55 L155 160 Q155 192 120 190 Q92 188 85 160",
    K:"M85 55 L85 190 M180 55 L85 128 M110 110 L180 190",
    L:"M95 55 L95 190 L180 190",
    M:"M70 190 L70 55 L120 140 L170 55 L170 190",
    N:"M80 190 L80 55 L165 190 L165 55",
    O:"M128 55 Q180 55 180 122 Q180 190 128 190 Q75 190 75 122 Q75 55 128 55 Z",
    P:"M85 190 L85 55 L145 55 Q180 55 180 95 Q180 132 145 132 L85 132",
    Q:"M128 55 Q180 55 180 122 Q180 190 128 190 Q75 190 75 122 Q75 55 128 55 Z M150 150 L190 192",
    R:"M85 190 L85 55 L145 55 Q180 55 180 95 Q180 132 145 132 L85 132 M130 132 L185 190",
    S:"M180 78 Q150 50 118 58 Q88 66 95 105 Q102 138 140 142 Q180 148 180 178 Q180 196 130 190 Q95 186 80 165",
    T:"M120 55 L120 190 M60 55 L180 55",
    U:"M80 55 L80 150 Q80 192 128 190 Q176 188 176 150 L176 55",
    V:"M70 55 L128 190 L186 55",
    W:"M55 55 L90 190 L128 90 L166 190 L201 55",
    X:"M75 55 L180 190 M180 55 L75 190",
    Y:"M80 55 L128 128 L176 55 M128 128 L128 190",
    Z:"M75 55 L180 55 L75 190 L180 190"
  };
  function drawLetter(c){
    var path = document.getElementById("strokePath");
    var label = document.getElementById("traceLabel");
    var title = document.getElementById("traceTitle");
    var ph = document.getElementById("phonics");
    if(!path) return;
    label.textContent = c;
    title.innerHTML = R("字母","zì mǔ") + " " + c;
    if(ph){
      var ex = (COURSE.phonics && COURSE.phonics[c]) || [];
      ph.innerHTML = ex.length ? R("拼读例词","pīn dú lì cí") + ": " + ex.join(" · ") : "";
    }
    path.setAttribute("d", TRACE[c] || "");
    var len = path.getTotalLength ? path.getTotalLength() : 800;
    path.style.transition = "none";
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    void path.getBoundingClientRect();
    path.style.transition = "stroke-dashoffset 1.8s ease-in-out";
    path.style.strokeDashoffset = 0;
    play(c);
  }

  /* ---------- 路由 ---------- */
  function show(view){
    state.view = view;
    var root = document.getElementById("viewRoot");
    if(view === "home"){ root.innerHTML = renderHome(); bindHome(root); }
    else if(view === "letters"){ root.innerHTML = renderLetters(); bindLetters(root); }
    else if(view === "grammar"){ root.innerHTML = renderGrammar(); }
    else if(view === "game"){ state.score = 0; root.innerHTML = renderGame(); startQuiz(root.querySelector("#g2"), null); }
    document.querySelectorAll(".tab").forEach(function(t){
      t.classList.toggle("on", t.getAttribute("data-go") === view);
    });
    window.scrollTo(0,0);
  }
  function bindHome(root){
    root.querySelectorAll(".card").forEach(function(c){
      c.addEventListener("click", function(){
        sfxTap();
        var u = COURSE.units.filter(function(x){ return x.id === c.getAttribute("data-unit"); })[0];
        root.innerHTML = renderUnit(u);
        bindUnit(u, root);
        window.scrollTo(0,0);
      });
    });
    root.querySelectorAll("[data-book]").forEach(function(b){
      b.addEventListener("click", function(){
        sfxTap();
        root.querySelectorAll("[data-book]").forEach(function(x){ x.classList.remove("on"); });
        b.classList.add("on");
        var g = root.querySelector("#unitGrid");
        if(g){ g.innerHTML = unitCards(b.getAttribute("data-book")); bindHome(root); }
      });
    });
  }
  function bindLetters(root){
    var curL = null;
    root.querySelectorAll(".lbtn").forEach(function(b){
      b.addEventListener("click", function(){
        sfxTap();
        root.querySelectorAll(".lbtn").forEach(function(x){ x.classList.remove("on"); });
        b.classList.add("on");
        curL = b.getAttribute("data-letter");
        drawLetter(curL);
      });
    });
    var rp = root.querySelector("#replay");
    if(rp) rp.addEventListener("click", function(){ if(curL) drawLetter(curL); });
  }

  /* ---------- 顶部控制 ---------- */
  function bindChrome(){
    document.querySelectorAll(".tab").forEach(function(t){
      t.addEventListener("click", function(){ sfxTap(); show(t.getAttribute("data-go")); });
    });
    var sp = document.getElementById("btnSpeed");
    if(sp) sp.addEventListener("click", function(){
      state.speed = state.speed === 1 ? 0.65 : 1;
      sp.textContent = state.speed === 1 ? "🐢 慢速" : "🐇 标准";
      sp.classList.toggle("on", state.speed === 1);
      play("hello");
    });
  }

  document.addEventListener("DOMContentLoaded", function(){
    bindChrome();
    show("home");
  });
})();
