export type InstructorLanguageCode = 'en' | 'ar' | 'fr' | 'es';

export type KidPieceName = 'Pawn' | 'Knight' | 'Bishop' | 'Rook' | 'Queen' | 'King';

export const INSTRUCTOR_LANGUAGE_STORAGE_KEY = 'kids-instructor-language';

export interface InstructorLanguage {
  code: InstructorLanguageCode;
  name: string;
  speechLang: string;
  dir: 'ltr' | 'rtl';
}

export interface PieceCopy {
  label: string;
  sentenceName: string;
  tip: string;
  moveText: string;
  captureText: string;
}

export interface InstructorCopy {
  languageLabel: string;
  coachName: string;
  welcome: string;
  emptyBoard: string;
  practiceIntro: (piece: string) => string;
  wrongPieceTitle: string;
  wrongPieceMessage: (piece: string) => string;
  wrongMoveTitle: string;
  wrongMoveShort: string;
  tryGlowing: string;
  goodCaptureTitle: string;
  goodCaptureHint: string;
  goodCaptureMessage: string;
  goodMoveTitle: string;
  goodMoveHint: string;
  goodMoveMessage: (piece: string) => string;
}

export interface KidsGameBuddyCopy {
  welcome: string;
  newGame: string;
  thinking: string;
  checkPraise: string;
  capturePraise: string;
  praise: string[];
  buddyCheck: string;
  buddyCapture: string;
  yourTurn: string;
  hint: string;
  undo: string;
}

export interface KidsGameResultsCopy {
  winTitle: string;
  winText: string;
  winMessage: string;
  lossTitle: string;
  lossText: string;
  lossMessage: string;
  drawTitle: string;
  drawText: string;
  drawMessage: string;
}

export interface KidsGameCopy {
  titlePrefix: string;
  buddyName: string;
  soundOff: string;
  soundOn: string;
  check: string;
  you: string;
  white: string;
  black: string;
  playAs: string;
  difficulty: string;
  levelEasy: string;
  levelMedium: string;
  levelHard: string;
  yourTurn: string;
  newGame: string;
  undo: string;
  hint: string;
  tipsTitle: string;
  tipTapTitle: string;
  tipTapText: string;
  tipHelpTitle: string;
  tipHelpText: string;
  tipWinTitle: string;
  tipWinText: string;
  noTimer: string;
  buddy: KidsGameBuddyCopy;
  results: KidsGameResultsCopy;
}

export interface KidsHomeCopy {
  kidsMode: string;
  heroLine1: string;
  heroLine2: string;
  heroSub: string;
  playWithBuddy: string;
  stuckHint: string;
  playChessTitle: string;
  playChessText: string;
  playChessCta: string;
  learnPiecesTitle: string;
  learnPiecesText: string;
  learnPiecesCta: string;
  funPuzzlesTitle: string;
  funPuzzlesText: string;
  funPuzzlesCta: string;
  meetPiecesTitle: string;
  meetPiecesSub: string;
  tapToLearn: string;
  howToPlayTitle: string;
  step1: string;
  step2: string;
  step3: string;
  startPlaying: string;
  footer: string;
}

export interface KidsLearnCopy {
  pageTitlePrefix: string;
  pageTitleStrong: string;
  clearBoard: string;
  clear: string;
  moveSquares: string;
  captureSquares: string;
  possibleSquares: (count: number) => string;
  practicing: (piece: string) => string;
  emptyPick: string;
  allPieces: string;
  allPiecesSub: string;
  tapToLearn: string;
  sidebarNote: (coachName: string) => string;
  footer: string;
  closeMessage: string;
  voiceOnLabel: string;
  voiceOffLabel: string;
  voiceOnTitle: string;
  voiceOffTitle: string;
  hearAgain: string;
  sayAgain: string;
}

export interface KidsPopupCopy {
  close: string;
  canMoveHere: string;
  canCaptureHere: string;
  howItMoves: string;
  howItCaptures: string;
  tryMe: string;
  gotIt: string;
  enemyPawn: string;
}

export interface KidsUiCopy {
  common: {
    kidsHome: string;
    play: string;
    learn: string;
    grownUps: string;
    backToNormalHome: string;
    close: string;
    playAgain: string;
    backToKidsHome: string;
  };
  home: KidsHomeCopy;
  game: KidsGameCopy;
  learn: KidsLearnCopy;
  popup: KidsPopupCopy;
}

export const INSTRUCTOR_LANGUAGES: InstructorLanguage[] = [
  { code: 'en', name: 'English', speechLang: 'en-US', dir: 'ltr' },
  { code: 'ar', name: 'العربية', speechLang: 'ar-SA', dir: 'rtl' },
  { code: 'fr', name: 'Français', speechLang: 'fr-FR', dir: 'ltr' },
  { code: 'es', name: 'Español', speechLang: 'es-ES', dir: 'ltr' }
];

export const INSTRUCTOR_COPY: Record<InstructorLanguageCode, InstructorCopy> = {
  en: {
    languageLabel: 'Language',
    coachName: 'Professor Hoot',
    welcome: "Hi, I'm Professor Hoot! Tap a piece to learn how it moves and captures.",
    emptyBoard: 'The board is empty! Tap a piece and Professor Hoot will teach you.',
    practiceIntro: piece =>
      `Move or capture the piece! Tap your ${piece} and follow the arrow to a glowing square.`,
    wrongPieceTitle: 'Wrong piece!',
    wrongPieceMessage: piece => `Move your ${piece} with the yellow frame.`,
    wrongMoveTitle: 'Wrong move!',
    wrongMoveShort: 'Wrong move! Move or capture the piece on a glowing square.',
    tryGlowing: 'Try one of the glowing squares.',
    goodCaptureTitle: 'Good capture!',
    goodCaptureHint: 'Good capture! Move or capture the piece again!',
    goodCaptureMessage: 'You captured a black pawn! Great job!',
    goodMoveTitle: 'Good move!',
    goodMoveHint: 'Good move! Move or capture the piece again!',
    goodMoveMessage: piece => `Your ${piece} is doing great.`
  },
  ar: {
    languageLabel: 'اللغة',
    coachName: 'البروفيسور هوت',
    welcome: 'مرحباً! أنا البروفيسور هوت! اضغط على قطعة لتتعلم كيف تتحرك وكيف تأسر.',
    emptyBoard: 'اللوحة فارغة! اضغط على قطعة وسيعلّمك البروفيسور هوت.',
    practiceIntro: piece => `حرّك قطعة أو اسرها! اضغط على ${piece} واتبع السهم إلى مربع مضيء.`,
    wrongPieceTitle: 'القطعة الخطأ!',
    wrongPieceMessage: piece => `حرّك ${piece} داخل الإطار الأصفر.`,
    wrongMoveTitle: 'حركة غير صحيحة!',
    wrongMoveShort: 'حركة غير صحيحة! حرّك أو اسر القطعة على مربع مضيء.',
    tryGlowing: 'جرّب أحد المربعات المضيئة.',
    goodCaptureTitle: 'أسر رائع!',
    goodCaptureHint: 'أسر رائع! حرّك أو اسر القطعة مرة أخرى!',
    goodCaptureMessage: 'لقد أسرت بيدقاً أسود! عمل رائع!',
    goodMoveTitle: 'حركة رائعة!',
    goodMoveHint: 'حركة رائعة! حرّك أو اسر القطعة مرة أخرى!',
    goodMoveMessage: piece => `أحسنت! استمر في تحريك ${piece}.`
  },
  fr: {
    languageLabel: 'Langue',
    coachName: 'Professeur Hoot',
    welcome:
      'Salut, je suis le Professeur Hoot ! Touche une pièce pour apprendre comment elle se déplace et capture.',
    emptyBoard: "L'échiquier est vide ! Touche une pièce et le Professeur Hoot va t'apprendre.",
    practiceIntro: piece =>
      `Bouge ou capture une pièce ! Touche ${piece} et suis la flèche vers une case illuminée.`,
    wrongPieceTitle: 'Mauvaise pièce !',
    wrongPieceMessage: piece => `Déplace ${piece} dans le cadre jaune.`,
    wrongMoveTitle: 'Mauvais mouvement !',
    wrongMoveShort: 'Mauvais mouvement ! Bouge ou capture la pièce sur une case illuminée.',
    tryGlowing: 'Essaie une des cases illuminées.',
    goodCaptureTitle: 'Belle capture !',
    goodCaptureHint: 'Belle capture ! Bouge ou capture encore une fois !',
    goodCaptureMessage: 'Tu as capturé un pion noir ! Bravo !',
    goodMoveTitle: 'Bon mouvement !',
    goodMoveHint: 'Bon mouvement ! Bouge ou capture encore une fois !',
    goodMoveMessage: piece => `Bravo ! Continue avec ${piece}.`
  },
  es: {
    languageLabel: 'Idioma',
    coachName: 'Profesor Hoot',
    welcome: '¡Hola, soy el Profesor Hoot! Toca una pieza para aprender cómo se mueve y cómo captura.',
    emptyBoard: '¡El tablero está vacío! Toca una pieza y el Profesor Hoot te enseñará.',
    practiceIntro: piece =>
      `¡Mueve o captura una pieza! Toca ${piece} y sigue la flecha hacia una casilla iluminada.`,
    wrongPieceTitle: '¡Pieza equivocada!',
    wrongPieceMessage: piece => `Mueve ${piece} dentro del marco amarillo.`,
    wrongMoveTitle: '¡Movimiento incorrecto!',
    wrongMoveShort: '¡Movimiento incorrecto! Mueve o captura una pieza en una casilla iluminada.',
    tryGlowing: 'Prueba una de las casillas iluminadas.',
    goodCaptureTitle: '¡Buena captura!',
    goodCaptureHint: '¡Buena captura! ¡Mueve o captura otra vez!',
    goodCaptureMessage: '¡Capturaste un peón negro! ¡Muy bien!',
    goodMoveTitle: '¡Buen movimiento!',
    goodMoveHint: '¡Buen movimiento! ¡Mueve o captura otra vez!',
    goodMoveMessage: piece => `¡Sigue así con ${piece}!`
  }
};

export const KIDS_UI_COPY: Record<InstructorLanguageCode, KidsUiCopy> = {
  en: {
    common: {
      kidsHome: 'Kids Home',
      play: 'Play',
      learn: 'Learn',
      grownUps: 'Grown-ups',
      backToNormalHome: 'Back to the normal home page',
      close: 'Close',
      playAgain: 'Play Again',
      backToKidsHome: 'Back to Kids Home'
    },
    home: {
      kidsMode: '🌈 Kids Mode',
      heroLine1: 'Hi there,',
      heroLine2: 'chess champion!',
      heroSub: "Let's have fun with chess. Pick a big card below and start playing!",
      playWithBuddy: 'Play with Chess Buddy',
      stuckHint: 'Stuck? Tap the 💡 Hint button during your game.',
      playChessTitle: 'Play Chess',
      playChessText: 'A friendly game with Chess Buddy. No timer, no rush!',
      playChessCta: "Let's play →",
      learnPiecesTitle: 'Learn the Pieces',
      learnPiecesText: 'Meet each chess piece and learn its special move.',
      learnPiecesCta: 'Show me →',
      funPuzzlesTitle: 'Fun Puzzles',
      funPuzzlesText: 'Find the best move and become a puzzle star!',
      funPuzzlesCta: 'Try one →',
      meetPiecesTitle: 'Meet the pieces 👋',
      meetPiecesSub: 'Every piece moves and captures in its own special way. Tap a piece to see how!',
      tapToLearn: 'Tap to learn →',
      howToPlayTitle: 'How to play in 3 steps',
      step1: 'Tap one of your pieces.',
      step2: 'Tap a glowing dot to move.',
      step3: 'Trap the king to win!',
      startPlaying: 'Start playing',
      footer: 'Made for curious young players 💛'
    },
    game: {
      titlePrefix: 'Play with',
      buddyName: 'Chess Buddy',
      soundOff: 'Turn sounds off',
      soundOn: 'Turn sounds on',
      check: 'Check! Keep your king safe!',
      you: 'You',
      white: 'White',
      black: 'Black',
      playAs: 'Play as',
      difficulty: 'Level',
      levelEasy: 'Easy',
      levelMedium: 'Medium',
      levelHard: 'Hard',
      yourTurn: 'Your turn! 🌟',
      newGame: 'New Game',
      undo: 'Undo',
      hint: 'Hint',
      tipsTitle: "Chess Buddy's tips",
      tipTapTitle: 'Tap a piece',
      tipTapText: 'Then tap a glowing dot to move it.',
      tipHelpTitle: 'Need help?',
      tipHelpText: 'Press the Hint button and I will point to a good move.',
      tipWinTitle: 'Win the game',
      tipWinText: 'Trap the other king so it cannot escape. That is checkmate!',
      noTimer: 'There is no timer. Take your time and have fun!',
      buddy: {
        welcome: "Hi! I'm Chess Buddy. Let's play! 🌟",
        newGame: 'A new game! Good luck! 🌈',
        thinking: 'Hmm... let me think! 🤔',
        checkPraise: 'Wow, check! You are doing great! 🎉',
        capturePraise: 'Nice capture! You got a piece! 🎯',
        praise: [
          'Nice move! 🌟',
          'Great job! 👏',
          'You are doing great! 💪',
          'Wow, what a move! ✨',
          'Keep it up, champ! 🏆',
          'That was clever! 🧠'
        ],
        buddyCheck: 'Careful! Your king is in check. Can you move him to safety? 🛡️',
        buddyCapture: 'I got one of your pieces. Your turn! 🙂',
        yourTurn: 'Your turn! You can do it! 💪',
        hint: 'Try moving the piece I am pointing at! 💡',
        undo: "No problem! Let's try again. 💪"
      },
      results: {
        winTitle: 'You win! Amazing!',
        winText: 'You trapped the other king. Chess Buddy is so proud of you!',
        winMessage: 'WOW! You won! You are a chess star! 🌟',
        lossTitle: 'Good game!',
        lossText: 'Chess Buddy won this time, but you played bravely. Try again!',
        lossMessage: 'Great game! Want to play again? 🌈',
        drawTitle: "It's a draw!",
        drawText: 'Nobody won this time. You both did great!',
        drawMessage: 'A draw! You both did great! 🤝'
      }
    },
    learn: {
      pageTitlePrefix: 'Learn the',
      pageTitleStrong: 'Pieces',
      clearBoard: 'Clear Board',
      clear: 'Clear',
      moveSquares: 'Move squares',
      captureSquares: 'Capture squares',
      possibleSquares: count => `${count} possible square${count === 1 ? '' : 's'}`,
      practicing: piece => `Practicing: ${piece}`,
      emptyPick: 'The board is empty — pick a piece!',
      allPieces: 'All the pieces',
      allPiecesSub: 'Tap a piece to learn how it moves and captures.',
      tapToLearn: 'Tap to learn',
      sidebarNote: coachName =>
        `Press Try me and ${coachName} will show every square plus an arrow to try.`,
      footer: 'Learning one piece at a time ⭐',
      closeMessage: 'Close message',
      voiceOnLabel: 'Turn instructor voice off',
      voiceOffLabel: 'Turn instructor voice on',
      voiceOnTitle: 'Instructor voice is on',
      voiceOffTitle: 'Instructor voice is off',
      hearAgain: 'Hear the instructor again',
      sayAgain: 'Say it again'
    },
    popup: {
      close: 'Close popup',
      canMoveHere: 'Can move here',
      canCaptureHere: 'Can capture here',
      howItMoves: 'How it moves',
      howItCaptures: 'How it captures',
      tryMe: 'Try me! 🎮',
      gotIt: 'Got it! 👍',
      enemyPawn: 'Enemy pawn'
    }
  },
  ar: {
    common: {
      kidsHome: 'الرئيسية للأطفال',
      play: 'العب',
      learn: 'تعلّم',
      grownUps: 'للكبار',
      backToNormalHome: 'العودة إلى الصفحة الرئيسية',
      close: 'إغلاق',
      playAgain: 'العب مرة أخرى',
      backToKidsHome: 'العودة إلى الرئيسية للأطفال'
    },
    home: {
      kidsMode: '🌈 وضع الأطفال',
      heroLine1: 'مرحباً،',
      heroLine2: 'يا بطل الشطرنج!',
      heroSub: 'هيا نستمتع بالشطرنج. اختر بطاقة كبيرة بالأسفل وابدأ اللعب!',
      playWithBuddy: 'العب مع صديق الشطرنج',
      stuckHint: 'هل أنت عالق؟ اضغط على زر 💡 تلميح أثناء اللعب.',
      playChessTitle: 'العب الشطرنج',
      playChessText: 'مباراة ودية مع صديق الشطرنج. بلا مؤقت وبلا عجلة!',
      playChessCta: 'هيا نلعب ←',
      learnPiecesTitle: 'تعلّم القطع',
      learnPiecesText: 'تعرّف على كل قطعة شطرنج وتعلّم حركتها الخاصة.',
      learnPiecesCta: 'أرني ←',
      funPuzzlesTitle: 'ألغاز ممتعة',
      funPuzzlesText: 'اعثر على أفضل حركة وكن نجم الألغاز!',
      funPuzzlesCta: 'جرّب واحداً ←',
      meetPiecesTitle: 'تعرّف على القطع 👋',
      meetPiecesSub: 'لكل قطعة طريقة خاصة في الحركة والأسر. اضغط على قطعة لترى كيف!',
      tapToLearn: 'اضغط لتتعلم ←',
      howToPlayTitle: 'كيف تلعب في 3 خطوات',
      step1: 'اضغط على إحدى قطعك.',
      step2: 'اضغط على نقطة مضيئة للتحرك.',
      step3: 'حاصر الملك لتفوز!',
      startPlaying: 'ابدأ اللعب',
      footer: 'صُنع للاعبين الصغار الفضوليين 💛'
    },
    game: {
      titlePrefix: 'العب مع',
      buddyName: 'صديق الشطرنج',
      soundOff: 'إيقاف الأصوات',
      soundOn: 'تشغيل الأصوات',
      check: 'كش! حافظ على أمان ملكك!',
      you: 'أنت',
      white: 'الأبيض',
      black: 'الأسود',
      playAs: 'العب بـ',
      difficulty: 'المستوى',
      levelEasy: 'سهل',
      levelMedium: 'متوسط',
      levelHard: 'صعب',
      yourTurn: 'دورك! 🌟',
      newGame: 'لعبة جديدة',
      undo: 'تراجع',
      hint: 'تلميح',
      tipsTitle: 'نصائح صديق الشطرنج',
      tipTapTitle: 'اضغط على قطعة',
      tipTapText: 'ثم اضغط على نقطة مضيئة لتحريكها.',
      tipHelpTitle: 'تحتاج مساعدة؟',
      tipHelpText: 'اضغط على زر تلميح وسأشير إلى حركة جيدة.',
      tipWinTitle: 'اربح اللعبة',
      tipWinText: 'حاصر الملك الآخر حتى لا يستطيع الهروب. هذا هو كش مات!',
      noTimer: 'لا يوجد مؤقت. خذ وقتك واستمتع!',
      buddy: {
        welcome: 'مرحباً! أنا صديق الشطرنج. هيا نلعب! 🌟',
        newGame: 'لعبة جديدة! حظاً سعيداً! 🌈',
        thinking: 'همم... دعني أفكر! 🤔',
        checkPraise: 'واو، كش! أنت رائع! 🎉',
        capturePraise: 'أسر رائع! لقد حصلت على قطعة! 🎯',
        praise: [
          'حركة جميلة! 🌟',
          'عمل رائع! 👏',
          'أنت تبلي بلاءً حسناً! 💪',
          'واو، يا لها من حركة! ✨',
          'واصل يا بطل! 🏆',
          'كان ذلك ذكياً! 🧠'
        ],
        buddyCheck: 'انتبه! ملكك في كش. هل يمكنك تحريكه إلى مكان آمن؟ 🛡️',
        buddyCapture: 'لقد أخذت إحدى قطعك. دورك! 🙂',
        yourTurn: 'دورك! يمكنك فعلها! 💪',
        hint: 'جرّب تحريك القطعة التي أشير إليها! 💡',
        undo: 'لا مشكلة! لنجرب مرة أخرى. 💪'
      },
      results: {
        winTitle: 'لقد فزت! رائع!',
        winText: 'لقد حاصرت الملك الآخر. صديق الشطرنج فخور جداً بك!',
        winMessage: 'واو! لقد فزت! أنت نجم الشطرنج! 🌟',
        lossTitle: 'لعبة جيدة!',
        lossText: 'فاز صديق الشطرنج هذه المرة، لكنك لعبت بشجاعة. حاول مرة أخرى!',
        lossMessage: 'لعبة رائعة! هل تريد اللعب مرة أخرى؟ 🌈',
        drawTitle: 'إنه تعادل!',
        drawText: 'لم يفز أحد هذه المرة. أحسنتما كلاكما!',
        drawMessage: 'تعادل! أحسنتما كلاكما! 🤝'
      }
    },
    learn: {
      pageTitlePrefix: 'تعلّم',
      pageTitleStrong: 'القطع',
      clearBoard: 'امسح اللوحة',
      clear: 'مسح',
      moveSquares: 'مربعات الحركة',
      captureSquares: 'مربعات الأسر',
      possibleSquares: count => `مربعات ممكنة: ${count}`,
      practicing: piece => `تتدرب على: ${piece}`,
      emptyPick: 'اللوحة فارغة — اختر قطعة!',
      allPieces: 'كل القطع',
      allPiecesSub: 'اضغط على قطعة لتتعلم كيف تتحرك وتأسر.',
      tapToLearn: 'اضغط لتتعلم',
      sidebarNote: coachName => `اضغط على «جرّبني» وسيُظهر لك ${coachName} كل مربع مع سهم للتجربة.`,
      footer: 'نتعلّم قطعة واحدة في كل مرة ⭐',
      closeMessage: 'إغلاق الرسالة',
      voiceOnLabel: 'إيقاف صوت المدرّب',
      voiceOffLabel: 'تشغيل صوت المدرّب',
      voiceOnTitle: 'صوت المدرّب قيد التشغيل',
      voiceOffTitle: 'صوت المدرّب متوقف',
      hearAgain: 'اسمع المدرّب مرة أخرى',
      sayAgain: 'قلها مرة أخرى'
    },
    popup: {
      close: 'إغلاق النافذة',
      canMoveHere: 'يمكن التحرك هنا',
      canCaptureHere: 'يمكن الأسر هنا',
      howItMoves: 'كيف تتحرك',
      howItCaptures: 'كيف تأسر',
      tryMe: 'جرّبني! 🎮',
      gotIt: 'فهمت! 👍',
      enemyPawn: 'بيدق الخصم'
    }
  },
  fr: {
    common: {
      kidsHome: 'Accueil enfants',
      play: 'Jouer',
      learn: 'Apprendre',
      grownUps: 'Adultes',
      backToNormalHome: "Retour à l'accueil normal",
      close: 'Fermer',
      playAgain: 'Rejouer',
      backToKidsHome: "Retour à l'accueil enfants"
    },
    home: {
      kidsMode: '🌈 Mode enfants',
      heroLine1: 'Salut,',
      heroLine2: 'champion des échecs !',
      heroSub: 'Amusons-nous avec les échecs. Choisis une grande carte ci-dessous et commence à jouer !',
      playWithBuddy: 'Joue avec Copain des échecs',
      stuckHint: 'Bloqué ? Appuie sur le bouton 💡 Indice pendant ta partie.',
      playChessTitle: 'Jouer aux échecs',
      playChessText: 'Une partie amicale avec Copain des échecs. Pas de chrono, pas de stress !',
      playChessCta: 'Jouons →',
      learnPiecesTitle: 'Apprendre les pièces',
      learnPiecesText: 'Rencontre chaque pièce et découvre son déplacement spécial.',
      learnPiecesCta: 'Montre-moi →',
      funPuzzlesTitle: 'Puzzles amusants',
      funPuzzlesText: 'Trouve le meilleur coup et deviens une star des puzzles !',
      funPuzzlesCta: 'Essaie-en un →',
      meetPiecesTitle: 'Rencontre les pièces 👋',
      meetPiecesSub: 'Chaque pièce se déplace et capture à sa façon. Touche une pièce pour voir comment !',
      tapToLearn: 'Touche pour apprendre →',
      howToPlayTitle: 'Comment jouer en 3 étapes',
      step1: 'Touche une de tes pièces.',
      step2: 'Touche un point lumineux pour bouger.',
      step3: 'Piège le roi pour gagner !',
      startPlaying: 'Commencer à jouer',
      footer: 'Fait pour les jeunes joueurs curieux 💛'
    },
    game: {
      titlePrefix: 'Joue avec',
      buddyName: 'Copain des échecs',
      soundOff: 'Couper les sons',
      soundOn: 'Activer les sons',
      check: 'Échec ! Protège ton roi !',
      you: 'Toi',
      white: 'Blancs',
      black: 'Noirs',
      playAs: 'Ton camp',
      difficulty: 'Niveau',
      levelEasy: 'Facile',
      levelMedium: 'Moyen',
      levelHard: 'Difficile',
      yourTurn: 'À toi ! 🌟',
      newGame: 'Nouvelle partie',
      undo: 'Annuler',
      hint: 'Indice',
      tipsTitle: 'Les conseils de Copain des échecs',
      tipTapTitle: 'Touche une pièce',
      tipTapText: 'Puis touche un point lumineux pour la déplacer.',
      tipHelpTitle: "Besoin d'aide ?",
      tipHelpText: 'Appuie sur le bouton Indice et je te montrerai un bon coup.',
      tipWinTitle: 'Gagne la partie',
      tipWinText: "Piège l'autre roi pour qu'il ne puisse pas s'échapper. C'est le mat !",
      noTimer: "Il n'y a pas de chrono. Prends ton temps et amuse-toi !",
      buddy: {
        welcome: 'Salut ! Je suis Copain des échecs. Jouons ! 🌟',
        newGame: 'Une nouvelle partie ! Bonne chance ! 🌈',
        thinking: 'Hmm... laisse-moi réfléchir ! 🤔',
        checkPraise: 'Waouh, échec ! Tu te débrouilles très bien ! 🎉',
        capturePraise: 'Belle capture ! Tu as pris une pièce ! 🎯',
        praise: [
          'Beau coup ! 🌟',
          'Bravo ! 👏',
          'Tu te débrouilles très bien ! 💪',
          'Waouh, quel coup ! ✨',
          'Continue comme ça, champion ! 🏆',
          "C'était malin ! 🧠"
        ],
        buddyCheck: "Attention ! Ton roi est en échec. Peux-tu le mettre à l'abri ? 🛡️",
        buddyCapture: "J'ai pris une de tes pièces. À toi ! 🙂",
        yourTurn: 'À toi ! Tu peux le faire ! 💪',
        hint: 'Essaie de bouger la pièce que je montre ! 💡',
        undo: 'Pas de problème ! Réessayons. 💪'
      },
      results: {
        winTitle: 'Tu gagnes ! Génial !',
        winText: "Tu as piégé l'autre roi. Copain des échecs est très fier de toi !",
        winMessage: 'WAOUH ! Tu as gagné ! Tu es une star des échecs ! 🌟',
        lossTitle: 'Belle partie !',
        lossText: 'Copain des échecs a gagné cette fois, mais tu as joué courageusement. Réessaie !',
        lossMessage: 'Belle partie ! Tu veux rejouer ? 🌈',
        drawTitle: 'Match nul !',
        drawText: "Personne n'a gagné cette fois. Vous avez tous les deux bien joué !",
        drawMessage: 'Match nul ! Vous avez tous les deux bien joué ! 🤝'
      }
    },
    learn: {
      pageTitlePrefix: 'Apprends les',
      pageTitleStrong: 'pièces',
      clearBoard: "Vider l'échiquier",
      clear: 'Vider',
      moveSquares: 'Cases de déplacement',
      captureSquares: 'Cases de capture',
      possibleSquares: count =>
        `${count} case${count === 1 ? '' : 's'} possible${count === 1 ? '' : 's'}`,
      practicing: piece => `Entraînement : ${piece}`,
      emptyPick: "L'échiquier est vide — choisis une pièce !",
      allPieces: 'Toutes les pièces',
      allPiecesSub: 'Touche une pièce pour apprendre comment elle se déplace et capture.',
      tapToLearn: 'Touche pour apprendre',
      sidebarNote: coachName =>
        `Appuie sur « Essaie-moi » et ${coachName} montrera chaque case et une flèche à suivre.`,
      footer: 'Une pièce à la fois ⭐',
      closeMessage: 'Fermer le message',
      voiceOnLabel: 'Couper la voix du professeur',
      voiceOffLabel: 'Activer la voix du professeur',
      voiceOnTitle: 'La voix du professeur est activée',
      voiceOffTitle: 'La voix du professeur est coupée',
      hearAgain: 'Réécouter le professeur',
      sayAgain: 'Redis-le'
    },
    popup: {
      close: 'Fermer la fenêtre',
      canMoveHere: 'Peut aller ici',
      canCaptureHere: 'Peut capturer ici',
      howItMoves: 'Comment elle se déplace',
      howItCaptures: 'Comment elle capture',
      tryMe: 'Essaie-moi ! 🎮',
      gotIt: 'Compris ! 👍',
      enemyPawn: 'Pion ennemi'
    }
  },
  es: {
    common: {
      kidsHome: 'Inicio niños',
      play: 'Jugar',
      learn: 'Aprender',
      grownUps: 'Adultos',
      backToNormalHome: 'Volver al inicio normal',
      close: 'Cerrar',
      playAgain: 'Jugar de nuevo',
      backToKidsHome: 'Volver al inicio niños'
    },
    home: {
      kidsMode: '🌈 Modo niños',
      heroLine1: '¡Hola!',
      heroLine2: '¡campeón del ajedrez!',
      heroSub: 'Divirtámonos con el ajedrez. ¡Elige una tarjeta grande abajo y empieza a jugar!',
      playWithBuddy: 'Juega con Amigo del ajedrez',
      stuckHint: '¿Atascado? Pulsa el botón 💡 Pista durante tu partida.',
      playChessTitle: 'Jugar al ajedrez',
      playChessText: 'Una partida amistosa con Amigo del ajedrez. ¡Sin reloj y sin prisa!',
      playChessCta: '¡A jugar! →',
      learnPiecesTitle: 'Aprende las piezas',
      learnPiecesText: 'Conoce cada pieza y aprende su movimiento especial.',
      learnPiecesCta: 'Muéstrame →',
      funPuzzlesTitle: 'Puzles divertidos',
      funPuzzlesText: '¡Encuentra la mejor jugada y conviértete en estrella de los puzles!',
      funPuzzlesCta: 'Prueba uno →',
      meetPiecesTitle: 'Conoce las piezas 👋',
      meetPiecesSub: 'Cada pieza se mueve y captura a su manera. ¡Toca una pieza para ver cómo!',
      tapToLearn: 'Toca para aprender →',
      howToPlayTitle: 'Cómo jugar en 3 pasos',
      step1: 'Toca una de tus piezas.',
      step2: 'Toca un punto brillante para mover.',
      step3: '¡Atrapa al rey para ganar!',
      startPlaying: 'Empezar a jugar',
      footer: 'Hecho para jóvenes jugadores curiosos 💛'
    },
    game: {
      titlePrefix: 'Juega con',
      buddyName: 'Amigo del ajedrez',
      soundOff: 'Silenciar sonidos',
      soundOn: 'Activar sonidos',
      check: '¡Jaque! ¡Mantén seguro a tu rey!',
      you: 'Tú',
      white: 'Blancas',
      black: 'Negras',
      playAs: 'Tu color',
      difficulty: 'Nivel',
      levelEasy: 'Fácil',
      levelMedium: 'Medio',
      levelHard: 'Difícil',
      yourTurn: '¡Tu turno! 🌟',
      newGame: 'Nueva partida',
      undo: 'Deshacer',
      hint: 'Pista',
      tipsTitle: 'Consejos de Amigo del ajedrez',
      tipTapTitle: 'Toca una pieza',
      tipTapText: 'Luego toca un punto brillante para moverla.',
      tipHelpTitle: '¿Necesitas ayuda?',
      tipHelpText: 'Pulsa el botón Pista y te señalaré una buena jugada.',
      tipWinTitle: 'Gana la partida',
      tipWinText: 'Atrapa al otro rey para que no pueda escapar. ¡Eso es jaque mate!',
      noTimer: 'No hay reloj. ¡Tómate tu tiempo y diviértete!',
      buddy: {
        welcome: '¡Hola! Soy Amigo del ajedrez. ¡Vamos a jugar! 🌟',
        newGame: '¡Una nueva partida! ¡Buena suerte! 🌈',
        thinking: 'Mmm... ¡déjame pensar! 🤔',
        checkPraise: '¡Vaya, jaque! ¡Lo estás haciendo genial! 🎉',
        capturePraise: '¡Buena captura! ¡Te llevaste una pieza! 🎯',
        praise: [
          '¡Buen movimiento! 🌟',
          '¡Buen trabajo! 👏',
          '¡Lo estás haciendo genial! 💪',
          '¡Vaya, qué jugada! ✨',
          '¡Sigue así, campeón! 🏆',
          '¡Eso fue inteligente! 🧠'
        ],
        buddyCheck: '¡Cuidado! Tu rey está en jaque. ¿Puedes moverlo a un lugar seguro? 🛡️',
        buddyCapture: 'Me llevé una de tus piezas. ¡Tu turno! 🙂',
        yourTurn: '¡Tu turno! ¡Puedes hacerlo! 💪',
        hint: '¡Intenta mover la pieza que estoy señalando! 💡',
        undo: '¡No hay problema! Intentémoslo otra vez. 💪'
      },
      results: {
        winTitle: '¡Ganas! ¡Increíble!',
        winText: 'Atrapaste al otro rey. ¡Amigo del ajedrez está muy orgulloso de ti!',
        winMessage: '¡GUAU! ¡Ganaste! ¡Eres una estrella del ajedrez! 🌟',
        lossTitle: '¡Buen juego!',
        lossText: 'Amigo del ajedrez ganó esta vez, pero jugaste con valentía. ¡Inténtalo otra vez!',
        lossMessage: '¡Gran partida! ¿Quieres jugar otra vez? 🌈',
        drawTitle: '¡Es un empate!',
        drawText: 'Nadie ganó esta vez. ¡Ambos lo hicisteis genial!',
        drawMessage: '¡Empate! ¡Ambos lo hicisteis genial! 🤝'
      }
    },
    learn: {
      pageTitlePrefix: 'Aprende las',
      pageTitleStrong: 'piezas',
      clearBoard: 'Vaciar tablero',
      clear: 'Vaciar',
      moveSquares: 'Casillas de movimiento',
      captureSquares: 'Casillas de captura',
      possibleSquares: count =>
        `${count} casilla${count === 1 ? '' : 's'} posible${count === 1 ? '' : 's'}`,
      practicing: piece => `Practicando: ${piece}`,
      emptyPick: '¡El tablero está vacío! ¡Elige una pieza!',
      allPieces: 'Todas las piezas',
      allPiecesSub: 'Toca una pieza para aprender cómo se mueve y captura.',
      tapToLearn: 'Toca para aprender',
      sidebarNote: coachName =>
        `Pulsa «¡Pruébame!» y ${coachName} mostrará cada casilla y una flecha para probar.`,
      footer: 'Aprendiendo una pieza a la vez ⭐',
      closeMessage: 'Cerrar mensaje',
      voiceOnLabel: 'Silenciar la voz del profesor',
      voiceOffLabel: 'Activar la voz del profesor',
      voiceOnTitle: 'La voz del profesor está activada',
      voiceOffTitle: 'La voz del profesor está desactivada',
      hearAgain: 'Escuchar al profesor otra vez',
      sayAgain: 'Dilo otra vez'
    },
    popup: {
      close: 'Cerrar ventana',
      canMoveHere: 'Puede moverse aquí',
      canCaptureHere: 'Puede capturar aquí',
      howItMoves: 'Cómo se mueve',
      howItCaptures: 'Cómo captura',
      tryMe: '¡Pruébame! 🎮',
      gotIt: '¡Entendido! 👍',
      enemyPawn: 'Peón enemigo'
    }
  }
};

export const KIDS_PIECE_COPY: Record<InstructorLanguageCode, Record<KidPieceName, PieceCopy>> = {
  en: {
    Pawn: {
      label: 'Pawn',
      sentenceName: 'pawn',
      tip: 'The little hero of the chess board.',
      moveText:
        'Steps forward one square. On its very first move, it can take a big two-square step.',
      captureText: 'Captures one square diagonally in front of it — never straight ahead.'
    },
    Knight: {
      label: 'Knight',
      sentenceName: 'knight',
      tip: 'The only piece that can jump over others!',
      moveText: 'Jumps in an L shape: two squares one way, then one square to the side.',
      captureText: 'Captures whatever it lands on — even if pieces are in the way.'
    },
    Bishop: {
      label: 'Bishop',
      sentenceName: 'bishop',
      tip: 'A sliding piece that loves diagonals.',
      moveText: 'Slides diagonally as far as the board lets it go.',
      captureText: 'Captures an enemy piece anywhere along its diagonal path.'
    },
    Rook: {
      label: 'Rook',
      sentenceName: 'rook',
      tip: 'A castle tower that guards straight lines.',
      moveText: 'Slides in straight lines: up, down, left, or right.',
      captureText: 'Captures along its row or column. It cannot jump over pieces.'
    },
    Queen: {
      label: 'Queen',
      sentenceName: 'queen',
      tip: 'The most powerful piece on the board!',
      moveText: 'Slides straight or diagonally — as far as she likes.',
      captureText: 'Captures in any direction along a straight line of squares.'
    },
    King: {
      label: 'King',
      sentenceName: 'king',
      tip: 'The most important piece — keep him safe!',
      moveText: 'Moves just one square in any direction.',
      captureText: 'Captures one square away, but never move into check!'
    }
  },
  ar: {
    Pawn: {
      label: 'البيدق',
      sentenceName: 'البيدق',
      tip: 'البطل الصغير في رقعة الشطرنج.',
      moveText: 'يتقدم خطوة واحدة إلى الأمام. في حركته الأولى فقط، يمكنه التقدم خطوتين.',
      captureText: 'يأسر مربعاً واحداً قطرياً أمامه — وليس للأمام مباشرة.'
    },
    Knight: {
      label: 'الحصان',
      sentenceName: 'الحصان',
      tip: 'القطعة الوحيدة التي يمكنها القفز فوق القطع الأخرى!',
      moveText: 'يقفز بشكل حرف L: مربعان في اتجاه ثم مربع إلى الجانب.',
      captureText: 'يأسر أي قطعة يهبط عليها — حتى لو كانت هناك قطع في الطريق.'
    },
    Bishop: {
      label: 'الفيل',
      sentenceName: 'الفيل',
      tip: 'قطعة منزلقة تحب الأقطار.',
      moveText: 'ينزلق قطرياً حتى أقصى ما تسمح به اللوحة.',
      captureText: 'يأسر قطعة خصم في أي مكان على مساره القطري.'
    },
    Rook: {
      label: 'الرخ',
      sentenceName: 'الرخ',
      tip: 'برج القلعة الذي يحرس الخطوط المستقيمة.',
      moveText: 'ينزلق في خطوط مستقيمة: أعلى، أسفل، يسار أو يمين.',
      captureText: 'يأسر على طول صفه أو عموده. لا يمكنه القفز فوق القطع.'
    },
    Queen: {
      label: 'الملكة',
      sentenceName: 'الملكة',
      tip: 'أقوى قطعة على اللوحة!',
      moveText: 'تنزلق بشكل مستقيم أو قطري — حتى أقصى ما تريد.',
      captureText: 'تأسر في أي اتجاه على طول خط مستقيم من المربعات.'
    },
    King: {
      label: 'الملك',
      sentenceName: 'الملك',
      tip: 'أهم قطعة — حافظ على أمانه!',
      moveText: 'يتحرك مربعاً واحداً فقط في أي اتجاه.',
      captureText: 'يأسر على مسافة مربع واحد، لكن لا تتحرك أبداً إلى كش!'
    }
  },
  fr: {
    Pawn: {
      label: 'Pion',
      sentenceName: 'le pion',
      tip: "Le petit héros de l'échiquier.",
      moveText: "Avance d'une case. À son tout premier coup, il peut avancer de deux cases.",
      captureText: 'Capture une case en diagonale devant lui — jamais tout droit.'
    },
    Knight: {
      label: 'Cavalier',
      sentenceName: 'le cavalier',
      tip: 'La seule pièce qui peut sauter par-dessus les autres !',
      moveText: 'Saute en forme de L : deux cases dans un sens, puis une case sur le côté.',
      captureText: 'Capture la pièce sur laquelle il atterrit — même si des pièces gênent le passage.'
    },
    Bishop: {
      label: 'Fou',
      sentenceName: 'le fou',
      tip: 'Une pièce qui glisse et adore les diagonales.',
      moveText: "Glisse en diagonale aussi loin que l'échiquier le permet.",
      captureText: "Capture une pièce ennemie n'importe où sur sa diagonale."
    },
    Rook: {
      label: 'Tour',
      sentenceName: 'la tour',
      tip: 'Une tour de château qui garde les lignes droites.',
      moveText: 'Glisse en ligne droite : haut, bas, gauche ou droite.',
      captureText: 'Capture sur sa ligne ou sa colonne. Il ne peut pas sauter par-dessus les pièces.'
    },
    Queen: {
      label: 'Dame',
      sentenceName: 'la dame',
      tip: "La pièce la plus puissante de l'échiquier !",
      moveText: "Glisse tout droit ou en diagonale — aussi loin qu'elle veut.",
      captureText: "Capture dans n'importe quelle direction le long d'une ligne droite."
    },
    King: {
      label: 'Roi',
      sentenceName: 'le roi',
      tip: 'La pièce la plus importante — protège-le !',
      moveText: "Se déplace d'une seule case dans n'importe quelle direction.",
      captureText: "Capture à une case de distance, mais ne va jamais en échec !"
    }
  },
  es: {
    Pawn: {
      label: 'Peón',
      sentenceName: 'el peón',
      tip: 'El pequeño héroe del tablero.',
      moveText: 'Avanza una casilla. En su primer movimiento, puede avanzar dos casillas.',
      captureText: 'Captura una casilla en diagonal delante de él, nunca hacia adelante.'
    },
    Knight: {
      label: 'Caballo',
      sentenceName: 'el caballo',
      tip: '¡La única pieza que puede saltar sobre las demás!',
      moveText: 'Salta en forma de L: dos casillas en una dirección y una hacia un lado.',
      captureText: 'Captura lo que haya en la casilla donde aterriza, aunque haya piezas en el camino.'
    },
    Bishop: {
      label: 'Alfil',
      sentenceName: 'el alfil',
      tip: 'Una pieza deslizante que adora las diagonales.',
      moveText: 'Se desliza en diagonal tan lejos como el tablero se lo permite.',
      captureText: 'Captura una pieza enemiga en cualquier punto de su diagonal.'
    },
    Rook: {
      label: 'Torre',
      sentenceName: 'la torre',
      tip: 'Una torre de castillo que protege las líneas rectas.',
      moveText: 'Se desliza en línea recta: arriba, abajo, izquierda o derecha.',
      captureText: 'Captura a lo largo de su fila o columna. No puede saltar sobre las piezas.'
    },
    Queen: {
      label: 'Dama',
      sentenceName: 'la dama',
      tip: '¡La pieza más poderosa del tablero!',
      moveText: 'Se desliza recto o en diagonal, tan lejos como quiere.',
      captureText: 'Captura en cualquier dirección a lo largo de una línea recta de casillas.'
    },
    King: {
      label: 'Rey',
      sentenceName: 'el rey',
      tip: 'La pieza más importante: ¡mantenlo a salvo!',
      moveText: 'Se mueve solo una casilla en cualquier dirección.',
      captureText: 'Captura a una casilla de distancia, ¡pero nunca te muevas a jaque!'
    }
  }
};

export function isInstructorLanguageCode(value: string | null | undefined): value is InstructorLanguageCode {
  return !!value && Object.prototype.hasOwnProperty.call(INSTRUCTOR_COPY, value);
}

export function loadInstructorLanguage(): InstructorLanguageCode {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = window.localStorage.getItem(INSTRUCTOR_LANGUAGE_STORAGE_KEY);
    if (isInstructorLanguageCode(stored)) return stored;
  } catch (_) {}
  return 'en';
}

export function saveInstructorLanguage(code: InstructorLanguageCode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(INSTRUCTOR_LANGUAGE_STORAGE_KEY, code);
  } catch (_) {}
}
